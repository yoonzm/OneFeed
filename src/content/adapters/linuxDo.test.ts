import { describe, expect, it, vi } from 'vitest';
import type { FeedItem } from '../../types/feed';
import {
  parseLinuxDoCard,
  parseLinuxDoCount,
  triggerLinuxDoAction,
} from './linuxDo';

describe('parseLinuxDoCount', () => {
  it('parses plain and compact Discourse counts', () => {
    expect(parseLinuxDoCount('1,234')).toBe(1234);
    expect(parseLinuxDoCount('4.5k')).toBe(4500);
    expect(parseLinuxDoCount('暂无')).toBe(0);
  });
});

describe('parseLinuxDoCard', () => {
  it('normalizes a Linux DO topic and sanitizes its summary', () => {
    document.body.innerHTML = `
      <table>
        <tbody>
          <tr class="topic-list-item" data-topic-id="2703711">
            <td class="main-link topic-list-data">
              <a class="title raw-link raw-topic-link" href="/t/topic/2703711">
                这个冷饭是必须得炒一下了
              </a>
              <div class="link-bottom-line">
                <a href="/c/feedback/2" class="badge-category">运营反馈</a>
                <a href="/tag/notice" class="discourse-tag">公告</a>
                <script>alert(1)</script>
              </div>
            </td>
            <td class="posters topic-list-data">
              <a href="/u/neo" data-user-card="neo">
                <img class="avatar" src="https://cdn.ldstatic.com/avatar.png" title="Neo - 原始发帖人" />
              </a>
            </td>
            <td class="num posts topic-list-data"><span class="number">1.2k</span></td>
            <td class="num views topic-list-data"><span class="number">19.6k</span></td>
            <td class="activity num topic-list-data age">
              <span class="relative-date" data-time="1785985633365">42 分钟</span>
            </td>
          </tr>
        </tbody>
      </table>`;

    const item = parseLinuxDoCard(document.querySelector('.topic-list-item')!);

    expect(item).toMatchObject({
      id: 'linux-do_2703711',
      platform: 'linux-do',
      title: '这个冷饭是必须得炒一下了',
      author: {
        name: 'Neo',
        avatar: 'https://cdn.ldstatic.com/avatar.png',
      },
      createdAt: 1785985633365,
      stats: { likes: 0, comments: 1200 },
    });
    expect(item?.originalUrl).toBe('http://localhost:3000/t/topic/2703711');
    expect(item?.contentHtml).toContain('运营反馈');
    expect(item?.contentHtml).toContain('19.6k 次浏览');
    expect(item?.contentHtml).not.toContain('script');
    expect(item?.contentHtml).not.toContain('class=');
  });

  it('ignores rows without a topic title', () => {
    document.body.innerHTML = `
      <table><tbody><tr class="topic-list-item"><td>普通内容</td></tr></tbody></table>`;
    expect(parseLinuxDoCard(document.querySelector('.topic-list-item')!)).toBeNull();
  });
});

describe('triggerLinuxDoAction', () => {
  it('clicks a native like control and falls back when no reply control exists', () => {
    document.body.innerHTML = `
      <div class="topic-list-item">
        <button type="button" aria-label="点赞此话题">点赞</button>
      </div>`;
    const button = document.querySelector('button')!;
    const click = vi.spyOn(button, 'click');
    const item = { rawElementRef: document.querySelector('.topic-list-item')! } as FeedItem;

    expect(triggerLinuxDoAction(item, 'like')).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    expect(triggerLinuxDoAction(item, 'comment')).toBe(false);
  });
});
