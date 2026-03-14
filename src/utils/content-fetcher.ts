#!/usr/bin/env node
/**
 * 内容获取器 - 获取帖子详情并生成 TL;DR
 * 用于 Reddit 和小红书帖子
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { resolve } from 'path';
import type { RedditPost, XiaohongshuPost } from '../types/index.js';

const execFileAsync = promisify(execFile);

/** 获取的内容详情 */
export interface PostDetail {
  title: string;
  content?: string;
  contentSnippet?: string;
  topComments?: string[];
  imageUrls?: string[];
  tldr?: string;
  error?: string;
}

/** Reddit Thread 响应 */
interface RedditThreadResponse {
  ok: boolean;
  data?: {
    post?: {
      title?: string;
      selftext?: string;
      url?: string;
      subreddit?: string;
      author?: string;
    };
    comments?: Array<{
      body?: string;
      author?: string;
      score?: number;
    }>;
  };
  error?: {
    message: string;
  };
}

/** 小红书详情响应 */
interface XiaohongshuDetailResponse {
  id?: string;
  title?: string;
  content?: string;
  images?: string[];
  user?: {
    nickname?: string;
  };
  comments?: Array<{
    content?: string;
    user?: {
      nickname?: string;
    };
    likedCount?: number;
  }>;
}

/** 获取 Reddit 帖子详情 */
async function fetchRedditDetail(
  post: RedditPost,
  redditReadonlyPath?: string
): Promise<PostDetail> {
  // 尝试多个可能的路径
  const possiblePaths = [
    redditReadonlyPath,
    process.env.REDDIT_READONLY_PATH,
    resolve(process.env.HOME || '', '.openclaw/workspace/skills/reddit-readonly/scripts/reddit-readonly.mjs'),
    resolve(process.env.HOME || '', '.claude/skills/reddit-readonly/scripts/reddit-readonly.mjs'),
  ].filter(Boolean) as string[];

  let scriptPath: string | undefined;
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      scriptPath = path;
      break;
    }
  }

  if (!scriptPath) {
    return {
      title: post.title,
      error: '未找到 reddit-readonly 技能',
    };
  }

  try {
    // 使用 thread 命令获取帖子详情和评论
    const postId = post.id || post.permalink.split('/').filter(Boolean).pop() || '';
    const { stdout } = await execFileAsync(
      'node',
      [scriptPath, 'thread', postId, '--commentLimit', '5', '--depth', '2'],
      {
        timeout: 30000,
        encoding: 'utf-8',
      }
    );

    const result: RedditThreadResponse = JSON.parse(stdout);
    
    if (!result.ok || !result.data) {
      return {
        title: post.title,
        error: result.error?.message || '获取帖子详情失败',
      };
    }

    const postData = result.data.post || {};
    const comments = result.data.comments || [];

    // 提取内容
    const content = postData.selftext || '';
    const contentSnippet = content.length > 300 ? content.slice(0, 300) + '...' : content;

    // 提取高赞评论
    const topComments = comments
      .filter(c => c.body && c.body.length > 10)
      .slice(0, 3)
      .map(c => c.body || '');

    // 生成 TL;DR
    const tldrParts: string[] = [];
    if (contentSnippet) {
      tldrParts.push(`内容: ${contentSnippet}`);
    }
    if (topComments.length > 0) {
      tldrParts.push(`热评: "${topComments[0].slice(0, 100)}${topComments[0].length > 100 ? '...' : ''}"`);
    }
    const tldr = tldrParts.join(' | ') || undefined;

    return {
      title: postData.title || post.title,
      content: content || undefined,
      contentSnippet: contentSnippet || undefined,
      topComments,
      imageUrls: post.url && !post.url.includes('reddit.com') ? [post.url] : undefined,
      tldr,
    };
  } catch (error) {
    return {
      title: post.title,
      error: `获取详情失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/** 获取小红书帖子详情 */
async function fetchXiaohongshuDetail(
  post: XiaohongshuPost,
  xiaohongshuPath?: string
): Promise<PostDetail> {
  // 尝试多个可能的路径
  const possiblePaths = [
    xiaohongshuPath,
    process.env.XIAOHONGSHU_PATH,
    resolve(process.env.HOME || '', '.openclaw/workspace/skills/xiaohongshu'),
    resolve(process.env.HOME || '', '.claude/skills/xiaohongshu-skills'),
  ].filter(Boolean) as string[];

  let skillPath: string | undefined;
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      skillPath = path;
      break;
    }
  }

  if (!skillPath) {
    return {
      title: post.title,
      error: '未找到 xiaohongshu 技能',
    };
  }

  const cliPath = resolve(skillPath, 'scripts/cli.py');
  if (!existsSync(cliPath)) {
    return {
      title: post.title,
      error: '未找到 xiaohongshu CLI',
    };
  }

  try {
    // 使用 get-feed-detail 命令获取详情
    const { stdout } = await execFileAsync(
      'uv',
      ['run', 'python', cliPath, 'get-feed-detail', '--feed-id', post.id, '--xsec-token', post.xsecToken],
      {
        timeout: 30000,
        encoding: 'utf-8',
        cwd: skillPath,
      }
    );

    const result: XiaohongshuDetailResponse = JSON.parse(stdout);

    // 提取内容
    const content = result.content || '';
    const contentSnippet = content.length > 300 ? content.slice(0, 300) + '...' : content;

    // 提取热门评论
    const topComments = (result.comments || [])
      .filter(c => c.content && c.content.length > 5)
      .slice(0, 3)
      .map(c => c.content || '');

    // 生成 TL;DR
    const tldrParts: string[] = [];
    if (contentSnippet) {
      tldrParts.push(`内容: ${contentSnippet}`);
    }
    if (topComments.length > 0) {
      tldrParts.push(`热评: "${topComments[0].slice(0, 100)}${topComments[0].length > 100 ? '...' : ''}"`);
    }
    const tldr = tldrParts.join(' | ') || undefined;

    return {
      title: result.title || post.title,
      content: content || undefined,
      contentSnippet: contentSnippet || undefined,
      topComments,
      imageUrls: result.images || (post.cover ? [post.cover] : undefined),
      tldr,
    };
  } catch (error) {
    return {
      title: post.title,
      error: `获取详情失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/** 获取帖子详情 */
export async function fetchPostDetail(
  post: RedditPost | XiaohongshuPost,
  options?: {
    redditReadonlyPath?: string;
    xiaohongshuPath?: string;
  }
): Promise<PostDetail> {
  // 判断帖子类型
  const isXiaohongshu = (post as XiaohongshuPost).source === 'xiaohongshu' ||
                        (post as XiaohongshuPost).xsecToken !== undefined;

  if (isXiaohongshu) {
    return fetchXiaohongshuDetail(post as XiaohongshuPost, options?.xiaohongshuPath);
  } else {
    return fetchRedditDetail(post as RedditPost, options?.redditReadonlyPath);
  }
}

/** 批量获取帖子详情 */
export async function fetchPostsDetails(
  posts: (RedditPost | XiaohongshuPost)[],
  options?: {
    redditReadonlyPath?: string;
    xiaohongshuPath?: string;
    concurrency?: number;
  }
): Promise<Map<string, PostDetail>> {
  const results = new Map<string, PostDetail>();
  
  // 串行获取，避免频率限制
  for (const post of posts) {
    const detail = await fetchPostDetail(post, options);
    results.set(post.id, detail);
    
    // 添加延迟避免频率限制
    await new Promise(r => setTimeout(r, 500));
  }
  
  return results;
}

/** 生成 TL;DR 文本 */
export function generateTldr(detail: PostDetail): string {
  if (detail.error) {
    return `无法获取详情: ${detail.error}`;
  }

  if (detail.tldr) {
    return detail.tldr;
  }

  const parts: string[] = [];
  
  if (detail.contentSnippet) {
    parts.push(`内容: ${detail.contentSnippet}`);
  }
  
  if (detail.topComments && detail.topComments.length > 0) {
    const comment = detail.topComments[0];
    parts.push(`热评: "${comment.slice(0, 100)}${comment.length > 100 ? '...' : ''}"`);
  }

  return parts.join(' | ') || '暂无详细内容';
}
