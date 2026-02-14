"""
Telegram 推送模块
将筛选后的弱智内容推送到 Telegram 群
"""

import asyncio
import logging
from typing import List, Tuple, Optional
from dataclasses import dataclass
from telegram import Bot
from telegram.constants import ParseMode
import aiohttp

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class PushResult:
    """推送结果"""
    success: bool
    message_id: Optional[int]
    error: Optional[str]


class TelegramPusher:
    """Telegram 消息推送器"""
    
    def __init__(self, bot_token: str, chat_id: str, parse_mode: str = "HTML"):
        """
        初始化 Telegram Bot
        
        Args:
            bot_token: BotFather 提供的 Token
            chat_id: 目标群/频道的 ID
            parse_mode: 解析模式 HTML/Markdown/MarkdownV2
        """
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.parse_mode = parse_mode
        self.bot = Bot(token=bot_token)
        logger.info(f"Telegram Bot 初始化完成，目标 Chat: {chat_id}")
    
    async def push_post(
        self,
        title: str,
        url: str,
        subreddit: str,
        score: float,
        upvotes: int,
        comments: int,
        media_url: Optional[str] = None,
        content: Optional[str] = None,
        disable_notification: bool = False
    ) -> PushResult:
        """
        推送单个帖子到 Telegram
        
        Args:
            title: 帖子标题
            url: Reddit 原链接
            subreddit: 来源版块
            score: 弱智度评分
            upvotes: 点赞数
            comments: 评论数
            media_url: 媒体文件 URL（图片/视频）
            content: 文本内容
            disable_notification: 是否静默发送
        
        Returns:
            PushResult 推送结果
        """
        # 构造消息文本
        caption = self._format_message(
            title=title,
            url=url,
            subreddit=subreddit,
            score=score,
            upvotes=upvotes,
            comments=comments,
            content=content
        )
        
        try:
            # 如果有媒体文件，优先发送媒体
            if media_url:
                return await self._send_media(
                    media_url=media_url,
                    caption=caption,
                    disable_notification=disable_notification
                )
            else:
                # 纯文本消息
                message = await self.bot.send_message(
                    chat_id=self.chat_id,
                    text=caption,
                    parse_mode=ParseMode.HTML if self.parse_mode == "HTML" else self.parse_mode,
                    disable_notification=disable_notification,
                    disable_web_page_preview=False
                )
                return PushResult(success=True, message_id=message.message_id, error=None)
                
        except Exception as e:
            logger.error(f"推送失败: {e}")
            return PushResult(success=False, message_id=None, error=str(e))
    
    async def push_posts(
        self,
        posts_with_scores: List[Tuple],
        header: Optional[str] = None,
        disable_notification: bool = False
    ) -> List[PushResult]:
        """
        批量推送帖子
        
        Args:
            posts_with_scores: [(post, judge_result), ...] 的列表
            header: 批次头部消息（如"🚽 今日弱智内容精选"）
            disable_notification: 是否静默发送
        
        Returns:
            PushResult 列表
        """
        results = []
        
        # 发送头部消息
        if header:
            try:
                await self.bot.send_message(
                    chat_id=self.chat_id,
                    text=header,
                    parse_mode=ParseMode.HTML,
                    disable_notification=disable_notification
                )
            except Exception as e:
                logger.error(f"发送头部消息失败: {e}")
        
        # 逐个推送
        for post, judge_result in posts_with_scores:
            result = await self.push_post(
                title=post.title,
                url=post.full_url,
                subreddit=post.subreddit,
                score=judge_result.total_score,
                upvotes=post.upvotes,
                comments=post.comment_count,
                media_url=post.media_url,
                content=post.content if post.content not in ['[图片]', '[视频]', '[图片集合]'] else None,
                disable_notification=disable_notification
            )
            results.append(result)
            
            # 避免触发限流
            await asyncio.sleep(1)
        
        return results
    
    def _format_message(
        self,
        title: str,
        url: str,
        subreddit: str,
        score: float,
        upvotes: int,
        comments: int,
        content: Optional[str] = None
    ) -> str:
        """格式化消息内容"""
        # 弱智度表情
        if score >= 9:
            score_emoji = "🤯"
        elif score >= 8:
            score_emoji = "🚽"
        elif score >= 7:
            score_emoji = "💩"
        else:
            score_emoji = "😐"
        
        # 转义 HTML 特殊字符
        title_escaped = title.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        if content:
            content_escaped = content[:200].replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            if len(content) > 200:
                content_escaped += "..."
        
        message = f"""{score_emoji} <b>{title_escaped}</b>

📊 弱智度: <code>{score:.1f}/10</code>
👍 {upvotes} | 💬 {comments}
📌 r/{subreddit}
"""
        
        if content and content not in ['[图片]', '[视频]', '[图片集合]']:
            message += f"\n📝 {content_escaped}\n"
        
        message += f"\n🔗 <a href=\"{url}\">查看原帖</a>"
        
        return message
    
    async def _send_media(
        self,
        media_url: str,
        caption: str,
        disable_notification: bool = False
    ) -> PushResult:
        """发送媒体消息"""
        try:
            # 判断媒体类型
            is_video = any(ext in media_url.lower() for ext in ['.mp4', '.gif', '.webm', '.mov'])
            
            if is_video:
                # 发送视频/动画
                message = await self.bot.send_video(
                    chat_id=self.chat_id,
                    video=media_url,
                    caption=caption,
                    parse_mode=ParseMode.HTML if self.parse_mode == "HTML" else self.parse_mode,
                    disable_notification=disable_notification
                )
            else:
                # 发送图片
                message = await self.bot.send_photo(
                    chat_id=self.chat_id,
                    photo=media_url,
                    caption=caption,
                    parse_mode=ParseMode.HTML if self.parse_mode == "HTML" else self.parse_mode,
                    disable_notification=disable_notification
                )
            
            return PushResult(success=True, message_id=message.message_id, error=None)
            
        except Exception as e:
            # 媒体发送失败，降级为文本
            logger.warning(f"媒体发送失败，降级为文本: {e}")
            try:
                message = await self.bot.send_message(
                    chat_id=self.chat_id,
                    text=caption + f"\n\n📎 媒体: {media_url}",
                    parse_mode=ParseMode.HTML if self.parse_mode == "HTML" else self.parse_mode,
                    disable_notification=disable_notification
                )
                return PushResult(success=True, message_id=message.message_id, error=None)
            except Exception as e2:
                return PushResult(success=False, message_id=None, error=str(e2))
    
    async def send_status_message(self, text: str) -> PushResult:
        """发送状态消息（如开始/结束通知）"""
        try:
            message = await self.bot.send_message(
                chat_id=self.chat_id,
                text=text,
                parse_mode=ParseMode.HTML,
                disable_notification=True
            )
            return PushResult(success=True, message_id=message.message_id, error=None)
        except Exception as e:
            logger.error(f"发送状态消息失败: {e}")
            return PushResult(success=False, message_id=None, error=str(e))


# 同步包装函数（方便非异步代码调用）
def push_posts_sync(
    bot_token: str,
    chat_id: str,
    posts_with_scores: List[Tuple],
    header: Optional[str] = None,
    parse_mode: str = "HTML",
    disable_notification: bool = False
) -> List[PushResult]:
    """同步方式批量推送帖子"""
    pusher = TelegramPusher(bot_token, chat_id, parse_mode)
    return asyncio.run(pusher.push_posts(posts_with_scores, header, disable_notification))


def push_post_sync(
    bot_token: str,
    chat_id: str,
    title: str,
    url: str,
    subreddit: str,
    score: float,
    upvotes: int,
    comments: int,
    media_url: Optional[str] = None,
    content: Optional[str] = None,
    parse_mode: str = "HTML",
    disable_notification: bool = False
) -> PushResult:
    """同步方式推送单个帖子"""
    pusher = TelegramPusher(bot_token, chat_id, parse_mode)
    return asyncio.run(pusher.push_post(
        title, url, subreddit, score, upvotes, comments, media_url, content, disable_notification
    ))


if __name__ == "__main__":
    # 测试
    import json
    import os
    
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'config.json')
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    tg_config = config['telegram']
    
    # 检查配置是否已填写
    if 'YOUR_' in tg_config['bot_token'] or 'YOUR_' in tg_config['chat_id']:
        print("⚠️ 请先填写 config.json 中的 Telegram 配置")
    else:
        # 发送测试消息
        result = push_post_sync(
            bot_token=tg_config['bot_token'],
            chat_id=tg_config['chat_id'],
            title="🚽 搬屎机器人测试消息",
            url="https://reddit.com/r/shitposting",
            subreddit="shitposting",
            score=9.5,
            upvotes=9999,
            comments=666,
            content="这是一条测试消息，验证 Telegram 推送功能是否正常工作。"
        )
        print(f"推送结果: {result}")
