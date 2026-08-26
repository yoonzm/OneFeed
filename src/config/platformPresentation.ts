import type { PlatformId } from './platforms';

export interface PlatformPresentation {
  id: PlatformId;
  scope: string;
  access: string;
  accent: string;
}

/** 启动中心与欢迎页共享平台展示信息，避免入口之间出现名称或视觉不一致。 */
export const PLATFORM_PRESENTATIONS: PlatformPresentation[] = [
  {
    id: 'zhihu',
    scope: '首页、热榜、问题与文章',
    access: '部分页面需登录',
    accent: '#1677ff',
  },
  {
    id: 'v2ex',
    scope: '首页分类、最近主题、VXNA 与主题详情',
    access: '无需登录即可体验',
    accent: '#77889a',
  },
  {
    id: 'linux-do',
    scope: '话题列表与话题详情',
    access: '部分内容需登录',
    accent: '#0f8a6a',
  },
  {
    id: 'hacker-news',
    scope: 'News、Newest、Ask、Show 与 Jobs',
    access: '无需登录即可体验',
    accent: '#ff6600',
  },
  {
    id: '36kr',
    scope: '资讯频道、文章列表与文章详情',
    access: '无需登录即可浏览',
    accent: '#ff5a36',
  },
];

export function getPlatformPresentation(id: PlatformId): PlatformPresentation {
  const presentation = PLATFORM_PRESENTATIONS.find((item) => item.id === id);
  if (!presentation) throw new Error(`Missing platform presentation: ${id}`);
  return presentation;
}
