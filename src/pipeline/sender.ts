#!/usr/bin/env node
/**
 * 消息发送器
 * 将选中的内容推送到配置的 channels
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import type { ScoredPost } from '../types/index.js';

const execFileAsync = promisify(execFile);

/** 发送选项 */
export interface SendOptions {
  dryRun?: boolean;
  channel?: string;
  target?: string;
}

/** 发送单条消息 */
async function sendMessage(
  content: string,
  options: SendOptions = {}
): Promise<{ success: boolean; error?: string }> {
  if (options.dryRun) {
    console.log('[DRY-RUN] 消息内容:');
    console.log(content);
    return { success: true };
  }

  try {
    // 构建 openclaw message 命令参数
    const args = ['message', 'send'];
    
    if (options.channel) {
      args.push('--channel', options.channel);
    }
    
    if (options.target) {
      args.push('--to', options.target);
    }
    
    // 内容作为最后一个参数
    args.push(content);

    const { stdout, stderr } = await execFileAsync('openclaw', args, {
      timeout: 30000,
      encoding: 'utf-8',
    });

    if (stderr) {
      console.warn('发送警告:', stderr);
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('发送失败:', message);
    return { success: false, error: message };
  }
}

/** 批量发送帖子 */
export async function sendPosts(
  posts: ScoredPost[],
  options: SendOptions = {}
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] };

  // 先发送摘要
  if (posts.length > 0) {
    const header = `今日弱智内容精选 (${posts.length} 条)`;
    const result = await sendMessage(header, options);
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      if (result.error) results.errors.push(result.error);
    }
  }

  // 发送每条帖子
  for (const post of posts) {
    const content = post.formattedMessage || formatPostForSharing(post);
    const result = await sendMessage(content, options);
    
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      if (result.error) results.errors.push(result.error);
    }
    
    // 避免发送过快
    await new Promise(r => setTimeout(r, 500));
  }

  return results;
}

/** 格式化帖子为分享文本 */
function formatPostForSharing(post: ScoredPost): string {
  const lines: string[] = [
    `标题: ${post.post.title}`,
    '',
    `来源: r/${post.post.subreddit} | 点赞: ${post.post.score} | 评论: ${post.post.num_comments}`,
    `讨论: ${post.post.permalink}`,
  ];

  if (post.post.url && !post.post.url.includes('reddit.com')) {
    lines.push(post.post.url);
  }

  return lines.join('\n');
}

/** 发送格式化后的完整消息 */
export async function sendFormattedMessage(
  message: string,
  options: SendOptions = {}
): Promise<{ success: boolean; error?: string }> {
  return sendMessage(message, options);
}
