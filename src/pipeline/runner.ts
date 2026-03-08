#!/usr/bin/env node
/**
 * Shitposting Pipeline Runner
 * 完整的找屎流程：获取 → 评分 → 分享
 */

import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import type { 
  RedditPost, 
  JudgeResult, 
  ScoredPost, 
  PipelineConfig,
  PipelineResult 
} from '../types/index.js';

import {
  isBlacklisted,
  formatPostMessage,
  generateSummary,
} from '../judge/scorer.js';

import {
  loadConfig as loadFetchConfig,
  fetchAllPosts,
  mergePosts,
  enrichPostsWithWeights,
  calculateCompositeScore,
} from './fetcher.js';

import {
  sendFormattedMessage,
  sendPosts,
  type SendOptions,
} from './sender.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** 加载完整配置 */
export async function loadPipelineConfig(): Promise<PipelineConfig> {
  const configPath = resolve(__dirname, '../../config/sources.json');
  const content = await readFile(configPath, 'utf-8');
  return JSON.parse(content);
}

/** 评分函数 - 启发式预评分 */
export function heuristicScore(post: RedditPost, sourceWeight: number = 1.0): JudgeResult {
  const reasons: string[] = [];
  let score = 4.0; // 基础分4分，确保热门内容能通过
  const title = post.title.toLowerCase();
  
  // 1. 弱智关键词匹配
  const keywords = [
    'wtf', 'bruh', 'yikes', 'cringe', 'lmao', 'lol', 'omg',
    'what', 'why', 'how', 'seriously', 'literally', 'absolutely',
    'confused', 'lost', 'nobody', 'stupid', 'dumb', 'crazy',
    '绝了', '离谱', '无语', 'cpu烧了', '烧脑',
    '看不懂', '什么鬼', '懵了', '迷惑', '裂开', '麻了', '服了'
  ];
  
  for (const kw of keywords) {
    if (title.includes(kw.toLowerCase()) || post.title.includes(kw)) {
      score += 0.8;
      if (!reasons.some(r => r.includes('关键词'))) {
        reasons.push('标题关键词');
      }
    }
  }
  
  // 2. 标点符号特征
  if (/\?{2,}/.test(post.title) || /!{2,}/.test(post.title)) {
    score += 0.8;
    reasons.push('情绪化标点');
  }
  
  // 3. Emoji 特征 (如 📡📡📡)
  if (/[\u{1F300}-\u{1F9FF}]/u.test(post.title) || /[\u{2600}-\u{26FF}]/u.test(post.title)) {
    score += 0.5;
    reasons.push('表情符号');
  }
  
  // 4. 来源加分 - 核心板块直接给高分基础
  const shitpostSources = ['shitposting', 'okbuddyretard'];
  const comedySources = ['comedyheaven', 'terriblefacebookmemes'];
  const otherSources = ['facepalm', 'wtf'];
  
  if (shitpostSources.some(s => post.subreddit.toLowerCase().includes(s))) {
    score += 2.0;
    reasons.push(`弱智板块: ${post.subreddit}`);
  } else if (comedySources.some(s => post.subreddit.toLowerCase().includes(s))) {
    score += 1.5;
    reasons.push(`搞笑板块: ${post.subreddit}`);
  } else if (otherSources.some(s => post.subreddit.toLowerCase().includes(s))) {
    score += 1.0;
    reasons.push(`来源: ${post.subreddit}`);
  }
  
  // 5. 热度特征
  if (post.score > 1000) {
    score += 0.5;
    reasons.push('高热度');
  }
  
  // 6. 互动特征
  if (post.num_comments > 50) {
    score += 0.3;
    if (!reasons.some(r => r.includes('互动'))) {
      reasons.push('高互动');
    }
  }
  if (post.num_comments > 100 && post.score < 5000) {
    score += 0.5;
    reasons.push('争议性');
  }
  
  // 7. 综合得分加成
  const composite = calculateCompositeScore(post, sourceWeight);
  score += composite * 0.2;
  
  // 限制最大分数
  score = Math.min(score, 10);
  
  // 确保至少有一个理由
  if (reasons.length === 0) {
    reasons.push('热门内容');
  }
  
  return {
    totalScore: score,
    isShitpost: score >= 5.5, // 降低阈值到5.5
    reasons,
  };
}

/** 评分所有帖子 */
export function scorePosts(
  posts: RedditPost[],
  sources: { subreddit: string; weight?: number }[]
): ScoredPost[] {
  const sourceMap = new Map(sources.map(s => [s.subreddit.toLowerCase(), s.weight || 1.0]));
  
  return posts
    .filter(p => !isBlacklisted(p))
    .map(post => {
      const weight = sourceMap.get(post.subreddit.toLowerCase()) || 1.0;
      const score = heuristicScore(post, weight);
      return {
        post,
        score,
        formattedMessage: formatPostMessage(post, score),
      };
    });
}

/** 选择 Top N 帖子 */
export function selectTopPosts(
  scoredPosts: ScoredPost[],
  maxResults: number = 3,
  minScore: number = 6.0
): ScoredPost[] {
  return scoredPosts
    .filter(item => item.score.isShitpost && item.score.totalScore >= minScore)
    .sort((a, b) => b.score.totalScore - a.score.totalScore)
    .slice(0, maxResults);
}

/** 格式化分享消息 */
export function formatShareMessage(results: ScoredPost[]): string {
  if (results.length === 0) {
    return '🤷 今日没有找到值得分享的弱智内容';
  }

  const lines: string[] = [
    `🎉 今日弱智内容精选 (${results.length} 条)`,
    '',
  ];

  results.forEach((item, index) => {
    const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '•';
    lines.push(`${emoji} [${item.score.totalScore.toFixed(1)}分] ${item.post.title.slice(0, 60)}${item.post.title.length > 60 ? '...' : ''}`);
    lines.push(`    r/${item.post.subreddit} | 👍 ${item.post.score} | 💬 ${item.post.num_comments}`);
    lines.push(`    🔗 ${item.post.permalink}`);
    if (item.post.url && !item.post.url.includes('reddit.com')) {
      lines.push(`    🖼️ ${item.post.url}`);
    }
    if (index < results.length - 1) {
      lines.push('');
    }
  });

  return lines.join('\n');
}

/** 运行完整 pipeline */
export async function runPipeline(
  options: {
    maxResults?: number;
    minScore?: number;
    dryRun?: boolean;
    redditReadonlyPath?: string;
    channel?: string;
    target?: string;
  } = {}
): Promise<PipelineResult> {
  const config = await loadPipelineConfig();
  const maxResults = options.maxResults ?? config.judge.maxResults ?? 3;
  const minScore = options.minScore ?? config.judge.minScore ?? 5.5;

  console.log('🚀 启动 Shitposting Pipeline...');
  console.log(`📊 配置: 最大${maxResults}条, 最低${minScore}分`);

  // 1. 获取帖子
  console.log('\n📥 正在获取帖子...');
  const fetchResults = await fetchAllPosts(
    { sources: config.sources, fetch: config.fetch },
    options.redditReadonlyPath
  );

  const allPosts = mergePosts(fetchResults);
  console.log(`✅ 获取到 ${allPosts.length} 条唯一帖子`);

  // 2. 评分
  console.log('\n🎯 正在评分...');
  const scoredPosts = scorePosts(allPosts, config.sources);
  console.log(`✅ 评分完成: ${scoredPosts.filter(p => p.score.isShitpost).length} 条通过阈值`);

  // 3. 选择 Top N
  const topPosts = selectTopPosts(scoredPosts, maxResults, minScore);
  console.log(`✅ 选出 ${topPosts.length} 条最佳内容`);

  // 4. 生成分享消息
  const shareMessage = formatShareMessage(topPosts);

  // 5. 发送消息
  let sendResult = { success: true, sent: 0, error: undefined as string | undefined };
  
  if (topPosts.length > 0 && !options.dryRun) {
    console.log('\n📤 正在发送消息...');
    const sendOptions: SendOptions = {
      dryRun: options.dryRun,
      channel: options.channel,
      target: options.target,
    };
    
    const result = await sendFormattedMessage(shareMessage, sendOptions);
    sendResult.success = result.success;
    sendResult.error = result.error;
    
    if (result.success) {
      console.log('✅ 发送成功');
      sendResult.sent = 1;
    } else {
      console.error('❌ 发送失败:', result.error);
    }
  }

  // 6. 输出结果
  const result: PipelineResult = {
    success: true,
    fetched: allPosts.length,
    scored: scoredPosts.length,
    selected: topPosts.length,
    posts: topPosts,
    message: shareMessage,
    dryRun: options.dryRun ?? false,
    sent: sendResult.sent,
    sendError: sendResult.error,
  };

  console.log('\n' + '='.repeat(50));
  console.log('📤 分享内容:');
  console.log('='.repeat(50));
  console.log(shareMessage);
  console.log('='.repeat(50));

  if (options.dryRun) {
    console.log('\n⚠️ 试运行模式 - 未实际发送');
  }

  return result;
}

/** CLI 入口 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  const options = {
    maxResults: parseInt(process.env.SHITPOST_MAX_RESULTS || '3', 10),
    minScore: parseFloat(process.env.SHITPOST_MIN_SCORE || '5.5'),
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    channel: process.env.SHITPOST_CHANNEL,
    target: process.env.SHITPOST_TARGET,
    redditReadonlyPath: process.env.REDDIT_READONLY_PATH,
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Shitposting Pipeline - 自动找屎并分享

用法:
  node pipeline.mjs [选项]

选项:
  -d, --dry-run    试运行模式，不发送消息
  -h, --help       显示帮助

环境变量:
  SHITPOST_MAX_RESULTS    最大分享数量 (默认: 3)
  SHITPOST_MIN_SCORE      最低评分阈值 (默认: 5.5)
  SHITPOST_CHANNEL        目标频道 (如: onebot, discord, telegram)
  SHITPOST_TARGET         目标用户/群组 (如: group:123456)
  REDDIT_READONLY_PATH    reddit-readonly 脚本路径
`);
    return;
  }

  try {
    await runPipeline(options);
  } catch (error) {
    console.error('❌ Pipeline 失败:', error);
    process.exit(1);
  }
}
