#!/usr/bin/env node
/**
 * 找屎 Skill (Shit Finder)
 * 
 * 评估 Reddit 内容的"弱智度"，筛选最脑残/搞笑的帖子。
 * 
 * 评分逻辑由调用本 Skill 的大模型根据 SKILL.md 的提示词完成。
 */

import type { 
  RedditPost, 
  ScoredPost,
  ShitFinderResult, 
  SkillArgs, 
  SkillContext, 
  Skill 
} from './types/index.js';

import { 
  isBlacklisted, 
  formatPostMessage, 
  generateSummary,
} from './judge/scorer.js';

export const skill: Skill = {
  name: 'shit-finder',
  description: '评估 Reddit 内容的"弱智度"，筛选最脑残/搞笑的帖子',
  version: '2.0.0',

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_context: SkillContext, args: SkillArgs): Promise<ShitFinderResult> {
    const { posts } = args;
    // 这些参数供大模型参考，实际评分由大模型根据 SKILL.md 完成
    // const minScore = args.minScore ?? 6;
    // const limit = args.limit ?? 10;

    if (!posts || posts.length === 0) {
      return {
        inputCount: 0,
        passedCount: 0,
        selectedCount: 0,
        results: [],
        summaryText: '🤷 没有输入内容',
      };
    }

    // 1. 黑名单过滤
    const passedPosts = posts.filter(p => !isBlacklisted(p));

    // 2. 返回数据结构，由大模型填充评分
    const results: ScoredPost[] = passedPosts.map(post => ({
      post,
      score: {
        totalScore: 0,  // 由大模型根据 SKILL.md 评分
        isShitpost: false,
        reasons: [],
      },
    }));

    return {
      inputCount: posts.length,
      passedCount: passedPosts.length,
      selectedCount: 0,  // 由大模型根据 minScore 筛选后更新
      results,
    };
  },
};

/**
 * 格式化已评分的帖子列表
 */
export function formatResults(
  scoredPosts: ScoredPost[], 
  minScore: number = 6
): ShitFinderResult {
  // 过滤并排序
  const filtered = scoredPosts
    .filter(item => item.score.isShitpost && item.score.totalScore >= minScore)
    .sort((a, b) => b.score.totalScore - a.score.totalScore);

  // 生成格式化消息
  const results = filtered.map(item => ({
    ...item,
    formattedMessage: formatPostMessage(item.post, item.score),
  }));

  return {
    inputCount: scoredPosts.length,
    passedCount: scoredPosts.length,
    selectedCount: results.length,
    results,
    summaryText: generateSummary(results),
  };
}

/**
 * 解析 reddit-readonly 的输出
 */
export function parseRedditReadonlyOutput(jsonString: string): RedditPost[] {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.ok && parsed.data) {
      return parsed.data.posts ?? parsed.data.results ?? [];
    }
    return [];
  } catch {
    return [];
  }
}

// 导出类型和工具
export * from './types/index.js';
export { 
  isBlacklisted, 
  formatPostMessage, 
  generateSummary,
  quickPreScore,
  DEFAULT_BLACKLIST,
  DEFAULT_KEYWORDS,
  DEFAULT_SOURCES 
} from './judge/scorer.js';

// 导出 Pipeline 功能
export {
  loadConfig as loadFetchConfig,
  fetchAllPosts,
  mergePosts,
  enrichPostsWithWeights,
  calculateCompositeScore,
  type FetchResult,
} from './pipeline/fetcher.js';

export {
  loadPipelineConfig,
  heuristicScore,
  scorePosts,
  selectTopPosts,
  formatShareMessage,
  runPipeline,
  main as runPipelineMain,
} from './pipeline/runner.js';

export {
  sendFormattedMessage,
  sendPosts,
  type SendOptions,
} from './pipeline/sender.js';
