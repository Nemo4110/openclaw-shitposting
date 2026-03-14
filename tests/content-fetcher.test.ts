import { describe, it, expect } from 'vitest';
import { generateTldr } from '../src/utils/content-fetcher.js';
import type { PostDetail } from '../src/utils/content-fetcher.js';

describe('generateTldr', () => {
  it('应该从内容和评论生成 TL;DR', () => {
    const detail: PostDetail = {
      title: 'Test Post',
      contentSnippet: 'This is a test post content that is quite long and needs to be summarized.',
      topComments: ['Great post!', 'Very informative.'],
    };

    const tldr = generateTldr(detail);

    expect(tldr).toContain('内容:');
    expect(tldr).toContain('热评:');
  });

  it('应该处理错误情况', () => {
    const detail: PostDetail = {
      title: 'Test Post',
      error: 'Failed to fetch content',
    };

    const tldr = generateTldr(detail);

    expect(tldr).toContain('无法获取详情');
    expect(tldr).toContain('Failed to fetch content');
  });

  it('应该处理空内容', () => {
    const detail: PostDetail = {
      title: 'Test Post',
    };

    const tldr = generateTldr(detail);

    expect(tldr).toBe('暂无详细内容');
  });
});
