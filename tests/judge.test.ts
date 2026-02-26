/**
 * 弱智度评分算法测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContentJudge } from '../src/judge/scorer.js';
import type { RedditPost, FilterConfig, JudgeConfig } from '../src/types/index.js';

function createMockPost(overrides: Partial<RedditPost> = {}): RedditPost {
  return {
    id: 'test123',
    title: 'Test Post',
    content: 'Test content',
    url: 'https://example.com',
    permalink: '/r/test/comments/test123/test_post/',
    author: 'testuser',
    subreddit: 'test',
    upvotes: 100,
    upvoteRatio: 0.9,
    commentCount: 10,
    isVideo: false,
    mediaUrl: null,
    createdUtc: Date.now() / 1000,
    ...overrides,
  };
}

const mockFilters: FilterConfig = {
  shitpostKeywords: {
    en: ['wtf', 'bruh', 'yikes', 'cringe'],
    zh: ['绝了', '离谱', '大无语', 'cpu烧了'],
  },
  blacklistKeywords: ['nsfw', 'gore', 'violence'],
};

const mockJudgeConfig: JudgeConfig = {
  minShitpostScore: 6.0,
  maxPostsPerRun: 5,
  useLlm: false,
};

describe('ContentJudge', () => {
  let judge: ContentJudge;

  beforeEach(() => {
    judge = new ContentJudge(mockFilters, mockJudgeConfig);
  });

  describe('judge', () => {
    it('should return low score for normal post', () => {
      const post = createMockPost({
        title: 'A normal news article',
        subreddit: 'news',
        upvotes: 100,
        commentCount: 10,
        upvoteRatio: 0.95,
      });

      const result = judge.judge(post);

      expect(result.totalScore).toBeLessThan(6.0);
      expect(result.isShitpost).toBe(false);
    });

    it('should detect shitpost keywords in title', () => {
      const post = createMockPost({
        title: 'Bruh what is this???',
        subreddit: 'shitposting',
      });

      const result = judge.judge(post);

      expect(result.titleScore).toBeGreaterThan(0);
      expect(result.reasons.some(r => r.includes('Title'))).toBe(true);
    });

    it('should detect Chinese keywords', () => {
      const post = createMockPost({
        title: '这也太离谱了吧！！',
        subreddit: 'shitposting',
      });

      const result = judge.judge(post);

      expect(result.titleScore).toBeGreaterThan(0);
    });

    it('should detect multiple punctuation marks', () => {
      const post = createMockPost({
        title: 'What??? Really!!!',
        subreddit: 'funny',
      });

      const result = judge.judge(post);

      // 多个标点符号应该加分
      expect(result.titleScore).toBeGreaterThanOrEqual(1.0);
    });

    it('should detect all caps title', () => {
      const post = createMockPost({
        title: 'THIS IS INSANE',
        subreddit: 'funny',
      });

      const result = judge.judge(post);

      expect(result.titleScore).toBeGreaterThanOrEqual(0.5);
    });

    it('should score high engagement with controversy', () => {
      const post = createMockPost({
        title: 'Controversial opinion',
        commentCount: 150,
        upvotes: 2000,
        upvoteRatio: 0.6,
      });

      const result = judge.judge(post);

      expect(result.engagementScore).toBeGreaterThan(0);
    });

    it('should detect shitpost subreddits', () => {
      const post = createMockPost({
        title: 'Regular post',
        subreddit: 'shitposting',
      });

      const result = judge.judge(post);

      expect(result.logicScore).toBeGreaterThanOrEqual(1.0);
    });

    it('should detect "Nobody: / Me:" format', () => {
      const post = createMockPost({
        title: 'Nobody: Me: eating pizza at 3am',
        subreddit: 'funny',
      });

      const result = judge.judge(post);

      expect(result.logicScore).toBeGreaterThanOrEqual(1.0);
    });

    it('should detect Chinese "Nobody" format', () => {
      const post = createMockPost({
        title: '没有人：我：凌晨三点吃披萨',
        subreddit: 'funny',
      });

      const result = judge.judge(post);

      expect(result.logicScore).toBeGreaterThanOrEqual(1.0);
    });

    it('should return zero score for blacklisted content', () => {
      const post = createMockPost({
        title: 'Post with nsfw content',
        subreddit: 'shitposting',
      });

      const result = judge.judge(post);

      expect(result.totalScore).toBe(0);
      expect(result.isShitpost).toBe(false);
      expect(result.reasons.some(r => r.includes('Blacklisted'))).toBe(true);
    });

    it('should pass high quality shitpost', () => {
      const post = createMockPost({
        title: 'Bruh wtf is this???',
        subreddit: 'shitposting',
        commentCount: 200,
        upvotes: 3000,
        upvoteRatio: 0.65,
      });

      const result = judge.judge(post);

      expect(result.totalScore).toBeGreaterThanOrEqual(6.0);
      expect(result.isShitpost).toBe(true);
    });
  });

  describe('judgeBatch', () => {
    it('should judge multiple posts', () => {
      const posts = [
        createMockPost({ id: '1', title: 'Normal post' }),
        createMockPost({ id: '2', title: 'Bruh moment' }),
        createMockPost({ id: '3', title: 'Another normal one' }),
      ];

      const results = judge.judgeBatch(posts);

      expect(results).toHaveLength(3);
      expect(results[0].postId).toBe('reddit_1');
      expect(results[1].postId).toBe('reddit_2');
      expect(results[2].postId).toBe('reddit_3');
    });
  });

  describe('filterShitposts', () => {
    it('should filter and sort shitposts', () => {
      const posts = [
        createMockPost({ id: '1', title: 'Low score post' }),
        createMockPost({ id: '2', title: 'Bruh wtf???', subreddit: 'shitposting' }),
        createMockPost({ id: '3', title: 'Nobody: Me: something', subreddit: 'shitposting' }),
      ];

      const results = judge.judgeBatch(posts);
      const shitposts = judge.filterShitposts(posts, results);

      // 应该有过滤出的内容
      expect(shitposts.length).toBeGreaterThan(0);
      
      // 应该按分数降序排列
      for (let i = 1; i < shitposts.length; i++) {
        expect(shitposts[i - 1][1].totalScore).toBeGreaterThanOrEqual(shitposts[i][1].totalScore);
      }
    });

    it('should respect maxPostsPerRun limit', () => {
      const posts = Array(10).fill(null).map((_, i) => 
        createMockPost({ 
          id: `${i}`, 
          title: 'Bruh wtf???',
          subreddit: 'shitposting',
        })
      );

      const results = judge.judgeBatch(posts);
      const shitposts = judge.filterShitposts(posts, results);

      expect(shitposts.length).toBeLessThanOrEqual(mockJudgeConfig.maxPostsPerRun);
    });
  });
});
