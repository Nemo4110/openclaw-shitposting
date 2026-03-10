#!/usr/bin/env node
/**
 * Reddit/小红书 帖子获取器
 * 调用 reddit-readonly skill 或 xiaohongshu-skills 获取帖子
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import type { RedditPost, SourceConfig, FetchConfig, XiaohongshuPost } from '../types/index.js';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** 获取 Reddit 帖子的结果 */
export interface FetchResult {
  source: string;
  posts: (RedditPost | XiaohongshuPost)[];
  error?: string;
}

/** 加载配置 */
export async function loadConfig(): Promise<{ sources: SourceConfig[]; fetch: FetchConfig; xiaohongshu?: { enabled: boolean; keywords: string[]; postsPerKeyword: number; name: string; weight: number } }> {
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

/** 从小红书搜索获取帖子 */
async function fetchFromXiaohongshu(
  keyword: string,
  limit: number = 10,
  xiaohongshuPath?: string
): Promise<XiaohongshuPost[]> {
  const skillPath = xiaohongshuPath || resolve(process.env.HOME || homedir(), '.openclaw/workspace/skills/xiaohongshu');
  const cliPath = resolve(skillPath, 'scripts/cli.py');

  try {
    const { stdout } = await execFileAsync('uv', ['run', 'python', cliPath, 'search-feeds', '--keyword', keyword], {
      timeout: 60000,
      encoding: 'utf-8',
      cwd: skillPath
    });

    // 解析 JSON 输出（CLI 会输出日志到 stderr，JSON 到 stdout）
    const lines = stdout.split('\n');
    let jsonStr = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('{') && trimmed.includes('"feeds"')) {
        jsonStr = trimmed;
        break;
      }
    }
    if (!jsonStr) {
      // 尝试直接解析整个输出
      jsonStr = stdout.substring(stdout.indexOf('{'), stdout.lastIndexOf('}') + 1);
    }
    const result = JSON.parse(jsonStr);
    if (result.feeds && Array.isArray(result.feeds)) {
      // 转换为统一格式，限制数量
      return result.feeds
        .filter((f: any) => f.modelType === 'note') // 只保留笔记类型
        .slice(0, limit) // 限制数量
        .map((f: any) => ({
          id: f.id,
          title: f.displayTitle || '无标题',
          author: f.user?.nickname || '未知用户',
          score: parseInt(f.interactInfo?.likedCount || '0', 10),
          num_comments: parseInt(f.interactInfo?.commentCount || '0', 10),
          likedCount: f.interactInfo?.likedCount || '0',
          collectedCount: f.interactInfo?.collectedCount || '0',
          commentCount: f.interactInfo?.commentCount || '0',
          sharedCount: f.interactInfo?.sharedCount || '0',
          cover: f.cover,
          noteType: f.type,
          xsecToken: f.xsecToken,
          userId: f.user?.userId,
          subreddit: 'xiaohongshu', // 标记来源
          permalink: `https://www.xiaohongshu.com/explore/${f.id}`,
          url: f.cover,
          source: 'xiaohongshu' as const
        }));
    }
    return [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching from 小红书 keyword "${keyword}":`, message);
    return [];
  }
}
export async function fetchAllPosts(
  config?: { sources: SourceConfig[]; fetch: FetchConfig; xiaohongshu?: { enabled: boolean; keywords: string[]; postsPerKeyword: number; name: string; weight: number } },
  redditReadonlyPath?: string,
  xiaohongshuPath?: string
): Promise<FetchResult[]> {
  const cfg = config || await loadConfig();
  const enabledSources = cfg.sources.filter(s => s.enabled !== false);

  const results: FetchResult[] = [];

  // 1. 获取 Reddit 帖子
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

  // 2. 获取小红书帖子（如果启用）
  const xhsEnabled = cfg.xiaohongshu?.enabled || process.env.XIAOHONGSHU_ENABLED === 'true';
  if (xhsEnabled && cfg.xiaohongshu?.keywords && cfg.xiaohongshu.keywords.length > 0) {
    console.log('\n📕 获取小红书内容...');
    const xhsPath = xiaohongshuPath || process.env.XIAOHONGSHU_PATH || resolve(process.env.HOME || homedir(), '.openclaw/workspace/skills/xiaohongshu');
    for (const keyword of cfg.xiaohongshu.keywords) {
      console.log(`Fetching from 小红书: "${keyword}"...`);
      const posts = await fetchFromXiaohongshu(keyword, cfg.xiaohongshu?.postsPerKeyword || 10, xhsPath);
      results.push({
        source: `xiaohongshu:${keyword}`,
        posts: posts,
      });
      // 避免请求过快
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return results;
}

/** 合并并去重帖子 */
export function mergePosts(results: FetchResult[]): (RedditPost | XiaohongshuPost)[] {
  const seen = new Set<string>();
  const allPosts: (RedditPost | XiaohongshuPost)[] = [];

  for (const result of results) {
    for (const post of result.posts) {
      const id = (post as any).source === 'xiaohongshu' ? `xhs_${post.id}` : post.id;
      if (!seen.has(id)) {
        seen.add(id);
        allPosts.push(post);
      }
    }
  }

  return allPosts;
}

/** 计算帖子的综合得分（用于排序） */
export function calculateCompositeScore(
  post: RedditPost | XiaohongshuPost,
  sourceWeight: number = 1.0
): number {
  // 小红书帖子使用不同的计算方式
  if ((post as any).source === 'xiaohongshu') {
    const liked = parseInt((post as XiaohongshuPost).likedCount || '0', 10);
    const comments = parseInt((post as XiaohongshuPost).commentCount || '0', 10);
    const scoreBase = Math.min(liked / 500, 5); // 小红书点赞数通常较低
    const commentBase = Math.min(comments / 100, 3);
    const engagementRatio = liked > 0 ? comments / liked : 0;
    const engagementBonus = engagementRatio > 0.05 ? 1 : 0;
    const weighted = (scoreBase + commentBase + engagementBonus) * sourceWeight;
    return Math.min(weighted, 10);
  }

  // Reddit 帖子计算方式
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
  posts: (RedditPost | XiaohongshuPost)[],
  sources: SourceConfig[],
  xiaohongshuConfig?: { enabled: boolean; weight: number }
): Array<(RedditPost | XiaohongshuPost) & { sourceWeight: number; compositeScore: number }> {
  const sourceMap = new Map(sources.map(s => [s.subreddit.toLowerCase(), s.weight || 1.0]));
  
  // 添加小红书权重
  if (xiaohongshuConfig?.enabled) {
    sourceMap.set('xiaohongshu', xiaohongshuConfig.weight || 1.0);
  }
  
  return posts.map(post => {
    const lookupKey = (post as any).source === 'xiaohongshu' ? 'xiaohongshu' : post.subreddit?.toLowerCase();
    const weight = sourceMap.get(lookupKey) || 1.0;
    return {
      ...post,
      sourceWeight: weight,
      compositeScore: calculateCompositeScore(post, weight),
    };
  });
}
