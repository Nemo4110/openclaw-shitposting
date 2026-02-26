/**
 * 历史记录管理测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { HistoryManager } from '../src/judge/history.js';
import type { RedditPost } from '../src/types/index.js';

function createMockPost(id: string): RedditPost {
  return {
    id,
    title: `Post ${id}`,
    content: 'Test content',
    url: 'https://example.com',
    permalink: `/r/test/comments/${id}/test/`,
    author: 'testuser',
    subreddit: 'test',
    upvotes: 100,
    upvoteRatio: 0.9,
    commentCount: 10,
    isVideo: false,
    mediaUrl: null,
    createdUtc: Date.now() / 1000,
  };
}

describe('HistoryManager', () => {
  let tempDir: string;
  let historyFile: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'shitpost-test-'));
    historyFile = join(tempDir, 'history.json');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('should create empty history if file does not exist', () => {
      const manager = new HistoryManager(historyFile);
      
      expect(manager.isPosted('reddit_123')).toBe(false);
    });

    it('should load existing history', () => {
      // 预先创建历史文件
      const initialData = {
        postedIds: ['reddit_1', 'reddit_2', 'reddit_3'],
        updatedAt: new Date().toISOString(),
      };
      
      // 先创建一个 manager 并保存
      const manager1 = new HistoryManager(historyFile);
      for (const id of initialData.postedIds) {
        manager1.markPosted(id);
      }
      manager1.saveHistory();

      // 创建新的 manager 加载历史
      const manager2 = new HistoryManager(historyFile);
      
      expect(manager2.isPosted('reddit_1')).toBe(true);
      expect(manager2.isPosted('reddit_2')).toBe(true);
      expect(manager2.isPosted('reddit_999')).toBe(false);
    });
  });

  describe('markPosted', () => {
    it('should mark posts as posted', () => {
      const manager = new HistoryManager(historyFile);
      
      manager.markPosted('reddit_123');
      
      expect(manager.isPosted('reddit_123')).toBe(true);
      expect(manager.isPosted('reddit_456')).toBe(false);
    });

    it('should handle duplicate marks', () => {
      const manager = new HistoryManager(historyFile);
      
      manager.markPosted('reddit_123');
      manager.markPosted('reddit_123');
      
      expect(manager.isPosted('reddit_123')).toBe(true);
    });
  });

  describe('saveHistory', () => {
    it('should save history to file', () => {
      const manager = new HistoryManager(historyFile);
      
      manager.markPosted('reddit_123');
      manager.markPosted('reddit_456');
      manager.saveHistory();

      expect(existsSync(historyFile)).toBe(true);
      
      const saved = JSON.parse(readFileSync(historyFile, 'utf-8'));
      expect(saved.postedIds).toContain('reddit_123');
      expect(saved.postedIds).toContain('reddit_456');
      expect(saved.updatedAt).toBeDefined();
    });

    it('should create directory if not exists', () => {
      const nestedFile = join(tempDir, 'nested', 'dir', 'history.json');
      const manager = new HistoryManager(nestedFile);
      
      manager.markPosted('reddit_123');
      manager.saveHistory();

      expect(existsSync(nestedFile)).toBe(true);
    });

    it('should respect maxHistory limit', () => {
      const manager = new HistoryManager(historyFile, 5);
      
      // 添加超过限制的帖子
      for (let i = 0; i < 10; i++) {
        manager.markPosted(`reddit_${i}`);
      }
      manager.saveHistory();

      const saved = JSON.parse(readFileSync(historyFile, 'utf-8'));
      expect(saved.postedIds.length).toBeLessThanOrEqual(5);
    });
  });

  describe('filterNewPosts', () => {
    it('should filter out posted posts', () => {
      const manager = new HistoryManager(historyFile);
      
      const posts = [
        createMockPost('1'),
        createMockPost('2'),
        createMockPost('3'),
      ];

      // 标记第一个为已推送
      manager.markPosted('reddit_1');

      const newPosts = manager.filterNewPosts(posts);

      expect(newPosts).toHaveLength(2);
      expect(newPosts.map(p => p.id)).toContain('2');
      expect(newPosts.map(p => p.id)).toContain('3');
      expect(newPosts.map(p => p.id)).not.toContain('1');
    });

    it('should return empty array if all posted', () => {
      const manager = new HistoryManager(historyFile);
      
      const posts = [
        createMockPost('1'),
        createMockPost('2'),
      ];

      manager.markPosted('reddit_1');
      manager.markPosted('reddit_2');

      const newPosts = manager.filterNewPosts(posts);

      expect(newPosts).toHaveLength(0);
    });

    it('should return all if none posted', () => {
      const manager = new HistoryManager(historyFile);
      
      const posts = [
        createMockPost('1'),
        createMockPost('2'),
        createMockPost('3'),
      ];

      const newPosts = manager.filterNewPosts(posts);

      expect(newPosts).toHaveLength(3);
    });
  });
});
