/**
 * 配置加载和校验
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';
import { createLogger } from './logger.js';

const logger = createLogger('config');

// Zod schemas for validation
const redditConfigSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
  user_agent: z.string().default('ShitpostCuratorBot/1.0'),
  subreddits: z.array(z.string()).default(['shitposting']),
  sort: z.enum(['hot', 'top', 'new', 'rising', 'controversial']).default('hot'),
  time_filter: z.enum(['day', 'week', 'month', 'year', 'all']).default('day'),
});

const telegramConfigSchema = z.object({
  bot_token: z.string(),
  chat_id: z.string(),
  parse_mode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).default('HTML'),
  disable_notification: z.boolean().default(false),
});

const judgeConfigSchema = z.object({
  min_shitpost_score: z.number().default(6.0),
  max_posts_per_run: z.number().default(5),
  use_llm: z.boolean().default(false),
});

const storageConfigSchema = z.object({
  history_file: z.string().default('data/history.json'),
  max_history: z.number().default(1000),
});

const appConfigSchema = z.object({
  reddit: redditConfigSchema,
  telegram: telegramConfigSchema,
  judge: judgeConfigSchema.default({}),
  storage: storageConfigSchema.default({}),
});

const filterConfigSchema = z.object({
  shitpost_keywords: z.object({
    en: z.array(z.string()).default([]),
    zh: z.array(z.string()).default([]),
  }).default({ en: [], zh: [] }),
  blacklist_keywords: z.array(z.string()).default([]),
});

export type RawConfig = z.infer<typeof appConfigSchema>;
export type RawFilterConfig = z.infer<typeof filterConfigSchema>;

export interface Config {
  reddit: {
    clientId: string;
    clientSecret: string;
    userAgent: string;
    subreddits: string[];
    sort: 'hot' | 'top' | 'new' | 'rising' | 'controversial';
    timeFilter: 'day' | 'week' | 'month' | 'year' | 'all';
  };
  telegram: {
    botToken: string;
    chatId: string;
    parseMode: 'HTML' | 'Markdown' | 'MarkdownV2';
    disableNotification: boolean;
  };
  judge: {
    minShitpostScore: number;
    maxPostsPerRun: number;
    useLlm: boolean;
  };
  storage: {
    historyFile: string;
    maxHistory: number;
  };
}

export interface FilterConfig {
  shitpostKeywords: {
    en: string[];
    zh: string[];
  };
  blacklistKeywords: string[];
}

function transformConfig(raw: RawConfig): Config {
  return {
    reddit: {
      clientId: raw.reddit.client_id,
      clientSecret: raw.reddit.client_secret,
      userAgent: raw.reddit.user_agent,
      subreddits: raw.reddit.subreddits,
      sort: raw.reddit.sort,
      timeFilter: raw.reddit.time_filter,
    },
    telegram: {
      botToken: raw.telegram.bot_token,
      chatId: raw.telegram.chat_id,
      parseMode: raw.telegram.parse_mode,
      disableNotification: raw.telegram.disable_notification,
    },
    judge: {
      minShitpostScore: raw.judge.min_shitpost_score,
      maxPostsPerRun: raw.judge.max_posts_per_run,
      useLlm: raw.judge.use_llm,
    },
    storage: {
      historyFile: raw.storage.history_file,
      maxHistory: raw.storage.max_history,
    },
  };
}

function transformFilterConfig(raw: RawFilterConfig): FilterConfig {
  return {
    shitpostKeywords: {
      en: raw.shitpost_keywords.en,
      zh: raw.shitpost_keywords.zh,
    },
    blacklistKeywords: raw.blacklist_keywords,
  };
}

export function loadConfig(projectRoot: string): { config: Config; filters: FilterConfig } {
  const configPath = resolve(projectRoot, 'config', 'config.json');
  const filtersPath = resolve(projectRoot, 'config', 'filters.json');

  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  if (!existsSync(filtersPath)) {
    throw new Error(`Filters file not found: ${filtersPath}`);
  }

  try {
    const rawConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    const rawFilters = JSON.parse(readFileSync(filtersPath, 'utf-8'));

    const parsedConfig = appConfigSchema.parse(rawConfig);
    const parsedFilters = filterConfigSchema.parse(rawFilters);

    return {
      config: transformConfig(parsedConfig),
      filters: transformFilterConfig(parsedFilters),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Config validation failed:');
      for (const issue of error.issues) {
        logger.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      }
    }
    throw error;
  }
}

export function validateConfig(config: Config, _dryRun: boolean): boolean {
  const errors: string[] = [];

  if (config.reddit.clientId.includes('YOUR_')) {
    errors.push('Reddit client_id not configured');
  }
  if (config.reddit.clientSecret.includes('YOUR_')) {
    errors.push('Reddit client_secret not configured');
  }
  if (config.telegram.botToken.includes('YOUR_')) {
    errors.push('Telegram bot_token not configured');
  }
  if (config.telegram.chatId.includes('YOUR_')) {
    errors.push('Telegram chat_id not configured');
  }

  if (errors.length > 0) {
    for (const error of errors) {
      logger.error(error);
    }
    logger.error('Please edit config/config.json to fill in required credentials');
    return false;
  }

  return true;
}
