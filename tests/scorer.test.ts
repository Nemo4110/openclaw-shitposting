import { describe, it, expect } from 'vitest';
import { isBlacklisted, formatPostMessage, generateSummary, quickPreScore } from '../src/judge/scorer.js';
import type { RedditPost } from '../src/types/index.js';

function createPost(overrides: Partial<RedditPost> = {}): RedditPost {
  return {
    id: 'test123',
    subreddit: 'test',
    title: 'Test Title',
    score: 100,
    num_comments: 10,
    created_utc: Date.now() / 1000,
    permalink: 'https://reddit.com/r/test/comments/test123/',
    ...overrides,
  };
}

describe('isBlacklisted', () => {
  it('应该识别黑名单关键词', () => {
    const post = createPost({ title: 'This is nsfw content' });
    expect(isBlacklisted(post)).toBe(true);
  });

  it('应该通过正常内容', () => {
    const post = createPost({ title: 'Normal funny post' });
    expect(isBlacklisted(post)).toBe(false);
  });
});

describe('formatPostMessage', () => {
  it('应该正确格式化消息', () => {
    const post = createPost({
      title: 'wtf is this',
      subreddit: 'shitposting',
      score: 1500,
      num_comments: 200,
    });
    const score = {
      totalScore: 8.5,
      isShitpost: true,
      reasons: ['标题关键词', '弱智来源'],
    };

    const message = formatPostMessage(post, score);

    expect(message).toContain('标题: wtf is this');
    expect(message).toContain('来源: r/shitposting');
    expect(message).toContain('点赞: 1500');
    expect(message).toContain('评论: 200');
    expect(message).toContain('评分: 8.5/10');
  });
});

describe('generateSummary', () => {
  it('应该生成摘要', () => {
    const results = [
      { post: createPost({ title: 'Post 1' }), score: { totalScore: 8, isShitpost: true, reasons: [] } },
      { post: createPost({ title: 'Post 2' }), score: { totalScore: 7, isShitpost: true, reasons: [] } },
    ];

    const summary = generateSummary(results);

    expect(summary).toContain('今日弱智内容精选 (2 条)');
    expect(summary).toContain('[1] 评分: 8.0/10');
    expect(summary).toContain('[2] 评分: 7.0/10');
  });

  it('空结果应该返回友好提示', () => {
    const summary = generateSummary([]);
    expect(summary).toContain('没有找到符合条件的弱智内容');
  });
});

describe('quickPreScore', () => {
  it('应该识别弱智关键词', () => {
    const post = createPost({ title: 'wtf bruh' });
    expect(quickPreScore(post)).toBeGreaterThan(0);
  });

  it('应该识别弱智来源', () => {
    const post = createPost({ subreddit: 'shitposting' });
    expect(quickPreScore(post)).toBeGreaterThanOrEqual(1);
  });
});
