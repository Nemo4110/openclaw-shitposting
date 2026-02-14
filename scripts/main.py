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
import logging
from datetime import datetime
from typing import List, Tuple

# 添加脚本目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from reddit_fetcher import RedditFetcher
from content_judge import ContentJudge, HistoryManager
from telegram_push import TelegramPusher, push_posts_sync

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


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
        errors.append("❌ Reddit client_id 未配置")
    if 'YOUR_' in reddit.get('client_secret', ''):
        errors.append("❌ Reddit client_secret 未配置")
    if 'YOUR_' in telegram.get('bot_token', ''):
        errors.append("❌ Telegram bot_token 未配置")
    if 'YOUR_' in telegram.get('chat_id', ''):
        errors.append("❌ Telegram chat_id 未配置")
    
    if errors:
        print("\n".join(errors))
        print("\n请编辑 config/config.json 填写必要的凭证信息")
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
    print(f"\n{'='*50}")
    print(f"🚽 搬屎机器人启动 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*50}\n")
    
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
    print("📥 正在从 Reddit 抓取内容...")
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
        print(f"✅ 共抓取 {len(posts)} 个帖子\n")
        
    except Exception as e:
        logger.error(f"抓取 Reddit 失败: {e}")
        print(f"❌ 抓取失败: {e}")
        return 0
    
    # 3. 去重
    history = HistoryManager(history_file, storage.get('max_history', 1000))
    new_posts = history.filter_new_posts(posts)
    
    if not new_posts:
        print("📭 没有新内容需要处理")
        return 0
    
    # 4. 弱智度评分
    print("🧠 正在进行弱智度评分...")
    judge = ContentJudge(filters, judge_config)
    results = judge.judge_batch(new_posts)
    
    # 打印评分结果
    for post, result in zip(new_posts, results):
        status = "✅" if result.is_shitpost else "❌"
        print(f"  {status} [{post.subreddit}] {post.title[:40]}... | 弱智度: {result.total_score:.1f}")
    
    # 5. 筛选高弱智度内容
    shitposts = judge.filter_shitposts(new_posts, results)
    
    if not shitposts:
        print(f"\n📭 没有找到弱智度 ≥ {min_score} 的内容")
        return 0
    
    print(f"\n🎯 筛选出 {len(shitposts)} 个高弱智度帖子\n")
    
    # 6. 推送到 Telegram
    if dry_run:
        print("🧪 测试模式，仅显示结果不推送:\n")
        for post, result in shitposts:
            print(f"  标题: {post.title[:50]}...")
            print(f"  链接: {post.full_url}")
            print(f"  弱智度: {result.total_score:.1f}")
            print(f"  理由: {'; '.join(result.reasons[:3])}")
            print()
        return len(shitposts)
    
    print("📤 正在推送到 Telegram...")
    try:
        header = f"🚽 <b>弱智内容精选</b> ({datetime.now().strftime('%m/%d %H:%M')})\n\n"
        header += "今日为您搬运的精选弱智内容："
        
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
        
        print(f"✅ 推送完成: {success_count} 成功, {fail_count} 失败")
        
        # 7. 记录已推送
        for post, _ in shitposts:
            history.mark_posted(post.short_id)
        history.save_history()
        
        return success_count
        
    except Exception as e:
        logger.error(f"推送 Telegram 失败: {e}")
        print(f"❌ 推送失败: {e}")
        return 0


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='🚽 搬屎机器人 - Reddit 弱智内容采集与推送',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python main.py                    # 使用默认配置运行
  python main.py --limit 20         # 每个版块抓取 20 个帖子
  python main.py --min-score 8      # 只推送弱智度 8 分以上的内容
  python main.py --dry-run          # 测试模式，不实际推送
        """
    )
    
    parser.add_argument(
        '--limit',
        type=int,
        default=10,
        help='每个 subreddit 抓取的最大帖子数 (默认: 10)'
    )
    parser.add_argument(
        '--min-score',
        type=float,
        default=6.0,
        help='弱智度最低阈值 0-10 (默认: 6)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='测试模式，只显示结果不推送'
    )
    
    args = parser.parse_args()
    
    # 加载配置
    try:
        config, filters, storage = load_configs()
    except Exception as e:
        print(f"❌ 加载配置失败: {e}")
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
        
        print(f"\n{'='*50}")
        print(f"🎉 任务完成，共处理 {count} 个帖子")
        print(f"{'='*50}\n")
        
    except KeyboardInterrupt:
        print("\n\n⚠️ 用户中断")
        sys.exit(0)
    except Exception as e:
        logger.exception("运行时错误")
        print(f"\n❌ 运行时错误: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
