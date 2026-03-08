#!/usr/bin/env node
/**
 * Shitposting Trigger Handler
 * 处理用户意图触发找屎 pipeline
 * 
 * 支持的触发词：
 * - "来点弱智内容"
 * - "难绷"
 * - "找屎"
 * - "今日弱智"
 * - "shitpost"
 */

import { runPipeline } from '../dist/pipeline/runner.js';

/** 检查消息是否包含触发词 */
export function shouldTrigger(message: string): boolean {
  const triggers = [
    '弱智', '难绷', '找屎', '今日弱智',
    'shitpost', 'meme', '搞笑',
    '来点', '整点', '来点乐子'
  ];
  
  const lowerMsg = message.toLowerCase();
  return triggers.some(t => lowerMsg.includes(t.toLowerCase()));
}

/** 执行触发 */
export async function handleTrigger(
  message,
  options = {}
) {
  if (!shouldTrigger(message)) {
    return {
      triggered: false,
      success: true,
      fetched: 0,
      scored: 0,
      selected: 0,
      posts: [],
      message: '',
      dryRun: true,
    };
  }

  console.log('🎯 触发词识别，启动 Pipeline...');

  // 根据消息内容调整参数
  const maxResults = message.includes('多点') || message.includes('多') ? 5 : 3;
  const dryRun = message.includes('测试') || message.includes('试');

  const result = await runPipeline({
    maxResults,
    dryRun,
    channel: options.channel,
    target: options.target,
  });

  return {
    ...result,
    triggered: true,
  };
}

/** CLI 入口 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const message = args.join(' ') || '来点弱智内容';

  const result = await handleTrigger(message, {
    channel: process.env.SHITPOST_CHANNEL,
    target: process.env.SHITPOST_TARGET,
  });

  if (!result.triggered) {
    console.log('未识别到触发词');
    process.exit(0);
  }

  console.log('\n✅ Pipeline 执行完成');
  console.log(`获取: ${result.fetched}, 选中: ${result.selected}, 发送: ${result.sent || 0}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
