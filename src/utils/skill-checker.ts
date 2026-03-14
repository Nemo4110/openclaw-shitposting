#!/usr/bin/env node
/**
 * 依赖技能可用性检查器
 * 检查 reddit-readonly 和 xiaohongshu 技能是否可用
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { resolve } from 'path';

const execFileAsync = promisify(execFile);

/** 技能状态 */
export interface SkillStatus {
  name: string;
  available: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

/** 技能检查配置 */
export interface SkillCheckConfig {
  redditReadonlyPath?: string;
  xiaohongshuPath?: string;
}

/** 检查 reddit-readonly 技能 */
async function checkRedditReadonly(
  customPath?: string
): Promise<SkillStatus> {
  const name = 'reddit-readonly';
  
  // 尝试多个可能的路径
  const possiblePaths = [
    customPath,
    process.env.REDDIT_READONLY_PATH,
    resolve(process.env.HOME || '', '.openclaw/workspace/skills/reddit-readonly/scripts/reddit-readonly.mjs'),
    resolve(process.env.HOME || '', '.claude/skills/reddit-readonly/scripts/reddit-readonly.mjs'),
    './skills/reddit-readonly/scripts/reddit-readonly.mjs',
  ].filter(Boolean) as string[];

  for (const scriptPath of possiblePaths) {
    if (existsSync(scriptPath)) {
      try {
        // 测试运行 --help 确认可用
        const { stdout } = await execFileAsync('node', [scriptPath, '--help'], {
          timeout: 10000,
          encoding: 'utf-8',
        });
        
        if (stdout.includes('reddit-readonly') || stdout.includes('Usage:')) {
          return {
            name,
            available: true,
            details: { path: scriptPath },
          };
        }
      } catch {
        // 继续尝试下一个路径
      }
    }
  }

  return {
    name,
    available: false,
    error: '未找到 reddit-readonly 技能。请安装: https://clawhub.ai/buksan1950/reddit-readonly',
    details: { searchedPaths: possiblePaths },
  };
}

/** 检查 xiaohongshu 技能 */
async function checkXiaohongshu(
  customPath?: string
): Promise<SkillStatus> {
  const name = 'xiaohongshu';
  
  // 尝试多个可能的路径
  const possiblePaths = [
    customPath,
    process.env.XIAOHONGSHU_PATH,
    resolve(process.env.HOME || '', '.openclaw/workspace/skills/xiaohongshu'),
    resolve(process.env.HOME || '', '.claude/skills/xiaohongshu-skills'),
    './skills/xiaohongshu-skills',
  ].filter(Boolean) as string[];

  for (const skillPath of possiblePaths) {
    if (existsSync(skillPath)) {
      const cliPath = resolve(skillPath, 'scripts/cli.py');
      if (existsSync(cliPath)) {
        try {
          // 检查登录状态
          const { stdout } = await execFileAsync(
            'uv',
            ['run', 'python', cliPath, 'check-login'],
            {
              timeout: 30000,
              encoding: 'utf-8',
              cwd: skillPath,
            }
          );
          
          try {
            const result = JSON.parse(stdout);
            if (result.logged_in === true) {
              return {
                name,
                available: true,
                details: { 
                  path: skillPath, 
                  loggedIn: true,
                  user: result.user,
                },
              };
            } else {
              return {
                name,
                available: false,
                error: '小红书未登录。请先执行: uv run python scripts/cli.py login',
                details: { path: skillPath, loggedIn: false },
              };
            }
          } catch {
            // JSON 解析失败，但命令能运行，说明技能存在
            return {
              name,
              available: true,
              details: { path: skillPath, warning: '登录状态检查失败' },
            };
          }
        } catch (error) {
          return {
            name,
            available: false,
            error: `小红书技能检查失败: ${error instanceof Error ? error.message : String(error)}`,
            details: { path: skillPath },
          };
        }
      }
    }
  }

  return {
    name,
    available: false,
    error: '未找到 xiaohongshu 技能。请安装: https://github.com/autoclaw-cc/xiaohongshu-skills',
    details: { searchedPaths: possiblePaths },
  };
}

/** 检查所有依赖技能 */
export async function checkDependencies(
  config: SkillCheckConfig & { xiaohongshuEnabled?: boolean }
): Promise<{
  allAvailable: boolean;
  skills: SkillStatus[];
  errors: string[];
}> {
  const skills: SkillStatus[] = [];
  const errors: string[] = [];

  // 检查 reddit-readonly (必需)
  const redditStatus = await checkRedditReadonly(config.redditReadonlyPath);
  skills.push(redditStatus);
  
  if (!redditStatus.available) {
    errors.push(redditStatus.error || 'reddit-readonly 不可用');
  }

  // 检查 xiaohongshu (可选，仅当启用时)
  if (config.xiaohongshuEnabled) {
    const xhsStatus = await checkXiaohongshu(config.xiaohongshuPath);
    skills.push(xhsStatus);
    
    if (!xhsStatus.available) {
      errors.push(xhsStatus.error || 'xiaohongshu 不可用');
    }
  }

  return {
    allAvailable: errors.length === 0,
    skills,
    errors,
  };
}

/** 格式化技能检查结果为消息 */
export function formatSkillCheckResult(result: {
  allAvailable: boolean;
  skills: SkillStatus[];
  errors: string[];
}): string {
  if (result.allAvailable) {
    const lines = ['依赖技能检查通过:', ''];
    for (const skill of result.skills) {
      const status = skill.available ? '可用' : '不可用';
      lines.push(`  [${status}] ${skill.name}`);
      if (skill.details?.path) {
        lines.push(`      路径: ${skill.details.path}`);
      }
    }
    return lines.join('\n');
  } else {
    const lines = ['依赖技能检查失败:', ''];
    for (const error of result.errors) {
      lines.push(`  - ${error}`);
    }
    lines.push('');
    lines.push('请先安装并配置所需的技能，然后再试。');
    return lines.join('\n');
  }
}
