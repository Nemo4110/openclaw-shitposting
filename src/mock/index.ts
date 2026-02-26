/**
 * Mock 模块入口
 * 用于 MOCK_MODE 下测试功能
 */

export { MockRedditClient, MockRedditFetcher } from './reddit-client.js';
export { MockTelegramPusher } from './telegram-client.js';
export { mockRedditPosts, getMockPosts, getMockPostsBySubreddit } from './data.js';
