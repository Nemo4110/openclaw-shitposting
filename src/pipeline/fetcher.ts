#!/usr/bin/env node
/**
 * Reddit 帖子获取器
 * 调用 reddit-readonly skill 获取多个板块的帖子
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { RedditPost, SourceConfig, FetchConfig } from '../types/index.js';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** 获取 Reddit 帖子的结果 */
export interface FetchResult {
  source: string;
  posts: RedditPost[];
  error?: string;
}

/** 加载配置 */
export async function loadConfig(): Promise<{ sources: SourceConfig[]; fetch: FetchConfig }> {
  const configPath = resolve(__dirname, '../../config/sources.json');
  const content = await readFile(configPath, 'utf-8');
  return JSON.parse(content);
}

/** 从单个板块获取帖子 */
async function fetchFromSubreddit(
  subreddit: string,
  limit: number = 15,
  timeRange: string = 'week',
  redditReadonlyPath?: string
): Promise<RedditPost[]> {
  // 确定 reddit-readonly 脚本路径
  const scriptPath = redditReadonlyPath || resolve(
    process.env.HOME || '~',
    '.openclaw/workspace/skills/reddit-readonly/scripts/reddit-readonly.mjs'
  );

  try {
    const { stdout } = await execFileAsync(
      'node',
      [scriptPath, 'posts', subreddit, '--sort', 'hot', '--time', timeRange, '--limit', String(limit)],
      { timeout: 30000, encoding: 'utf-8' }
    );

    const result = JSON.parse(stdout);
    if (result.ok && result.data && Array.isArray(result.data.posts)) {
      return result.data.posts;
    }
    return [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching from r/${subreddit}:`, message);
    return [];
  }
}

/** 从所有启用的源获取帖子 */
export async function fetchAllPosts(
  config?: { sources: SourceConfig[]; fetch: FetchConfig },
  redditReadonlyPath?: string
): Promise<FetchResult[]> {
  const cfg = config || await loadConfig();
  const enabledSources = cfg.sources.filter(s => s.enabled !== false);

  const results: FetchResult[] = [];

  for (const source of enabledSources) {
    console.log(`Fetching from r/${source.subreddit}...`);
    
    const posts = await fetchFromSubreddit(
      source.subreddit,
      cfg.fetch.postsPerSource,
      cfg.fetch.timeRange,
      redditReadonlyPath
    );

    // 过滤掉过旧的帖子
    const maxAgeMs = (cfg.fetch.maxAgeDays || 7) * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const freshPosts = posts.filter(p => {
      const postTime = p.created_utc * 1000;
      return (now - postTime) <= maxAgeMs;
    });

    results.push({
      source: source.subreddit,
      posts: freshPosts,
    });

    // 避免请求过快
    await new Promise(r => setTimeout(r, 500));
  }

  return results;
}

/** 合并并去重帖子 */
export function mergePosts(results: FetchResult[]): RedditPost[] {
  const seen = new Set<string>();
  const allPosts: RedditPost[] = [];

  for (const result of results) {
    for (const post of result.posts) {
      if (!seen.has(post.id)) {
        seen.add(post.id);
        allPosts.push(post);
      }
    }
  }

  return allPosts;
}

/** 计算帖子的综合得分（用于排序） */
export function calculateCompositeScore(
  post: RedditPost,
  sourceWeight: number = 1.0
): number {
  // 基础分数 = 点赞数标准化 (0-5分)
  const scoreBase = Math.min(post.score / 1000, 5);
  
  // 互动分数 = 评论数标准化 (0-3分)
  const commentBase = Math.min(post.num_comments / 200, 3);
  
  // 热度系数 = 评论/点赞比
  const engagementRatio = post.score > 0 ? post.num_comments / post.score : 0;
  const engagementBonus = engagementRatio > 0.05 ? 1 : 0;
  
  // 来源权重
  const weighted = (scoreBase + commentBase + engagementBonus) * sourceWeight;
  
  return Math.min(weighted, 10);
}

/** 为帖子添加来源权重信息 */
export function enrichPostsWithWeights(
  posts: RedditPost[],
  sources: SourceConfig[]
): Array<RedditPost & { sourceWeight: number; compositeScore: number }> {
  const sourceMap = new Map(sources.map(s => [s.subreddit.toLowerCase(), s.weight || 1.0]));
  
  return posts.map(post => {
    const weight = sourceMap.get(post.subreddit.toLowerCase()) || 1.0;
    return {
      ...post,
      sourceWeight: weight,
      compositeScore: calculateCompositeScore(post, weight),
    };
  });
}
