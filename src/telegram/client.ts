/**
 * Telegram 推送模块
 * 将筛选后的弱智内容推送到 Telegram 群
 */

import TelegramBot from 'node-telegram-bot-api';
import type { RedditPost, JudgeResult, PushResult } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('telegram');

export interface TelegramOptions {
  botToken: string;
  chatId: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableNotification?: boolean;
}

export class TelegramPusher {
  private bot: TelegramBot;
  private chatId: string;
  private parseMode: 'HTML' | 'Markdown' | 'MarkdownV2';
  private disableNotification: boolean;

  constructor(options: TelegramOptions) {
    this.bot = new TelegramBot(options.botToken, { polling: false });
    this.chatId = options.chatId;
    this.parseMode = options.parseMode ?? 'HTML';
    this.disableNotification = options.disableNotification ?? false;
    
    logger.info(`Telegram Bot initialized, target chat: ${options.chatId}`);
  }

  /**
   * 推送单个帖子
   */
  async pushPost(
    post: RedditPost,
    judgeResult: JudgeResult
  ): Promise<PushResult> {
    const caption = this.formatMessage(post, judgeResult);

    try {
      // 如果有媒体文件，优先发送媒体
      if (post.mediaUrl) {
        return await this.sendMedia(post.mediaUrl, caption);
      } else {
        // 纯文本消息
        const message = await this.bot.sendMessage(this.chatId, caption, {
          parse_mode: this.parseMode,
          disable_notification: this.disableNotification,
          disable_web_page_preview: false,
        });
        return { success: true, messageId: message.message_id };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Push failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 批量推送帖子
   */
  async pushPosts(
    postsWithScores: Array<[RedditPost, JudgeResult]>,
    header?: string
  ): Promise<PushResult[]> {
    const results: PushResult[] = [];

    // 发送头部消息
    if (header) {
      try {
        await this.bot.sendMessage(this.chatId, header, {
          parse_mode: 'HTML',
          disable_notification: this.disableNotification,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to send header: ${errorMsg}`);
      }
    }

    // 逐个推送
    for (const [post, judgeResult] of postsWithScores) {
      const result = await this.pushPost(post, judgeResult);
      results.push(result);

      // 避免触发限流，等待 1 秒
      await sleep(1000);
    }

    return results;
  }

  /**
   * 发送状态消息
   */
  async sendStatusMessage(text: string): Promise<PushResult> {
    try {
      const message = await this.bot.sendMessage(this.chatId, text, {
        parse_mode: 'HTML',
        disable_notification: true,
      });
      return { success: true, messageId: message.message_id };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to send status message: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 格式化消息内容
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

    // 转义 HTML 特殊字符
    const titleEscaped = escapeHtml(post.title);
    
    let contentEscaped = '';
    const content = post.content && !['[图片]', '[视频]', '[图片集]'].includes(post.content)
      ? post.content
      : null;
    
    if (content) {
      contentEscaped = escapeHtml(content.slice(0, 200));
      if (content.length > 200) {
        contentEscaped += '...';
      }
    }

    let message = `${scoreIndicator} <b>${titleEscaped}</b>\n\n`;
    message += `Score: <code>${judgeResult.totalScore.toFixed(1)}/10</code>\n`;
    message += `Upvotes: ${post.upvotes} | Comments: ${post.commentCount}\n`;
    message += `Source: r/${post.subreddit}`;

    if (contentEscaped) {
      message += `\n\nContent: ${contentEscaped}`;
    }

    message += `\n\n<a href="https://reddit.com${post.permalink}">View Original Post</a>`;

    return message;
  }

  /**
   * 发送媒体消息
   */
  private async sendMedia(mediaUrl: string, caption: string): Promise<PushResult> {
    try {
      // 判断媒体类型
      const videoExtensions = ['.mp4', '.gif', '.webm', '.mov'];
      const isVideo = videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext));

      if (isVideo) {
        // 发送视频/动画
        const message = await this.bot.sendVideo(this.chatId, mediaUrl, {
          caption,
          parse_mode: this.parseMode,
          disable_notification: this.disableNotification,
        });
        return { success: true, messageId: message.message_id };
      } else {
        // 发送图片
        const message = await this.bot.sendPhoto(this.chatId, mediaUrl, {
          caption,
          parse_mode: this.parseMode,
          disable_notification: this.disableNotification,
        });
        return { success: true, messageId: message.message_id };
      }
    } catch (error) {
      // 媒体发送失败，降级为文本
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Media send failed, falling back to text: ${errorMsg}`);
      
      try {
        const message = await this.bot.sendMessage(
          this.chatId,
          `${caption}\n\nMedia: ${mediaUrl}`,
          {
            parse_mode: this.parseMode,
            disable_notification: this.disableNotification,
          }
        );
        return { success: true, messageId: message.message_id };
      } catch (error2) {
        const errorMsg2 = error2 instanceof Error ? error2.message : String(error2);
        return { success: false, error: errorMsg2 };
      }
    }
  }
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 休眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
