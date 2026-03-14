#!/usr/bin/env node
/**
 * 找屎 Skill - Minimal entry point
 * 
 * This skill follows the "prompt + minimal code" philosophy.
 * The SKILL.md provides detailed instructions to the agent,
 * which orchestrates the workflow by calling external skills.
 * 
 * This script provides minimal helper functions.
 */

const { execSync } = require('child_process');
const path = require('path');

/**
 * Score posts using the Python helper
 */
function scorePosts(posts) {
  const fs = require('fs');
  const tmpFile = `/tmp/shit_finder_input_${Date.now()}.json`;
  
  fs.writeFileSync(tmpFile, JSON.stringify({ posts }));
  
  try {
    const result = execSync(
      `python3 ${path.join(__dirname, 'shit_finder.py')} score -i ${tmpFile}`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    fs.unlinkSync(tmpFile);
    return JSON.parse(result);
  } catch (e) {
    fs.unlinkSync(tmpFile);
    throw e;
  }
}

/**
 * Format results using the Python helper
 */
function formatResults(results) {
  const fs = require('fs');
  const tmpFile = `/tmp/shit_finder_format_${Date.now()}.json`;
  
  fs.writeFileSync(tmpFile, JSON.stringify({ results }));
  
  try {
    const result = execSync(
      `python3 ${path.join(__dirname, 'shit_finder.py')} format -i ${tmpFile}`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    fs.unlinkSync(tmpFile);
    return result;
  } catch (e) {
    fs.unlinkSync(tmpFile);
    throw e;
  }
}

/**
 * Check if required skill is available
 */
function checkSkill(skillName) {
  const fs = require('fs');
  const home = process.env.HOME || '';
  
  const paths = {
    'reddit-readonly': [
      path.join(home, '.openclaw/workspace/skills/reddit-readonly/scripts/reddit-readonly.mjs'),
      path.join(home, '.claude/skills/reddit-readonly/scripts/reddit-readonly.mjs'),
    ],
    'xiaohongshu': [
      path.join(home, '.openclaw/workspace/skills/xiaohongshu/scripts/cli.py'),
      path.join(home, '.claude/skills/xiaohongshu-skills/scripts/cli.py'),
    ]
  };
  
  const skillPaths = paths[skillName] || [];
  for (const p of skillPaths) {
    if (fs.existsSync(p)) {
      return { available: true, path: p };
    }
  }
  
  return { available: false };
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
找屎 Skill (Shit Finder) - 弱智内容推荐

Usage:
  node index.js [command] [options]

Commands:
  score     Score posts for shitpost quality
  format    Format results for display
  check     Check if required skills are available

Options:
  --input, -i   Input JSON file
  --help, -h    Show help

Examples:
  node index.js score -i posts.json
  node index.js format -i results.json
  node index.js check
`);
    process.exit(0);
  }
  
  const command = args[0];
  
  if (command === 'check') {
    const reddit = checkSkill('reddit-readonly');
    const xhs = checkSkill('xiaohongshu');
    
    console.log('Skill availability:');
    console.log(`  reddit-readonly: ${reddit.available ? '✓' : '✗'} ${reddit.path || ''}`);
    console.log(`  xiaohongshu: ${xhs.available ? '✓' : '✗'} ${xhs.path || ''}`);
    
    process.exit(reddit.available ? 0 : 1);
  } else {
    // Delegate to Python script
    try {
      execSync(
        `python3 ${path.join(__dirname, 'shit_finder.py')} ${args.join(' ')}`,
        { stdio: 'inherit' }
      );
    } catch (e) {
      process.exit(1);
    }
  }
}

module.exports = {
  scorePosts,
  formatResults,
  checkSkill
};
