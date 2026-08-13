import type { PlatformId } from './platforms';

export interface PlatformPresentation {
  id: PlatformId;
  mark: string;
  scope: string;
  access: string;
  accent: string;
}

/** 启动中心与欢迎页共享平台展示信息，避免入口之间出现名称或视觉不一致。 */
export const PLATFORM_PRESENTATIONS: PlatformPresentation[] = [
  {
    id: 'zhihu',
    mark: '知',
    scope: '首页、热榜、问题与文章',
    access: '部分页面需登录',
    accent: '#1677ff',
  },
  {
    id: 'twitter',
    mark: 'X',
    scope: 'Home Feed',
    access: '需要平台账号',
    accent: '#18202b',
  },
  {
    id: 'v2ex',
    mark: 'V2',
    scope: '首页、最近主题与主题详情',
    access: '无需登录即可体验',
    accent: '#77889a',
  },
  {
    id: 'linux-do',
    mark: 'LD',
    scope: '话题列表与话题详情',
    access: '部分内容需登录',
    accent: '#0f8a6a',
  },
  {
    id: 'weibo',
    mark: '微',
    scope: '首页、关注与热门信息流',
    access: '需要平台账号',
    accent: '#e14a3b',
  },
  {
    id: 'xiaohongshu',
    mark: '红',
    scope: '发现页基础笔记 Feed',
    access: '部分内容需登录',
    accent: '#ff2442',
  },
  {
    id: 'hacker-news',
    mark: 'Y',
    scope: 'News、Newest、Ask、Show 与 Jobs',
    access: '无需登录即可体验',
    accent: '#ff6600',
  },
  {
    id: 'reddit',
    mark: 'R',
    scope: '首页与社区 Feed',
    access: '部分内容需登录',
    accent: '#ff4500',
  },
];

export function getPlatformPresentation(id: PlatformId): PlatformPresentation {
  const presentation = PLATFORM_PRESENTATIONS.find((item) => item.id === id);
  if (!presentation) throw new Error(`Missing platform presentation: ${id}`);
  return presentation;
}
