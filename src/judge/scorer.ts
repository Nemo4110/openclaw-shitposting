/**
 * 弱智度评分器
 * 
 * 评分逻辑由调用本 Skill 的大模型根据 SKILL.md 的提示词完成
 * 本文件只提供数据结构和工具函数
 */

import type { RedditPost, JudgeResult, ScoredPost } from '../types/index.js';

/** 默认关键词配置 */
export const DEFAULT_KEYWORDS = {
  en: [
    "wtf", "bruh", "yikes", "cringe", "lmao", "lol", "omg",
    "what", "why", "how", "seriously", "literally", "absolutely",
    "nobody", "expect", "understand", "confused", "lost"
  ],
  zh: [
    "绝了", "离谱", "大无语", "无语", "cpu烧了", "烧脑",
    "看不懂", "不明白", "什么鬼", "啥玩意", "懵了", "迷惑",
    "窒息", "辣眼睛", "裂开", "麻了", "服了", "整不会"
  ],
};

/** 默认黑名单 */
export const DEFAULT_BLACKLIST = [
  "nsfw", "gore", "death", "kill", "murder", "porn",
  "politic", "trump", "biden", "election"
];

/** 默认弱智内容源 */
export const DEFAULT_SOURCES = [
  "shitposting", "okbuddyretard", "terriblefacebookmemes", 
  "comedyheaven", "facepalm", "wtf", "cringetopia"
];

/**
 * 检查帖子是否在黑名单中
 */
export function isBlacklisted(post: RedditPost, blacklist: string[] = DEFAULT_BLACKLIST): boolean {
  const text = `${post.title} ${post.selftext_snippet ?? ''}`.toLowerCase();
  return blacklist.some(kw => text.includes(kw.toLowerCase()));
}

/**
 * 格式化帖子为消息文本
 */
export function formatPostMessage(post: RedditPost, score: JudgeResult): string {
  const lines: string[] = [
    `📌 ${post.title}`,
    ``,
    `🏷️ r/${post.subreddit} | 👍 ${post.score} | 💬 ${post.num_comments}`,
    `🔗 ${post.permalink}`,
    `🎯 弱智度: ${score.totalScore.toFixed(1)}/10`,
  ];

  if (score.reasons.length > 0) {
    lines.push(`📊 ${score.reasons.slice(0, 2).join(', ')}`);
  }

  if (post.selftext_snippet) {
    const snippet = post.selftext_snippet.slice(0, 100);
    lines.push(`📝 ${snippet}${post.selftext_snippet.length > 100 ? '...' : ''}`);
  }

  if (post.url && !post.url.includes('reddit.com')) {
    lines.push(`🖼️ ${post.url}`);
  }

  return lines.join('\n');
}

/**
 * 生成摘要文本
 */
export function generateSummary(results: ScoredPost[]): string {
  if (results.length === 0) {
    return '🤷 没有找到符合条件的弱智内容';
  }

  const lines: string[] = [
    `🎉 今日弱智内容精选 (${results.length} 条)`,
    ``,
  ];

  results.forEach((item, index) => {
    const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '•';
    lines.push(`${emoji} [${item.score.totalScore.toFixed(1)}] ${item.post.title.slice(0, 50)}${item.post.title.length > 50 ? '...' : ''}`);
  });

  lines.push('');
  lines.push('👇 详细内容');

  return lines.join('\n');
}

/**
 * 简单的启发式预评分（用于快速过滤，非必需）
 * 真正的评分由大模型根据 SKILL.md 的提示词完成
 */
export function quickPreScore(post: RedditPost): number {
  let score = 0;
  const title = post.title.toLowerCase();
  
  // 关键词匹配
  for (const kw of DEFAULT_KEYWORDS.en) {
    if (title.includes(kw)) score += 0.5;
  }
  for (const kw of DEFAULT_KEYWORDS.zh) {
    if (post.title.includes(kw)) score += 0.5;
  }
  
  // 来源加分
  for (const src of DEFAULT_SOURCES) {
    if (post.subreddit.toLowerCase().includes(src)) {
      score += 1;
      break;
    }
  }
  
  return Math.min(score, 3);
}
