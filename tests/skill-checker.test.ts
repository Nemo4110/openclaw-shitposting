import { describe, it, expect } from 'vitest';
import { formatSkillCheckResult } from '../src/utils/skill-checker.js';

describe('formatSkillCheckResult', () => {
  it('应该格式化所有技能可用的结果', () => {
    const result = {
      allAvailable: true,
      skills: [
        { name: 'reddit-readonly', available: true, details: { path: '/path/to/reddit' } },
      ],
      errors: [],
    };

    const message = formatSkillCheckResult(result);

    expect(message).toContain('依赖技能检查通过');
    expect(message).toContain('[可用] reddit-readonly');
  });

  it('应该格式化技能不可用的结果', () => {
    const result = {
      allAvailable: false,
      skills: [
        { name: 'reddit-readonly', available: false, error: '未找到技能' },
      ],
      errors: ['未找到 reddit-readonly 技能'],
    };

    const message = formatSkillCheckResult(result);

    expect(message).toContain('依赖技能检查失败');
    expect(message).toContain('未找到 reddit-readonly 技能');
  });
});
