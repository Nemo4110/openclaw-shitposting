"""
ContentJudge 模块单元测试
不依赖外部 API 和配置文件
"""

import unittest
import sys
import os
import hashlib

# 添加 scripts 目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from content_judge import ContentJudge, HistoryManager, JudgeResult


class MockPost:
    """模拟 RedditPost 用于测试"""
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
    
    @property
    def full_url(self):
        return f"https://reddit.com/r/{self.subreddit}/comments/{self.id}"


class TestContentJudge(unittest.TestCase):
    """测试内容评判器"""
    
    def setUp(self):
        """测试前准备"""
        self.filters = {
            "shitpost_keywords": {
                "en": ["wtf", "bruh", "yikes", "cringe"],
                "zh": ["绝了", "离谱", "无语", "cpu烧了"]
            },
            "blacklist_keywords": ["nsfw", "gore", "porn"],
            "min_upvotes": 50,
            "min_comments": 5,
            "max_age_hours": 48
        }
        self.judge_config = {
            "min_shitpost_score": 6.0,
            "max_posts_per_run": 5,
            "use_llm": False
        }
        self.judge = ContentJudge(self.filters, self.judge_config)
    
    def test_title_keywords_scoring(self):
        """测试标题关键词评分"""
        # 包含弱智关键词的帖子
        post1 = MockPost("Bruh what is this???", "shitposting")
        result1 = self.judge.judge(post1)
        self.assertGreater(result1.title_score, 0)
        
        # 中文关键词
        post2 = MockPost("这真的绝了", "shitposting")
        result2 = self.judge.judge(post2)
        self.assertGreater(result2.title_score, 0)
        
        # 普通帖子
        post3 = MockPost("A normal news article", "news")
        result3 = self.judge.judge(post3)
        self.assertEqual(result3.title_score, 0)
    
    def test_engagement_scoring(self):
        """测试互动特征评分"""
        # 高评论 + 中等点赞 = 高争议
        post1 = MockPost("Test", "shitposting", upvotes=500, comments=150, ratio=0.65)
        result1 = self.judge.judge(post1)
        self.assertGreater(result1.engagement_score, 0)
        
        # 低互动
        post2 = MockPost("Test", "shitposting", upvotes=100, comments=5, ratio=0.95)
        result2 = self.judge.judge(post2)
        self.assertEqual(result2.engagement_score, 0)
    
    def test_blacklist_filtering(self):
        """测试黑名单过滤"""
        post = MockPost("This is nsfw content", "shitposting")
        result = self.judge.judge(post)
        self.assertEqual(result.total_score, 0)
        self.assertFalse(result.is_shitpost)
        self.assertIn("nsfw", result.reasons[0])
    
    def test_shitpost_subreddit_bonus(self):
        """测试弱智版块加分"""
        post1 = MockPost("Test", "shitposting", upvotes=100, comments=20)
        post2 = MockPost("Test", "news", upvotes=100, comments=20)
        
        result1 = self.judge.judge(post1)
        result2 = self.judge.judge(post2)
        
        # shitposting 版块应该有额外的逻辑分数
        self.assertGreater(result1.logic_score, result2.logic_score)
    
    def test_nobody_me_format(self):
        """测试 Nobody: Me: 格式识别"""
        post = MockPost("Nobody: Me: eating pizza", "shitposting")
        result = self.judge.judge(post)
        self.assertGreater(result.logic_score, 0)
    
    def test_batch_judge(self):
        """测试批量评判"""
        posts = [
            MockPost("Bruh???", "shitposting"),
            MockPost("Normal title", "news"),
            MockPost("WTF is this", "okbuddyretard"),
        ]
        results = self.judge.judge_batch(posts)
        self.assertEqual(len(results), 3)
    
    def test_filter_shitposts(self):
        """测试弱智内容过滤"""
        posts = [
            MockPost("Bruh???", "shitposting", upvotes=5000, comments=200, ratio=0.65),
            MockPost("Normal title", "news", upvotes=50, comments=5, ratio=0.95),
            MockPost("WTF", "shitposting", upvotes=1000, comments=100, ratio=0.70),
        ]
        results = self.judge.judge_batch(posts)
        shitposts = self.judge.filter_shitposts(posts, results)
        
        # 至少应该有过滤出的弱智内容
        self.assertGreaterEqual(len(shitposts), 1)
        # 按分数排序
        for i in range(len(shitposts) - 1):
            self.assertGreaterEqual(
                shitposts[i][1].total_score,
                shitposts[i+1][1].total_score
            )


class TestHistoryManager(unittest.TestCase):
    """测试历史记录管理器"""
    
    def setUp(self):
        """测试前准备"""
        import tempfile
        self.temp_dir = tempfile.mkdtemp()
        self.history_file = os.path.join(self.temp_dir, "test_history.json")
        self.history = HistoryManager(self.history_file, max_history=100)
    
    def tearDown(self):
        """测试后清理"""
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def test_mark_and_check_posted(self):
        """测试标记和检查已推送"""
        post_id = "test_post_123"
        
        self.assertFalse(self.history.is_posted(post_id))
        
        self.history.mark_posted(post_id)
        self.assertTrue(self.history.is_posted(post_id))
    
    def test_filter_new_posts(self):
        """测试过滤新帖子"""
        posts = [
            MockPost("Post 1", "test"),
            MockPost("Post 2", "test"),
            MockPost("Post 3", "test"),
        ]
        
        # 标记第二个为已推送
        self.history.mark_posted(posts[1].short_id)
        
        new_posts = self.history.filter_new_posts(posts)
        self.assertEqual(len(new_posts), 2)
        self.assertNotIn(posts[1], new_posts)
    
    def test_save_and_load(self):
        """测试保存和加载历史"""
        self.history.mark_posted("post_1")
        self.history.mark_posted("post_2")
        self.history.save_history()
        
        # 创建新的管理器实例，应该能加载之前的数据
        new_history = HistoryManager(self.history_file, max_history=100)
        self.assertTrue(new_history.is_posted("post_1"))
        self.assertTrue(new_history.is_posted("post_2"))


class TestJudgeResult(unittest.TestCase):
    """测试评分结果数据类"""
    
    def test_judge_result_creation(self):
        """测试创建评分结果"""
        result = JudgeResult(
            post_id="test_123",
            title_score=2.0,
            engagement_score=1.5,
            logic_score=3.0,
            total_score=6.5,
            is_shitpost=True,
            reasons=["reason 1", "reason 2"]
        )
        
        self.assertEqual(result.post_id, "test_123")
        self.assertEqual(result.total_score, 6.5)
        self.assertTrue(result.is_shitpost)
        self.assertEqual(len(result.reasons), 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
