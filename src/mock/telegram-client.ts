/**
 * Telegram Mock 客户端
 * 用于 MOCK_MODE 下模拟 Telegram Bot，无需真实 Bot Token
 */

import type { RedditPost, JudgeResult, PushResult } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('telegram-mock');

export interface TelegramOptions {
  botToken: string;
  chatId: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableNotification?: boolean;
}

export class MockTelegramPusher {
  private messageIdCounter: number = 1000;

  constructor(_options: TelegramOptions) {
    logger.info('🎭 Mock Telegram Pusher initialized (MOCK_MODE enabled)');
    logger.info(`[MOCK] Target chat: ${_options.chatId}`);
  }

  /**
   * 模拟推送单个帖子
   */
  async pushPost(
    post: RedditPost,
    judgeResult: JudgeResult
  ): Promise<PushResult> {
    const caption = this.formatMessage(post, judgeResult);
    
    logger.info('─'.repeat(60));
    logger.info('[MOCK] 📤 Push Post:');
    logger.info('─'.repeat(60));
    
    // 打印格式化后的消息
    const lines = caption.split('\n');
    for (const line of lines) {
      logger.info(`  ${line}`);
    }
    
    if (post.mediaUrl) {
      logger.info(`  [Media]: ${post.mediaUrl}`);
    }
    
    logger.info('─'.repeat(60));
    
    // 模拟网络延迟
    await delay(50 + Math.random() * 100);
    
    this.messageIdCounter++;
    
    return { 
      success: true, 
      messageId: this.messageIdCounter 
    };
  }

  /**
   * 模拟批量推送帖子
   */
  async pushPosts(
    postsWithScores: Array<[RedditPost, JudgeResult]>,
    header?: string
  ): Promise<PushResult[]> {
    const results: PushResult[] = [];

    // 模拟发送头部消息
    if (header) {
      logger.info('');
      logger.info('═'.repeat(60));
      logger.info('[MOCK] 📢 Header Message:');
      logger.info('═'.repeat(60));
      const headerLines = header.split('\n');
      for (const line of headerLines) {
        logger.info(`  ${line}`);
      }
      logger.info('═'.repeat(60));
      logger.info('');
      
      await delay(50);
    }

    logger.info(`[MOCK] Pushing ${postsWithScores.length} posts...`);
    logger.info('');

    // 逐个推送
    for (let i = 0; i < postsWithScores.length; i++) {
      const [post, judgeResult] = postsWithScores[i];
      
      logger.info(`[MOCK] [${i + 1}/${postsWithScores.length}] Pushing post from r/${post.subreddit}`);
      
      const result = await this.pushPost(post, judgeResult);
      results.push(result);

      // 模拟等待，避免触发限流
      await delay(100);
    }

    return results;
  }

  /**
   * 模拟发送状态消息
   */
  async sendStatusMessage(text: string): Promise<PushResult> {
    logger.info('');
    logger.info('─'.repeat(40));
    logger.info('[MOCK] 📊 Status Message:');
    logger.info('─'.repeat(40));
    logger.info(`  ${text}`);
    logger.info('─'.repeat(40));
    
    await delay(30);
    
    this.messageIdCounter++;
    
    return { 
      success: true, 
      messageId: this.messageIdCounter 
    };
  }

  /**
   * 格式化消息内容（与真实 TelegramPusher 保持一致）
   */
  private formatMessage(post: RedditPost, judgeResult: JudgeResult): string {
    // 弱智度指示器
    let scoreIndicator: string;
    if (judgeResult.totalScore >= 9) {
      scoreIndicator = '[MAX]';
    } else if (judgeResult.totalScore >= 8) {
      scoreIndicator = '[HIGH]';
    } else if (judgeResult.totalScore >= 7) {
      scoreIndicator = '[MID]';
    } else {
      scoreIndicator = '[LOW]';
    }

    const title = post.title;
    
    let content = '';
    const postContent = post.content && !['[图片]', '[视频]', '[图片集]'].includes(post.content)
      ? post.content
      : null;
    
    if (postContent) {
      content = postContent.slice(0, 200);
      if (post.content.length > 200) {
        content += '...';
      }
    }

    let message = `${scoreIndicator} ${title}\n\n`;
    message += `Score: ${judgeResult.totalScore.toFixed(1)}/10\n`;
    message += `Upvotes: ${post.upvotes} | Comments: ${post.commentCount}\n`;
    message += `Source: r/${post.subreddit}`;

    if (content) {
      message += `\n\nContent: ${content}`;
    }

    message += `\n\nView Original: https://reddit.com${post.permalink}`;

    return message;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
