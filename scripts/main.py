#!/usr/bin/env python3
"""
搬屎机器人主入口
Reddit 弱智内容自动采集与 Telegram 推送

Usage:
    python main.py [--limit N] [--min-score N] [--dry-run]

Options:
    --limit N       每个 subreddit 抓取的最大帖子数 [default: 10]
    --min-score N   弱智度最低阈值 [default: 6]
    --dry-run       测试模式，不实际推送
"""

import json
import os
import sys
import argparse
from datetime import datetime
from typing import List, Tuple

# 添加脚本目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from reddit_fetcher import RedditFetcher
from content_judge import ContentJudge, HistoryManager
from telegram_push import TelegramPusher, push_posts_sync
from logger import setup_logger

logger = setup_logger(__name__)


def load_configs() -> Tuple[dict, dict, dict]:
    """加载所有配置文件"""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    with open(os.path.join(base_dir, 'config', 'config.json'), 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    with open(os.path.join(base_dir, 'config', 'filters.json'), 'r', encoding='utf-8') as f:
        filters = json.load(f)
    
    return config, filters, config.get('storage', {})


def validate_config(config: dict) -> bool:
    """验证配置是否已填写"""
    reddit = config.get('reddit', {})
    telegram = config.get('telegram', {})
    
    errors = []
    
    if 'YOUR_' in reddit.get('client_id', ''):
        errors.append("Reddit client_id not configured")
    if 'YOUR_' in reddit.get('client_secret', ''):
        errors.append("Reddit client_secret not configured")
    if 'YOUR_' in telegram.get('bot_token', ''):
        errors.append("Telegram bot_token not configured")
    if 'YOUR_' in telegram.get('chat_id', ''):
        errors.append("Telegram chat_id not configured")
    
    if errors:
        for error in errors:
            logger.error(error)
        logger.error("Please edit config/config.json to fill in required credentials")
        return False
    
    return True


def run_curation(
    config: dict,
    filters: dict,
    storage: dict,
    limit: int = 10,
    min_score: float = 6.0,
    dry_run: bool = False
) -> int:
    """
    执行内容筛选与推送流程
    
    Returns:
        成功推送的帖子数量
    """
    separator = "=" * 50
    logger.info(separator)
    logger.info(f"Shitpost Curator Bot Started - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(separator)
    
    # 1. 初始化组件
    reddit_config = config['reddit']
    telegram_config = config['telegram']
    judge_config = config.get('judge', {})
    
    # 使用命令行参数覆盖配置
    judge_config['min_shitpost_score'] = min_score
    
    history_file = storage.get('history_file', 'data/history.json')
    if not os.path.isabs(history_file):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        history_file = os.path.join(base_dir, history_file)
    
    # 2. 抓取 Reddit 内容
    logger.info("Fetching content from Reddit...")
    try:
        fetcher = RedditFetcher(
            client_id=reddit_config['client_id'],
            client_secret=reddit_config['client_secret'],
            user_agent=reddit_config['user_agent']
        )
        
        posts = fetcher.fetch_multiple(
            subreddit_list=reddit_config.get('subreddits', ['shitposting']),
            sort=reddit_config.get('sort', 'hot'),
            time_filter=reddit_config.get('time_filter', 'day'),
            limit_per_sub=limit
        )
        logger.info(f"Fetched {len(posts)} posts total")
        
    except Exception as e:
        logger.error(f"Failed to fetch from Reddit: {e}")
        return 0
    
    # 3. 去重
    history = HistoryManager(history_file, storage.get('max_history', 1000))
    new_posts = history.filter_new_posts(posts)
    
    if not new_posts:
        logger.info("No new content to process")
        return 0
    
    # 4. 弱智度评分
    logger.info("Judging shitpost scores...")
    judge = ContentJudge(filters, judge_config)
    results = judge.judge_batch(new_posts)
    
    # 打印评分结果
    for post, result in zip(new_posts, results):
        status = "PASS" if result.is_shitpost else "FAIL"
        logger.info(f"[{post.subreddit}] {post.title[:40]}... | Score: {result.total_score:.1f} | {status}")
    
    # 5. 筛选高弱智度内容
    shitposts = judge.filter_shitposts(new_posts, results)
    
    if not shitposts:
        logger.info(f"No content with shitpost score >= {min_score} found")
        return 0
    
    logger.info(f"Selected {len(shitposts)} high-scored shitposts")
    
    # 6. 推送到 Telegram
    if dry_run:
        logger.info("DRY RUN MODE - Results will not be pushed:")
        for post, result in shitposts:
            logger.info(f"  Title: {post.title[:50]}...")
            logger.info(f"  URL: {post.full_url}")
            logger.info(f"  Score: {result.total_score:.1f}")
            logger.info(f"  Reasons: {'; '.join(result.reasons[:3])}")
        return len(shitposts)
    
    logger.info("Pushing to Telegram...")
    try:
        header = f"<b>Daily Shitpost Selection</b> ({datetime.now().strftime('%m/%d %H:%M')})\n\n"
        header += "Today's curated shitpost content:"
        
        results = push_posts_sync(
            bot_token=telegram_config['bot_token'],
            chat_id=telegram_config['chat_id'],
            posts_with_scores=shitposts,
            header=header,
            parse_mode=telegram_config.get('parse_mode', 'HTML'),
            disable_notification=telegram_config.get('disable_notification', False)
        )
        
        # 统计结果
        success_count = sum(1 for r in results if r.success)
        fail_count = len(results) - success_count
        
        logger.info(f"Push completed: {success_count} succeeded, {fail_count} failed")
        
        # 7. 记录已推送
        for post, _ in shitposts:
            history.mark_posted(post.short_id)
        history.save_history()
        
        return success_count
        
    except Exception as e:
        logger.error(f"Failed to push to Telegram: {e}")
        return 0


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='Shitpost Curator Bot - Reddit shitpost collection and Telegram push',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py                    # Run with default config
  python main.py --limit 20         # Fetch 20 posts per subreddit
  python main.py --min-score 8      # Only push content with score >= 8
  python main.py --dry-run          # Dry run mode, no actual push
        """
    )
    
    parser.add_argument(
        '--limit',
        type=int,
        default=10,
        help='Maximum posts to fetch per subreddit (default: 10)'
    )
    parser.add_argument(
        '--min-score',
        type=float,
        default=6.0,
        help='Minimum shitpost score threshold 0-10 (default: 6)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Dry run mode, only display results without pushing'
    )
    
    args = parser.parse_args()
    
    # 加载配置
    try:
        config, filters, storage = load_configs()
    except Exception as e:
        logger.error(f"Failed to load config: {e}")
        sys.exit(1)
    
    # 验证配置（dry-run 模式下可以跳过）
    if not args.dry_run and not validate_config(config):
        sys.exit(1)
    
    # 执行
    try:
        count = run_curation(
            config=config,
            filters=filters,
            storage=storage,
            limit=args.limit,
            min_score=args.min_score,
            dry_run=args.dry_run
        )
        
        logger.info("=" * 50)
        logger.info(f"Task completed, processed {count} posts")
        logger.info("=" * 50)
        
    except KeyboardInterrupt:
        logger.warning("User interrupted")
        sys.exit(0)
    except Exception as e:
        logger.exception("Runtime error")
        logger.error(f"Runtime error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
