import type { PlatformId } from './platforms';
import { i18n } from '../i18n';

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
    scope: i18n.t('platform.zhihu.scope'),
    access: i18n.t('platform.zhihu.access'),
    accent: '#1677ff',
  },
  {
    id: 'twitter',
    scope: i18n.t('platform.twitter.scope'),
    access: i18n.t('platform.twitter.access'),
    accent: '#111111',
  },
  {
    id: 'v2ex',
    scope: i18n.t('platform.v2ex.scope'),
    access: i18n.t('platform.v2ex.access'),
    accent: '#77889a',
  },
  {
    id: 'linux-do',
    scope: i18n.t('platform.linuxDo.scope'),
    access: i18n.t('platform.linuxDo.access'),
    accent: '#0f8a6a',
  },
  {
    id: 'weibo',
    scope: i18n.t('platform.weibo.scope'),
    access: i18n.t('platform.weibo.access'),
    accent: '#ff8200',
  },
  {
    id: 'xiaohongshu',
    scope: i18n.t('platform.xiaohongshu.scope'),
    access: i18n.t('platform.xiaohongshu.access'),
    accent: '#ff2442',
  },
  {
    id: 'hacker-news',
    scope: i18n.t('platform.hackerNews.scope'),
    access: i18n.t('platform.hackerNews.access'),
    accent: '#ff6600',
  },
  {
    id: '36kr',
    scope: i18n.t('platform.thirtySixKr.scope'),
    access: i18n.t('platform.thirtySixKr.access'),
    accent: '#ff5a36',
  },
  {
    id: 'reddit',
    scope: i18n.t('platform.reddit.scope'),
    access: i18n.t('platform.reddit.access'),
    accent: '#ff4500',
  },
];

export function getPlatformPresentation(id: PlatformId): PlatformPresentation {
  const presentation = PLATFORM_PRESENTATIONS.find((item) => item.id === id);
  if (!presentation) throw new Error(`Missing platform presentation: ${id}`);
  return presentation;
}
