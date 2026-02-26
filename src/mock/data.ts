/**
 * Mock 数据
 * 用于 MOCK_MODE 下测试功能，无需配置 Reddit API 和 Telegram Bot
 */

import type { RedditPost } from '../types/index.js';

/**
 * 模拟的 Reddit 帖子数据
 */
export const mockRedditPosts: RedditPost[] = [
  {
    id: 'mock1',
    title: 'WTF is this bruh??? My CPU literally burned 🔥',
    content: '[图片]',
    url: 'https://i.redd.it/mock1.jpg',
    permalink: '/r/shitposting/comments/mock1/wtf_is_this/',
    author: 'MockUser1',
    subreddit: 'shitposting',
    upvotes: 15420,
    upvoteRatio: 0.94,
    commentCount: 892,
    isVideo: false,
    mediaUrl: 'https://i.redd.it/mock1.jpg',
    createdUtc: Date.now() / 1000 - 3600,
  },
  {
    id: 'mock2',
    title: 'Nobody: / Me: posting this at 3am',
    content: '[图片]',
    url: 'https://i.redd.it/mock2.png',
    permalink: '/r/okbuddyretard/comments/mock2/nobody_me/',
    author: 'MockUser2',
    subreddit: 'okbuddyretard',
    upvotes: 8750,
    upvoteRatio: 0.88,
    commentCount: 456,
    isVideo: false,
    mediaUrl: 'https://i.redd.it/mock2.png',
    createdUtc: Date.now() / 1000 - 7200,
  },
  {
    id: 'mock3',
    title: 'When you realize the joke 5 years later...',
    content: '[视频]',
    url: 'https://v.redd.it/mock3.mp4',
    permalink: '/r/comedyheaven/comments/mock3/when_you_realize/',
    author: 'MockUser3',
    subreddit: 'comedyheaven',
    upvotes: 23100,
    upvoteRatio: 0.96,
    commentCount: 1234,
    isVideo: true,
    mediaUrl: 'https://v.redd.it/mock3.mp4',
    createdUtc: Date.now() / 1000 - 10800,
  },
  {
    id: 'mock4',
    title: 'Is this loss??????',
    content: '[图片]',
    url: 'https://i.redd.it/mock4.gif',
    permalink: '/r/terriblefacebookmemes/comments/mock4/is_this_loss/',
    author: 'MockUser4',
    subreddit: 'terriblefacebookmemes',
    upvotes: 4200,
    upvoteRatio: 0.72,
    commentCount: 567,
    isVideo: false,
    mediaUrl: 'https://i.redd.it/mock4.gif',
    createdUtc: Date.now() / 1000 - 14400,
  },
  {
    id: 'mock5',
    title: '离谱！这绝对是今年最脑残的设计了',
    content: '我真的服了，这是什么天才想出来的设计...',
    url: 'https://www.reddit.com/r/facepalm/comments/mock5/离谱设计/',
    permalink: '/r/facepalm/comments/mock5/离谱设计/',
    author: 'MockUser5',
    subreddit: 'facepalm',
    upvotes: 18900,
    upvoteRatio: 0.91,
    commentCount: 2100,
    isVideo: false,
    mediaUrl: null,
    createdUtc: Date.now() / 1000 - 18000,
  },
  {
    id: 'mock6',
    title: 'Bruh moment compilation #69',
    content: '[视频]',
    url: 'https://v.redd.it/mock6.webm',
    permalink: '/r/cringetopia/comments/mock6/bruh_moment/',
    author: 'MockUser6',
    subreddit: 'cringetopia',
    upvotes: 6700,
    upvoteRatio: 0.85,
    commentCount: 345,
    isVideo: true,
    mediaUrl: 'https://v.redd.it/mock6.webm',
    createdUtc: Date.now() / 1000 - 21600,
  },
  {
    id: 'mock7',
    title: 'Average shitposter vs Enjoyer',
    content: '[图片]',
    url: 'https://i.redd.it/mock7.jpg',
    permalink: '/r/shitposting/comments/mock7/average_vs_enjoyer/',
    author: 'MockUser7',
    subreddit: 'shitposting',
    upvotes: 45600,
    upvoteRatio: 0.97,
    commentCount: 1567,
    isVideo: false,
    mediaUrl: 'https://i.redd.it/mock7.jpg',
    createdUtc: Date.now() / 1000 - 25200,
  },
  {
    id: 'mock8',
    title: 'THIS IS FINE. EVERYTHING IS FINE.',
    content: '[图片集]',
    url: 'https://www.reddit.com/gallery/mock8',
    permalink: '/r/wtf/comments/mock8/this_is_fine/',
    author: 'MockUser8',
    subreddit: 'wtf',
    upvotes: 32100,
    upvoteRatio: 0.93,
    commentCount: 2890,
    isVideo: false,
    mediaUrl: 'https://i.redd.it/mock8_1.jpg',
    createdUtc: Date.now() / 1000 - 28800,
  },
  {
    id: 'mock9',
    title: 'I am literally shaking and crying rn',
    content: '你们能理解我现在的心情吗？简直绝了...',
    url: 'https://www.reddit.com/r/okbuddyretard/comments/mock9/shaking_crying/',
    permalink: '/r/okbuddyretard/comments/mock9/shaking_crying/',
    author: 'MockUser9',
    subreddit: 'okbuddyretard',
    upvotes: 5600,
    upvoteRatio: 0.78,
    commentCount: 234,
    isVideo: false,
    mediaUrl: null,
    createdUtc: Date.now() / 1000 - 32400,
  },
  {
    id: 'mock10',
    title: 'UPVOTE IF YOU AGREE!!!1!11!',
    content: '[图片]',
    url: 'https://i.redd.it/mock10.jpg',
    permalink: '/r/shitposting/comments/mock10/upvote_if_agree/',
    author: 'MockUser10',
    subreddit: 'shitposting',
    upvotes: 1234,
    upvoteRatio: 0.45,
    commentCount: 890,
    isVideo: false,
    mediaUrl: 'https://i.redd.it/mock10.jpg',
    createdUtc: Date.now() / 1000 - 36000,
  },
];

/**
 * 根据限制获取 mock 帖子
 */
export function getMockPosts(limit: number = 10): RedditPost[] {
  // 复制一份数据，避免修改原始数据
  const posts = [...mockRedditPosts];
  
  // 随机打乱顺序，模拟不同运行结果
  for (let i = posts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [posts[i], posts[j]] = [posts[j], posts[i]];
  }
  
  return posts.slice(0, Math.min(limit, posts.length));
}

/**
 * 获取指定 subreddit 的 mock 帖子
 */
export function getMockPostsBySubreddit(
  subreddits: string[],
  limitPerSub: number = 10
): RedditPost[] {
  const results: RedditPost[] = [];
  
  for (const subreddit of subreddits) {
    const subPosts = mockRedditPosts.filter(
      post => post.subreddit.toLowerCase() === subreddit.toLowerCase()
    );
    
    if (subPosts.length === 0) {
      // 如果没有匹配的，生成一些该 subreddit 的 mock 数据
      results.push(...generateMockPostsForSubreddit(subreddit, limitPerSub));
    } else {
      results.push(...subPosts.slice(0, limitPerSub));
    }
  }
  
  // 按点赞数排序
  results.sort((a, b) => b.upvotes - a.upvotes);
  
  return results;
}

/**
 * 为指定 subreddit 生成 mock 数据
 */
function generateMockPostsForSubreddit(
  subreddit: string,
  count: number
): RedditPost[] {
  const templates = [
    { title: 'Just a normal day in SUBREDDIT', content: '[图片]' },
    { title: 'WTF is going on here???', content: '[图片]' },
    { title: 'Bruh moment #RANDOM', content: '[视频]' },
    { title: 'This belongs here', content: '[图片]' },
    { title: 'Can we appreciate this?', content: 'Some text content here...' },
  ];
  
  const posts: RedditPost[] = [];
  
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    const randomId = Math.random().toString(36).substring(2, 8);
    
    posts.push({
      id: `mock_${subreddit}_${randomId}`,
      title: template.title
        .replace('SUBREDDIT', subreddit)
        .replace('RANDOM', Math.floor(Math.random() * 1000).toString()),
      content: template.content,
      url: `https://i.redd.it/mock_${randomId}.jpg`,
      permalink: `/r/${subreddit}/comments/mock_${randomId}/post/`,
      author: `MockUser_${randomId}`,
      subreddit,
      upvotes: Math.floor(Math.random() * 50000) + 1000,
      upvoteRatio: 0.7 + Math.random() * 0.25,
      commentCount: Math.floor(Math.random() * 2000) + 100,
      isVideo: template.content === '[视频]',
      mediaUrl: template.content.includes('图片') || template.content.includes('视频')
        ? `https://i.redd.it/mock_${randomId}.jpg`
        : null,
      createdUtc: Date.now() / 1000 - Math.floor(Math.random() * 86400),
    });
  }
  
  return posts;
}
