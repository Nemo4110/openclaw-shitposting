"""
Reddit 内容抓取模块
使用 PRAW 库获取目标 subreddit 的帖子
"""

import praw
from dataclasses import dataclass
from typing import List, Optional

from logger import setup_logger

logger = setup_logger(__name__)


@dataclass
class RedditPost:
    """Reddit 帖子数据结构"""
    id: str
    title: str
    content: str  # 自文本内容或图片/视频URL
    url: str
    permalink: str
    author: str
    subreddit: str
    upvotes: int
    upvote_ratio: float
    comment_count: int
    is_video: bool
    media_url: Optional[str]
    created_utc: float
    
    @property
    def full_url(self) -> str:
        """返回完整的 Reddit URL"""
        return f"https://reddit.com{self.permalink}"
    
    @property
    def short_id(self) -> str:
        """返回短 ID 用于去重"""
        return f"reddit_{self.id}"


class RedditFetcher:
    """Reddit 内容抓取器"""
    
    def __init__(self, client_id: str, client_secret: str, user_agent: str):
        """
        初始化 Reddit API 客户端
        
        Args:
            client_id: Reddit App 的 client ID
            client_secret: Reddit App 的 client secret
            user_agent: User Agent 字符串
        """
        self.reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent=user_agent,
            check_for_async=False  # 避免异步警告
        )
        logger.info(f"Reddit API connected: {self.reddit.user.me()}")
    
    def fetch_subreddit(
        self,
        subreddit_name: str,
        sort: str = "hot",
        time_filter: str = "day",
        limit: int = 10
    ) -> List[RedditPost]:
        """
        获取指定 subreddit 的帖子
        
        Args:
            subreddit_name: Subreddit 名称（不需要 r/ 前缀）
            sort: 排序方式 - hot/top/new/rising/controversial
            time_filter: 时间筛选 - day/week/month/year/all
            limit: 获取帖子数量
        
        Returns:
            RedditPost 对象列表
        """
        subreddit = self.reddit.subreddit(subreddit_name)
        
        # 获取排序后的 submission
        if sort == "hot":
            submissions = subreddit.hot(limit=limit)
        elif sort == "top":
            submissions = subreddit.top(time_filter=time_filter, limit=limit)
        elif sort == "new":
            submissions = subreddit.new(limit=limit)
        elif sort == "rising":
            submissions = subreddit.rising(limit=limit)
        elif sort == "controversial":
            submissions = subreddit.controversial(time_filter=time_filter, limit=limit)
        else:
            submissions = subreddit.hot(limit=limit)
        
        posts = []
        for submission in submissions:
            # 跳过置顶帖和广告
            if submission.stickied:
                continue
            
            post = self._convert_submission(submission)
            posts.append(post)
        
        logger.info(f"Fetched {len(posts)} posts from r/{subreddit_name}")
        return posts
    
    def fetch_multiple(
        self,
        subreddit_list: List[str],
        sort: str = "hot",
        time_filter: str = "day",
        limit_per_sub: int = 10
    ) -> List[RedditPost]:
        """
        从多个 subreddit 获取帖子
        
        Returns:
            合并后的 RedditPost 列表（按 upvotes 排序）
        """
        all_posts = []
        for sub_name in subreddit_list:
            try:
                posts = self.fetch_subreddit(sub_name, sort, time_filter, limit_per_sub)
                all_posts.extend(posts)
            except Exception as e:
                logger.error(f"Failed to fetch r/{sub_name}: {e}")
                continue
        
        # 按点赞数排序
        all_posts.sort(key=lambda p: p.upvotes, reverse=True)
        logger.info(f"Total posts fetched: {len(all_posts)}")
        return all_posts
    
    def _convert_submission(self, submission) -> RedditPost:
        """将 PRAW Submission 转换为 RedditPost"""
        # 处理媒体内容
        media_url = None
        content = ""
        
        if submission.is_video:
            media_url = submission.media['reddit_video']['fallback_url'] if submission.media else None
            content = "[视频]"
        elif hasattr(submission, 'is_gallery') and submission.is_gallery:
            # 图库帖子
            media_items = []
            if hasattr(submission, 'media_metadata') and submission.media_metadata:
                for key, item in submission.media_metadata.items():
                    if item and 's' in item:
                        media_items.append(item['s'].get('u', ''))
            media_url = media_items[0] if media_items else None
            content = "[图片集]"
        elif submission.url and not submission.is_self:
            # 外链图片
            if any(ext in submission.url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                media_url = submission.url
                content = "[图片]"
            else:
                content = submission.url
        
        # 自文本内容
        if submission.is_self and submission.selftext:
            content = submission.selftext[:500]  # 限制长度
            if len(submission.selftext) > 500:
                content += "..."
        
        return RedditPost(
            id=submission.id,
            title=submission.title,
            content=content,
            url=submission.url,
            permalink=submission.permalink,
            author=str(submission.author) if submission.author else "[deleted]",
            subreddit=str(submission.subreddit),
            upvotes=submission.score,
            upvote_ratio=submission.upvote_ratio,
            comment_count=submission.num_comments,
            is_video=submission.is_video,
            media_url=media_url,
            created_utc=submission.created_utc
        )


if __name__ == "__main__":
    # 测试代码
    import json
    import os
    import sys
    
    # 读取配置（从项目根目录）
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'config.json')
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    reddit_config = config['reddit']
    
    # 检查配置
    if 'YOUR_' in reddit_config['client_id']:
        logger.error("Please fill in Reddit credentials in config/config.json")
        sys.exit(1)
    
    # 初始化 fetcher
    fetcher = RedditFetcher(
        client_id=reddit_config['client_id'],
        client_secret=reddit_config['client_secret'],
        user_agent=reddit_config['user_agent']
    )
    
    # 测试获取
    posts = fetcher.fetch_subreddit('shitposting', limit=5)
    for post in posts:
        logger.info(f"[{post.subreddit}] {post.title[:50]}... (upvotes: {post.upvotes})")
