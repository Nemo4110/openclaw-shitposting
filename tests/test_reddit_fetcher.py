"""
RedditFetcher 模块单元测试
使用 Mock 对象模拟 PRAW，不依赖真实 Reddit API
"""

import unittest
import sys
import os
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime

# 添加 src 目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from reddit_fetcher import RedditFetcher, RedditPost


class MockSubmission:
    """模拟 PRAW Submission 对象"""
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', 'abc123')
        self.title = kwargs.get('title', 'Test Title')
        self.selftext = kwargs.get('selftext', '')
        self.url = kwargs.get('url', 'https://example.com')
        self.permalink = kwargs.get('permalink', '/r/test/comments/abc123/test/')
        self.author = kwargs.get('author', 'testuser')
        self.subreddit = kwargs.get('subreddit', Mock())
        self.score = kwargs.get('score', 100)
        self.upvote_ratio = kwargs.get('upvote_ratio', 0.85)
        self.num_comments = kwargs.get('num_comments', 20)
        self.is_video = kwargs.get('is_video', False)
        self.is_self = kwargs.get('is_self', False)
        self.stickied = kwargs.get('stickied', False)
        self.created_utc = kwargs.get('created_utc', datetime.now().timestamp())
        self.media = kwargs.get('media', None)
        self.is_gallery = kwargs.get('is_gallery', False)
        self.media_metadata = kwargs.get('media_metadata', None)
    
    def __str__(self):
        return f"MockSubmission({self.id})"


class MockSubreddit:
    """模拟 PRAW Subreddit 对象"""
    def __init__(self, name='test'):
        self.name = name
        self.display_name = name
    
    def __str__(self):
        return self.name
    
    def hot(self, limit=10):
        return [
            MockSubmission(id='post1', title='Hot Post 1', score=200),
            MockSubmission(id='post2', title='Hot Post 2', score=150, stickied=True),
            MockSubmission(id='post3', title='Hot Post 3', score=100),
        ]
    
    def top(self, time_filter='day', limit=10):
        return [
            MockSubmission(id='top1', title='Top Post', score=1000),
        ]
    
    def new(self, limit=10):
        return [
            MockSubmission(id='new1', title='New Post', score=10),
        ]
    
    def rising(self, limit=10):
        return [
            MockSubmission(id='rising1', title='Rising Post', score=50),
        ]
    
    def controversial(self, time_filter='day', limit=10):
        return [
            MockSubmission(id='cont1', title='Controversial Post', score=100, upvote_ratio=0.5),
        ]


class TestRedditPost(unittest.TestCase):
    """测试 RedditPost 数据类"""
    
    def test_post_creation(self):
        """测试创建 Post 对象"""
        post = RedditPost(
            id='test123',
            title='Test Title',
            content='Test content',
            url='https://example.com',
            permalink='/r/test/comments/test123/test/',
            author='testuser',
            subreddit='test',
            upvotes=100,
            upvote_ratio=0.85,
            comment_count=20,
            is_video=False,
            media_url=None,
            created_utc=1234567890.0
        )
        
        self.assertEqual(post.id, 'test123')
        self.assertEqual(post.title, 'Test Title')
        self.assertEqual(post.upvotes, 100)
    
    def test_full_url_property(self):
        """测试完整 URL 属性"""
        post = RedditPost(
            id='test123',
            title='Test',
            content='',
            url='https://example.com',
            permalink='/r/test/comments/test123/test/',
            author='user',
            subreddit='test',
            upvotes=10,
            upvote_ratio=0.9,
            comment_count=5,
            is_video=False,
            media_url=None,
            created_utc=0.0
        )
        
        self.assertEqual(post.full_url, 'https://reddit.com/r/test/comments/test123/test/')
    
    def test_short_id_property(self):
        """测试短 ID 属性"""
        post = RedditPost(
            id='abc123',
            title='Test',
            content='',
            url='',
            permalink='',
            author='user',
            subreddit='test',
            upvotes=10,
            upvote_ratio=0.9,
            comment_count=5,
            is_video=False,
            media_url=None,
            created_utc=0.0
        )
        
        self.assertEqual(post.short_id, 'reddit_abc123')


class TestRedditFetcher(unittest.TestCase):
    """测试 RedditFetcher"""
    
    @patch('reddit_fetcher.praw.Reddit')
    def setUp(self, mock_reddit_class):
        """测试前准备"""
        mock_reddit = MagicMock()
        mock_reddit_class.return_value = mock_reddit
        mock_reddit.user.me.return_value = 'test_user'
        
        self.fetcher = RedditFetcher(
            client_id='test_id',
            client_secret='test_secret',
            user_agent='test_agent'
        )
    
    @patch.object(RedditFetcher, '_convert_submission')
    def test_fetch_subreddit_hot(self, mock_convert):
        """测试获取 hot 排序的帖子"""
        # 设置 mock subreddit
        mock_subreddit = MockSubreddit('test')
        self.fetcher.reddit.subreddit.return_value = mock_subreddit
        
        # 设置转换结果
        mock_convert.side_effect = lambda s: RedditPost(
            id=s.id,
            title=s.title,
            content='',
            url='https://example.com',
            permalink=f'/r/test/comments/{s.id}/',
            author='user',
            subreddit='test',
            upvotes=s.score,
            upvote_ratio=0.85,
            comment_count=10,
            is_video=False,
            media_url=None,
            created_utc=0.0
        )
        
        posts = self.fetcher.fetch_subreddit('test', sort='hot', limit=10)
        
        # 应该过滤掉置顶帖，所以返回2个
        self.assertEqual(len(posts), 2)
        self.assertEqual(posts[0].title, 'Hot Post 1')
        self.assertEqual(posts[1].title, 'Hot Post 3')
    
    def test_convert_submission_self_post(self):
        """测试转换自文本帖子"""
        submission = MockSubmission(
            id='self123',
            title='Self Post',
            is_self=True,
            selftext='This is the content of the post.',
            url='https://reddit.com/r/test/comments/self123/'
        )
        
        post = self.fetcher._convert_submission(submission)
        
        self.assertEqual(post.id, 'self123')
        self.assertEqual(post.content, 'This is the content of the post.')
        self.assertFalse(post.is_video)
    
    def test_convert_submission_video(self):
        """测试转换视频帖子"""
        submission = MockSubmission(
            id='vid123',
            title='Video Post',
            is_video=True,
            media={'reddit_video': {'fallback_url': 'https://v.redd.it/test.mp4'}}
        )
        
        post = self.fetcher._convert_submission(submission)
        
        self.assertTrue(post.is_video)
        self.assertEqual(post.media_url, 'https://v.redd.it/test.mp4')
        self.assertEqual(post.content, '[视频]')
    
    def test_convert_submission_image(self):
        """测试转换图片帖子"""
        submission = MockSubmission(
            id='img123',
            title='Image Post',
            url='https://i.redd.it/test.jpg',
            is_self=False
        )
        
        post = self.fetcher._convert_submission(submission)
        
        self.assertEqual(post.media_url, 'https://i.redd.it/test.jpg')
        self.assertEqual(post.content, '[图片]')
    
    def test_convert_submission_long_text(self):
        """测试长文本截断"""
        long_text = 'A' * 1000
        submission = MockSubmission(
            id='long123',
            title='Long Post',
            is_self=True,
            selftext=long_text
        )
        
        post = self.fetcher._convert_submission(submission)
        
        self.assertEqual(len(post.content), 503)  # 500 + "..."
        self.assertTrue(post.content.endswith('...'))
    
    @patch.object(RedditFetcher, 'fetch_subreddit')
    def test_fetch_multiple(self, mock_fetch):
        """测试从多个 subreddit 获取"""
        mock_fetch.side_effect = [
            [Mock(id='p1', title='From A', upvotes=100, short_id='reddit_p1')],
            [Mock(id='p2', title='From B', upvotes=200, short_id='reddit_p2')],
        ]
        
        posts = self.fetcher.fetch_multiple(['subA', 'subB'], limit=5)
        
        self.assertEqual(mock_fetch.call_count, 2)
        # 应该按 upvotes 排序
        self.assertEqual(posts[0].upvotes, 200)
        self.assertEqual(posts[1].upvotes, 100)


if __name__ == "__main__":
    unittest.main(verbosity=2)
