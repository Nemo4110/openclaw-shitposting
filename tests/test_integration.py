"""
集成测试
测试完整流程，使用 Mock 避免外部依赖
"""

import unittest
import sys
import os
import json
import tempfile
import shutil
from unittest.mock import Mock, patch, MagicMock

# 添加 src 目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from main import load_configs, validate_config, run_curation


class TestLoadConfigs(unittest.TestCase):
    """测试配置加载"""
    
    def setUp(self):
        """创建临时配置目录"""
        self.temp_dir = tempfile.mkdtemp()
        self.config_dir = os.path.join(self.temp_dir, 'config')
        os.makedirs(self.config_dir)
        
        # 创建测试配置文件
        self.config = {
            "reddit": {
                "client_id": "test_id",
                "client_secret": "test_secret",
                "user_agent": "test_agent",
                "subreddits": ["test"],
                "sort": "hot",
                "time_filter": "day"
            },
            "telegram": {
                "bot_token": "test_token",
                "chat_id": "test_chat",
                "disable_notification": False,
                "parse_mode": "HTML"
            },
            "judge": {
                "min_shitpost_score": 6.0,
                "max_posts_per_run": 5,
                "use_llm": False
            },
            "storage": {
                "history_file": "data/history.json",
                "max_history": 100
            }
        }
        
        self.filters = {
            "shitpost_keywords": {"en": ["wtf"], "zh": ["绝了"]},
            "blacklist_keywords": ["nsfw"],
            "min_upvotes": 50,
            "min_comments": 5
        }
        
        with open(os.path.join(self.config_dir, 'config.json'), 'w') as f:
            json.dump(self.config, f)
        
        with open(os.path.join(self.config_dir, 'filters.json'), 'w') as f:
            json.dump(self.filters, f)
        
        # 临时修改工作目录
        self.original_dir = os.getcwd()
        os.chdir(self.temp_dir)
    
    def tearDown(self):
        """清理"""
        os.chdir(self.original_dir)
        shutil.rmtree(self.temp_dir)
    
    def test_load_configs(self):
        """测试加载配置"""
        config, filters, storage = load_configs()
        
        self.assertEqual(config['reddit']['client_id'], 'test_id')
        self.assertEqual(filters['shitpost_keywords']['en'], ['wtf'])
        self.assertEqual(storage['max_history'], 100)


class TestValidateConfig(unittest.TestCase):
    """测试配置验证"""
    
    def test_valid_config(self):
        """测试有效配置"""
        config = {
            "reddit": {
                "client_id": "valid_id",
                "client_secret": "valid_secret"
            },
            "telegram": {
                "bot_token": "valid_token",
                "chat_id": "valid_chat"
            }
        }
        self.assertTrue(validate_config(config))
    
    def test_missing_reddit_client_id(self):
        """测试缺少 Reddit client_id"""
        config = {
            "reddit": {
                "client_id": "YOUR_REDDIT_CLIENT_ID",
                "client_secret": "valid_secret"
            },
            "telegram": {
                "bot_token": "valid_token",
                "chat_id": "valid_chat"
            }
        }
        self.assertFalse(validate_config(config))
    
    def test_missing_telegram_token(self):
        """测试缺少 Telegram token"""
        config = {
            "reddit": {
                "client_id": "valid_id",
                "client_secret": "valid_secret"
            },
            "telegram": {
                "bot_token": "YOUR_TELEGRAM_BOT_TOKEN",
                "chat_id": "valid_chat"
            }
        }
        self.assertFalse(validate_config(config))


class TestRunCuration(unittest.TestCase):
    """测试完整流程"""
    
    def setUp(self):
        """准备测试数据"""
        self.config = {
            "reddit": {
                "client_id": "test_id",
                "client_secret": "test_secret",
                "user_agent": "test_agent",
                "subreddits": ["shitposting"],
                "sort": "hot",
                "time_filter": "day"
            },
            "telegram": {
                "bot_token": "test_token",
                "chat_id": "test_chat",
                "disable_notification": False,
                "parse_mode": "HTML"
            },
            "judge": {
                "min_shitpost_score": 6.0,
                "max_posts_per_run": 5,
                "use_llm": False
            }
        }
        
        self.filters = {
            "shitpost_keywords": {"en": ["wtf", "bruh"], "zh": []},
            "blacklist_keywords": [],
            "min_upvotes": 50,
            "min_comments": 5
        }
        
        self.temp_dir = tempfile.mkdtemp()
        self.storage = {
            "history_file": os.path.join(self.temp_dir, "history.json"),
            "max_history": 100
        }
    
    def tearDown(self):
        """清理"""
        shutil.rmtree(self.temp_dir)
    
    @patch('main.RedditFetcher')
    @patch('main.push_posts_sync')
    def test_dry_run_mode(self, mock_push, mock_fetcher_class):
        """测试 dry-run 模式"""
        # Mock RedditFetcher
        mock_fetcher = MagicMock()
        mock_fetcher_class.return_value = mock_fetcher
        
        # 创建模拟帖子
        mock_post = Mock()
        mock_post.short_id = 'reddit_test123'
        mock_post.title = 'Bruh what???'
        mock_post.subreddit = 'shitposting'
        mock_post.upvotes = 1000
        mock_post.comment_count = 100
        mock_post.upvote_ratio = 0.70
        mock_post.content = '[图片]'
        mock_post.media_url = 'https://i.redd.it/test.jpg'
        mock_post.full_url = 'https://reddit.com/r/shitposting/comments/test123/'
        
        mock_fetcher.fetch_multiple.return_value = [mock_post]
        
        # 运行 dry-run
        count = run_curation(
            config=self.config,
            filters=self.filters,
            storage=self.storage,
            limit=10,
            min_score=6.0,
            dry_run=True
        )
        
        # dry-run 不应该调用推送
        mock_push.assert_not_called()
        # 但应该返回找到的帖子数
        self.assertGreaterEqual(count, 1)
    
    @patch('main.RedditFetcher')
    def test_no_new_posts(self, mock_fetcher_class):
        """测试没有新帖子的情况"""
        mock_fetcher = MagicMock()
        mock_fetcher_class.return_value = mock_fetcher
        mock_fetcher.fetch_multiple.return_value = []
        
        count = run_curation(
            config=self.config,
            filters=self.filters,
            storage=self.storage,
            limit=10,
            min_score=6.0,
            dry_run=True
        )
        
        self.assertEqual(count, 0)
    
    @patch('main.RedditFetcher')
    def test_reddit_fetch_error(self, mock_fetcher_class):
        """测试 Reddit 抓取失败"""
        mock_fetcher_class.side_effect = Exception("API Error")
        
        count = run_curation(
            config=self.config,
            filters=self.filters,
            storage=self.storage,
            limit=10,
            min_score=6.0,
            dry_run=True
        )
        
        self.assertEqual(count, 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
