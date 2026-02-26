#!/usr/bin/env node
/**
 * 命令行入口
 */

import { parseArgs } from 'util';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ShitpostCurator } from './curator.js';
import { loadConfig, validateConfig } from './utils/config.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('cli');

function getProjectRoot(): string {
  // 在 ESM 中获取 __dirname 的替代方法
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // 从 src 目录向上追溯到项目根目录
  return resolve(__dirname, '..');
}

function showHelp(): void {
  console.log(`
Shitpost Curator Bot - Reddit shitpost collection and Telegram push

Usage:
  shitpost-curator [options]

Options:
  --limit N       Maximum posts to fetch per subreddit (default: 10)
  --min-score N   Minimum shitpost score threshold 0-10 (default: 6)
  --dry-run       Dry run mode, only display results without pushing
  --mock          Mock mode, use mock data instead of real APIs
  --help          Show this help message

Environment Variables:
  MOCK_MODE=true  Enable mock mode (alternative to --mock flag)

Examples:
  shitpost-curator                         # Run with default config
  shitpost-curator --limit 20              # Fetch 20 posts per subreddit
  shitpost-curator --min-score 8           # Only push content with score >= 8
  shitpost-curator --dry-run               # Dry run mode, no actual push
  shitpost-curator --mock                  # Use mock data for testing
  MOCK_MODE=true shitpost-curator          # Enable mock mode via env var
`);
}

async function main(): Promise<void> {
  // 解析命令行参数
  let args: { values: Record<string, string | boolean | undefined> };
  
  try {
    args = parseArgs({
      options: {
        limit: { type: 'string', default: '10' },
        'min-score': { type: 'string', default: '6' },
        'dry-run': { type: 'boolean', default: false },
        mock: { type: 'boolean', default: false },
        help: { type: 'boolean', default: false },
      },
      strict: true,
      allowPositionals: false,
    });
  } catch (error) {
    logger.error(`Failed to parse arguments: ${error}`);
    showHelp();
    process.exit(1);
  }

  const { values } = args;

  if (values.help) {
    showHelp();
    process.exit(0);
  }

  const limit = parseInt(values.limit as string, 10);
  const minScore = parseFloat(values['min-score'] as string);
  const dryRun = values['dry-run'] as boolean;
  const mockMode = (values.mock as boolean) || process.env.MOCK_MODE === 'true';

  if (isNaN(limit) || limit < 1) {
    logger.error('Invalid limit value');
    process.exit(1);
  }

  if (isNaN(minScore) || minScore < 0 || minScore > 10) {
    logger.error('Invalid min-score value');
    process.exit(1);
  }

  const projectRoot = getProjectRoot();

  // 加载配置
  let config, filters;
  try {
    ({ config, filters } = loadConfig(projectRoot));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to load config: ${errorMsg}`);
    process.exit(1);
  }

  // mock 模式下打印提示
  if (mockMode) {
    logger.info('🎭 MOCK MODE ENABLED - Using mock data instead of real APIs');
  }

  // 验证配置（dry-run 或 mock 模式下可以跳过）
  if (!mockMode && !dryRun && !validateConfig(config, dryRun)) {
    process.exit(1);
  }

  // 执行
  try {
    const curator = new ShitpostCurator(projectRoot, config, filters, mockMode);
    const result = await curator.run({ limit, minScore, dryRun });

    logger.info('='.repeat(50));
    logger.info(
      `Task completed: ${result.fetched} fetched, ${result.newPosts} new, ` +
      `${result.selected} selected, ${result.pushed} pushed, ${result.failed} failed`
    );
    logger.info('='.repeat(50));

    process.exit(0);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Runtime error: ${errorMsg}`);
    process.exit(1);
  }
}

main();
