#!/usr/bin/env node
/**
 * OpenClaw Skill 入口
 * 同时作为 CLI 工具和 OpenClaw Skill 使用
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ShitpostCurator, type CuratorResult } from './curator.js';
import { loadConfig, validateConfig } from './utils/config.js';
import { createLogger } from './utils/logger.js';
import type { RunOptions } from './types/index.js';

const logger = createLogger('index');

export interface SkillContext {
  workspacePath: string;
}

export interface SkillArgs {
  limit?: number;
  minScore?: number;
  dryRun?: boolean;
}

export interface Skill {
  name: string;
  description: string;
  version: string;
  execute(context: SkillContext, args: SkillArgs): Promise<CuratorResult>;
}

/**
 * OpenClaw Skill 定义
 */
export const skill: Skill = {
  name: 'shitpost-curator',
  description: '自动从 Reddit 采集弱智内容并推送到 Telegram',
  version: '1.0.0',

  async execute(context: SkillContext, args: SkillArgs): Promise<CuratorResult> {
    const options: RunOptions = {
      limit: args.limit ?? 10,
      minScore: args.minScore ?? 6,
      dryRun: args.dryRun ?? false,
    };

    const { config, filters } = loadConfig(context.workspacePath);

    if (!options.dryRun && !validateConfig(config, options.dryRun)) {
      throw new Error('Invalid configuration');
    }

    const curator = new ShitpostCurator(context.workspacePath, config, filters);
    return await curator.run(options);
  },
};

/**
 * 直接运行（作为 CLI）
 */
async function main(): Promise<void> {
  // 动态导入 CLI 模块，避免在作为 Skill 被导入时执行 CLI 逻辑
  await import('./cli.js');
}

// 如果是直接运行（不是被导入），则执行 main
if (import.meta.url === `file://${process.argv[1]}` ||
    import.meta.url === `file://${process.argv[1]}.exe`) {
  main().catch((error) => {
    logger.error(`Unhandled error: ${error}`);
    process.exit(1);
  });
}

// 导出类型和类供外部使用
export { ShitpostCurator, type CuratorResult } from './curator.js';
export { loadConfig, validateConfig } from './utils/config.js';
export * from './types/index.js';
