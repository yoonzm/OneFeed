import { describe, expect, it, vi } from 'vitest';
import {
  parseV2exCard,
  parseV2exCount,
  triggerV2exAction,
} from './v2ex';

describe('parseV2exCount', () => {
  it('parses plain and compact counts', () => {
    expect(parseV2exCount('1,234')).toBe(1234);
    expect(parseV2exCount('1.2K')).toBe(1200);
    expect(parseV2exCount('暂无')).toBe(0);
  });
});

describe('parseV2exCard', () => {
  it('normalizes a V2EX topic and sanitizes its metadata', () => {
    document.body.innerHTML = `
      <div class="cell item">
        <a href="/member/alice">
          <img class="avatar" src="https://cdn.v2ex.com/avatar/alice.png" alt="alice" />
        </a>
        <span class="item_title">
          <a class="topic-link" href="/t/123456#reply12">如何保持专注？</a>
        </span>
        <span class="topic_info">
          <div class="votes">3</div>
          <a class="node" href="/go/programmer">程序员</a> ·
          <strong><a href="/member/alice">Alice</a></strong> ·
          <span title="2026-08-06 11:42:50 +08:00">2 分钟前</span>
          <script>alert(1)</script>
        </span>
        <a class="count_livid" href="/t/123456#reply12">12</a>
      </div>`;

    const item = parseV2exCard(document.querySelector('.cell.item')!);

    expect(item).toMatchObject({
      id: 'v2ex_123456',
      platform: 'v2ex',
      kind: 'discussion',
      title: '如何保持专注？',
      author: {
        name: 'Alice',
        avatar: 'https://cdn.v2ex.com/avatar/alice.png',
      },
      context: { community: { name: '程序员' } },
      publishedAt: '2026-08-06 11:42:50 +08:00',
      metrics: [
        { kind: 'reactions', value: 3, label: '赞同' },
        { kind: 'replies', value: 12, label: '回复' },
      ],
    });
    expect(item?.originalUrl).toBe('http://localhost:3000/t/123456#reply12');
    expect(item?.previewBlocks).toEqual([]);
    expect(item).not.toHaveProperty('rawElementRef');
  });

  it('ignores non-topic cells', () => {
    document.body.innerHTML = '<div class="cell item">普通内容</div>';
    expect(parseV2exCard(document.querySelector('.cell.item')!)).toBeNull();
  });
});

describe('triggerV2exAction', () => {
  it('clicks a native vote control and falls back when no reply control exists', () => {
    document.body.innerHTML = `
      <div class="cell item">
        <div class="votes"><button type="button">赞同</button></div>
      </div>`;
    const vote = document.querySelector('button')!;
    const click = vi.spyOn(vote, 'click');
    const element = document.querySelector('.cell.item')!;

    expect(triggerV2exAction(element, 'react')).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    expect(triggerV2exAction(element, 'reply')).toBe(false);
  });
});
