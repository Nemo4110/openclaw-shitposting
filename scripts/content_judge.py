"""
弱智度评分算法
基于多维度评估 Reddit 内容的"弱智/搞笑/脑残"程度
"""

import json
import re
import hashlib
from dataclasses import dataclass
from typing import List, Optional, Dict
from datetime import datetime, timezone
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from logger import setup_logger

logger = setup_logger(__name__)


@dataclass
class JudgeResult:
    """评分结果"""
    post_id: str
    title_score: float      # 标题关键词得分 (0-3)
    engagement_score: float # 互动特征得分 (0-3)
    logic_score: float      # 逻辑悖论得分 (0-4)
    total_score: float      # 总分 (0-10)
    is_shitpost: bool       # 是否判定为弱智内容
    reasons: List[str]      # 评分理由


class ContentJudge:
    """内容弱智度评判器"""
    
    def __init__(self, filters_config: Dict, judge_config: Dict):
        """
        初始化评判器
        
        Args:
            filters_config: filters.json 的配置
            judge_config: config.json 中的 judge 部分
        """
        self.filters = filters_config
        self.judge_config = judge_config
        self.min_score = judge_config.get('min_shitpost_score', 6.0)
        self.use_llm = judge_config.get('use_llm', False)
        
        # 编译关键词正则
        self.en_keywords = [kw.lower() for kw in filters_config.get('shitpost_keywords', {}).get('en', [])]
        self.zh_keywords = filters_config.get('shitpost_keywords', {}).get('zh', [])
        self.blacklist = [kw.lower() for kw in filters_config.get('blacklist_keywords', [])]
    
    def judge(self, post) -> JudgeResult:
        """
        对单个帖子进行弱智度评分
        
        Returns:
            JudgeResult 评分结果
        """
        reasons = []
        
        # 1. 黑名单检查
        combined_text = f"{post.title} {post.content}".lower()
        for black_kw in self.blacklist:
            if black_kw in combined_text:
                return JudgeResult(
                    post_id=post.short_id,
                    title_score=0,
                    engagement_score=0,
                    logic_score=0,
                    total_score=0,
                    is_shitpost=False,
                    reasons=[f"Blacklisted keyword: {black_kw}"]
                )
        
        # 2. 标题关键词评分 (0-3分)
        title_score = self._calculate_title_score(post.title)
        if title_score > 0:
            reasons.append(f"Title keyword score: {title_score:.1f}")
        
        # 3. 互动特征评分 (0-3分)
        engagement_score = self._calculate_engagement_score(post)
        if engagement_score > 0:
            reasons.append(f"Engagement score: {engagement_score:.1f}")
        
        # 4. 逻辑悖论评分 (0-4分) - 简化版，不使用 LLM
        logic_score = self._calculate_logic_score(post)
        if logic_score > 0:
            reasons.append(f"Logic paradox score: {logic_score:.1f}")
        
        # 计算总分
        total_score = title_score + engagement_score + logic_score
        is_shitpost = total_score >= self.min_score
        
        # 添加通过/失败理由
        if is_shitpost:
            reasons.append(f"PASS: shitpost score {total_score:.1f} >= {self.min_score}")
        else:
            reasons.append(f"FAIL: shitpost score {total_score:.1f} < {self.min_score}")
        
        return JudgeResult(
            post_id=post.short_id,
            title_score=title_score,
            engagement_score=engagement_score,
            logic_score=logic_score,
            total_score=total_score,
            is_shitpost=is_shitpost,
            reasons=reasons
        )
    
    def judge_batch(self, posts: List) -> List[JudgeResult]:
        """批量评分"""
        results = []
        for post in posts:
            result = self.judge(post)
            results.append(result)
        return results
    
    def filter_shitposts(self, posts: List, results: List[JudgeResult]) -> List:
        """根据评分结果过滤出弱智内容"""
        shitposts = []
        for post, result in zip(posts, results):
            if result.is_shitpost:
                shitposts.append((post, result))
        
        # 按分数排序
        shitposts.sort(key=lambda x: x[1].total_score, reverse=True)
        
        # 限制数量
        max_posts = self.judge_config.get('max_posts_per_run', 5)
        return shitposts[:max_posts]
    
    def _calculate_title_score(self, title: str) -> float:
        """基于标题关键词计算分数 (0-3分)"""
        score = 0.0
        title_lower = title.lower()
        
        # 英文关键词匹配
        for kw in self.en_keywords:
            if kw in title_lower:
                score += 0.5
        
        # 中文关键词匹配
        for kw in self.zh_keywords:
            if kw in title:
                score += 0.5
        
        # 标点符号特征（多个问号/感叹号通常表示弱智/夸张）
        q_count = title.count('?') + title.count('？')
        ex_count = title.count('!') + title.count('！')
        if q_count >= 2 or ex_count >= 2 or (q_count + ex_count) >= 3:
            score += 1.0
        
        # 全大写（通常表示情绪化/夸张）
        alpha_chars = [c for c in title if c.isalpha()]
        if alpha_chars and sum(1 for c in alpha_chars if c.isupper()) / len(alpha_chars) > 0.7:
            score += 0.5
        
        return min(score, 3.0)
    
    def _calculate_engagement_score(self, post) -> float:
        """基于互动特征计算分数 (0-3分)"""
        score = 0.0
        
        # 高评论数 + 中等点赞 = 争议性/讨论度高的内容
        if post.comment_count > 100 and post.upvotes < 5000:
            score += 1.0
        elif post.comment_count > 50:
            score += 0.5
        
        # 低赞踩比 + 高互动 = 有争议的内容
        if post.upvote_ratio < 0.7 and post.comment_count > 30:
            score += 1.5
        elif post.upvote_ratio < 0.8 and post.comment_count > 20:
            score += 0.5
        
        # 评论/点赞比高 = 引发讨论的内容
        if post.upvotes > 0:
            ratio = post.comment_count / post.upvotes
            if ratio > 0.1:  # 每10个点赞就有1条评论
                score += 1.0
            elif ratio > 0.05:
                score += 0.5
        
        return min(score, 3.0)
    
    def _calculate_logic_score(self, post) -> float:
        """
        基于内容逻辑悖论计算分数 (0-4分)
        简化版规则判断，不使用 LLM
        """
        score = 0.0
        content = f"{post.title} {post.content}".lower()
        
        # 自相矛盾的表达
        contradictions = [
            ("not", "but"),
            ("no", "yes"),
            ("can't", "did"),
            ("不会", "会"),
            ("不是", "是"),
            ("没有", "有"),
        ]
        for a, b in contradictions:
            if a in content and b in content:
                score += 0.5
        
        # 荒谬的夸张表达
        absurd_patterns = [
            r'\d{3,}%',  # 超过100%的百分比
            r'never\s+\w+\s+again',
            r'always\s+\w+',
            r'每个人|everyone|everybody',
            r'没有人|nobody|no one',
            r'永远|forever|always',
        ]
        for pattern in absurd_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                score += 0.5
        
        # 特定 subreddit 加分（这些版块本身就是弱智内容聚集地）
        shitpost_subs = ['shitposting', 'okbuddyretard', 'terriblefacebookmemes', 'comedyheaven']
        if any(sub in post.subreddit.lower() for sub in shitpost_subs):
            score += 1.0
        
        # "Nobody: / Me:" 格式（经典的弱智meme格式）
        if re.search(r'no(body| one):', content, re.IGNORECASE) or '没有人：' in content:
            score += 1.0
        
        return min(score, 4.0)


class HistoryManager:
    """已推送内容管理器"""
    
    def __init__(self, history_file: str, max_history: int = 1000):
        self.history_file = history_file
        self.max_history = max_history
        self.posted_ids = self._load_history()
    
    def _load_history(self) -> set:
        """加载已推送记录"""
        if not os.path.exists(self.history_file):
            return set()
        try:
            with open(self.history_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return set(data.get('posted_ids', []))
        except Exception as e:
            logger.error(f"Failed to load history: {e}")
            return set()
    
    def save_history(self):
        """保存已推送记录"""
        os.makedirs(os.path.dirname(self.history_file), exist_ok=True)
        with open(self.history_file, 'w', encoding='utf-8') as f:
            json.dump({
                'posted_ids': list(self.posted_ids)[-self.max_history:],
                'updated_at': datetime.now(timezone.utc).isoformat()
            }, f, ensure_ascii=False, indent=2)
    
    def is_posted(self, post_id: str) -> bool:
        """检查是否已推送"""
        return post_id in self.posted_ids
    
    def mark_posted(self, post_id: str):
        """标记为已推送"""
        self.posted_ids.add(post_id)
    
    def filter_new_posts(self, posts: List) -> List:
        """过滤出未推送过的帖子"""
        new_posts = [p for p in posts if not self.is_posted(p.short_id)]
        logger.info(f"Filtered new posts: {len(new_posts)}/{len(posts)}")
        return new_posts


if __name__ == "__main__":
    # 测试
    import sys
    
    # 模拟数据
    class MockPost:
        def __init__(self, title, subreddit, upvotes=100, comments=20, ratio=0.85, content=""):
            self.id = hashlib.md5(title.encode()).hexdigest()[:8]
            self.title = title
            self.content = content
            self.subreddit = subreddit
            self.upvotes = upvotes
            self.comment_count = comments
            self.upvote_ratio = ratio
        
        @property
        def short_id(self):
            return f"test_{self.id}"
    
    # 加载配置
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'filters.json')
    with open(config_path, 'r', encoding='utf-8') as f:
        filters = json.load(f)
    
    judge_config = {'min_shitpost_score': 6.0, 'max_posts_per_run': 5, 'use_llm': False}
    
    judge = ContentJudge(filters, judge_config)
    
    # 测试用例
    test_posts = [
        MockPost("Bruh what is this???", "shitposting", upvotes=5000, comments=200, ratio=0.65),
        MockPost("Nobody: Me: eating pizza at 3am", "okbuddyretard", upvotes=800, comments=50),
        MockPost("A normal news article", "news", upvotes=100, comments=10, ratio=0.95),
        MockPost("永远看不懂这个逻辑...", "shitposting", upvotes=300, comments=80, ratio=0.75),
    ]
    
    for post in test_posts:
        result = judge.judge(post)
        status = "PASS" if result.is_shitpost else "FAIL"
        logger.info(f"[{post.subreddit}] {post.title}")
        logger.info(f"  Score: {result.total_score:.1f} | {status}")
        logger.info(f"  Reasons: {', '.join(result.reasons)}")
