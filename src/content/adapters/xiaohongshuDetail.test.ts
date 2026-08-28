import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  findXiaohongshuDetailRoot,
  isXiaohongshuDetailUrl,
  parseXiaohongshuDetail,
  triggerXiaohongshuDetailAction,
  XiaohongshuDetailAdapter,
} from './xiaohongshuDetail';

const NOTE_ID = '65b0cafe000000001a02beef';
const OTHER_NOTE_ID = '65b0cafe000000001a02be00';

interface DetailFixtureOptions {
  noteId?: string;
  canonicalId?: string;
  type?: 'normal' | 'video';
}

function renderDetail({
  noteId = NOTE_ID,
  canonicalId = noteId,
  type = 'normal',
}: DetailFixtureOptions = {}): Element {
  const imageList = type === 'video'
    ? [{
        urlDefault: 'http://sns-webpic-qc.xhscdn.com/video-cover.webp',
        width: 1080,
        height: 1920,
      }]
    : [
        {
          urlDefault: 'http://sns-webpic-qc.xhscdn.com/gallery-1.webp',
          width: 1200,
          height: 1600,
        },
        {
          infoList: [{ imageScene: 'WB_DFT', url: 'http://sns-webpic-qc.xhscdn.com/gallery-2.webp' }],
          width: 1600,
          height: 1200,
        },
      ];
  const state = {
    global: { optionalValue: null },
    note: {
      currentNoteId: noteId,
      noteDetailMap: {
        [noteId]: {
          note: {
            noteId,
            title: '周末散步清单',
            desc: '页面尚未挂载时的正文 #周末[话题]#',
            type,
            time: 1_775_000_000_000,
            lastUpdateTime: 1_775_000_100_000,
            imageList,
            interactInfo: {
              liked: true,
              likedCount: '1.2万',
              collected: false,
              collectedCount: '18',
              commentCount: '42',
            },
            user: {
              userId: 'reader-id',
              nickname: '阅读者',
              avatar: 'https://sns-avatar-qc.xhscdn.com/avatar.webp',
            },
            video: { capa: { duration: 65 } },
          },
        },
      },
    },
  };
  const serializedState = JSON.stringify(state)
    .replace('"optionalValue":null', '"optionalValue":undefined');

  document.head.innerHTML = `
    <link rel="canonical" href="https://www.xiaohongshu.com/explore/${canonicalId}" />
    <meta property="og:url" content="https://www.xiaohongshu.com/explore/${canonicalId}" />
    <meta property="og:type" content="${type === 'video' ? 'video.other' : 'article'}" />
    <meta property="og:image" content="http://sns-webpic-qc.xhscdn.com/meta-cover.webp" />
    <meta property="og:xhs:note_like" content="12000" />
    <meta property="og:xhs:note_collect" content="18" />
    <meta property="og:xhs:note_comment" content="42" />
    ${type === 'video' ? `
      <meta property="og:video" content="https://sns-video-qc.xhscdn.com/detail.mp4" />
      <meta property="og:videotime" content="01:05" />
    ` : ''}
    <script>window.__INITIAL_STATE__=${serializedState}</script>`;
  document.body.innerHTML = `
    <div id="noteContainer" class="note-container" data-type="${type}">
      <div class="media-container">
        ${type === 'video'
          ? '<video src="blob:https://www.xiaohongshu.com/local-video"></video>'
          : '<div class="note-slider-img"><img src="https://sns-webpic-qc.xhscdn.com/gallery-1.webp" /></div>'}
      </div>
      <div class="interaction-container">
        <div class="author-container">
          <a class="name" href="/user/profile/reader-id"><span class="username">阅读者</span></a>
          <img class="avatar-item" src="https://sns-avatar-qc.xhscdn.com/avatar.webp" />
        </div>
        <div class="note-content">
          <h1 id="detail-title">周末散步清单</h1>
          <div id="detail-desc">
            <span class="note-text">完整正文 <a class="tag" href="/search_result?keyword=weekend">#周末</a></span>
          </div>
          <div class="bottom-container"><span class="date">03-31</span></div>
        </div>
        <div class="engage-bar-container">
          <span class="like-wrapper"><span class="count">1.3万</span></span>
          <span class="collect-wrapper"><span class="count">18</span></span>
          <span class="chat-wrapper"><span class="count">42</span></span>
        </div>
      </div>
    </div>`;
  return document.querySelector('#noteContainer')!;
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  window.history.replaceState({}, '', '/');
});

describe('isXiaohongshuDetailUrl', () => {
  it('matches canonical note routes without taking over lookalike paths or hosts', () => {
    expect(isXiaohongshuDetailUrl(
      new URL(`https://www.xiaohongshu.com/explore/${NOTE_ID}?xsec_token=test`),
    )).toBe(true);
    expect(isXiaohongshuDetailUrl(
      new URL(`https://xiaohongshu.com/explore/${NOTE_ID}/`),
    )).toBe(true);
    expect(isXiaohongshuDetailUrl(
      new URL('https://www.xiaohongshu.com/explore/not-a-note'),
    )).toBe(false);
    expect(isXiaohongshuDetailUrl(
      new URL(`https://xiaohongshu.com.example.com/explore/${NOTE_ID}`),
    )).toBe(false);
  });
});

describe('Xiaohongshu note detail', () => {
  it('normalizes complete rich text, gallery, metadata, and native actions', () => {
    const element = renderDetail();
    const detail = parseXiaohongshuDetail(
      element,
      new URL(`https://www.xiaohongshu.com/explore/${NOTE_ID}?xsec_token=test`),
    );

    expect(detail).toMatchObject({
      id: `xiaohongshu_${NOTE_ID}`,
      platform: 'xiaohongshu',
      source: { id: 'xiaohongshu', name: '小红书' },
      originalUrl: `https://www.xiaohongshu.com/explore/${NOTE_ID}?xsec_token=test`,
      kind: 'article',
      role: 'post',
      title: '周末散步清单',
      author: {
        name: '阅读者',
        avatar: 'https://sns-avatar-qc.xhscdn.com/avatar.webp',
        link: 'https://www.xiaohongshu.com/user/profile/reader-id',
      },
      publishedAt: 1_775_000_000_000,
      updatedAt: 1_775_000_100_000,
      actionSlots: {
        footer: {
          metrics: [
            { kind: 'reactions', value: 13000 },
            { kind: 'replies', value: 42 },
          ],
          actions: [
            { id: 'react', count: 13000, active: true, enabled: true },
            { id: 'bookmark', count: 18, active: false, enabled: true },
          ],
        },
      },
    });
    expect(detail?.body[0]).toMatchObject({
      type: 'richText',
      html: expect.stringContaining(
        'href="https://www.xiaohongshu.com/search_result?keyword=weekend"',
      ),
      plainText: '完整正文 #周末',
    });
    expect(detail?.body[1]).toEqual({
      type: 'gallery',
      items: [
        {
          url: 'https://sns-webpic-qc.xhscdn.com/gallery-1.webp',
          alt: '周末散步清单',
          width: 1200,
          height: 1600,
          aspectRatio: 0.75,
        },
        {
          url: 'https://sns-webpic-qc.xhscdn.com/gallery-2.webp',
          alt: '周末散步清单',
          width: 1600,
          height: 1200,
          aspectRatio: 4 / 3,
        },
      ],
    });
  });

  it('uses the direct video metadata instead of the page-local blob URL', () => {
    const detail = parseXiaohongshuDetail(
      renderDetail({ type: 'video' }),
      new URL(`https://www.xiaohongshu.com/explore/${NOTE_ID}`),
    );

    expect(detail?.body[1]).toEqual({
      type: 'video',
      media: {
        poster: 'https://sns-webpic-qc.xhscdn.com/video-cover.webp',
        url: 'https://sns-video-qc.xhscdn.com/detail.mp4',
        alt: '周末散步清单',
        durationSeconds: 65,
        aspectRatio: 0.5625,
      },
    });
  });

  it('rejects stale detail DOM from a different SPA route', () => {
    renderDetail({ noteId: OTHER_NOTE_ID, canonicalId: OTHER_NOTE_ID });

    expect(findXiaohongshuDetailRoot(
      document,
      new URL(`https://www.xiaohongshu.com/explore/${NOTE_ID}`),
    )).toBeNull();
  });

  it('publishes the active note and proxies likes and bookmarks for that note only', () => {
    const element = renderDetail();
    window.history.replaceState({}, '', `/explore/${NOTE_ID}`);
    const like = element.querySelector<HTMLElement>('.like-wrapper')!;
    const collect = element.querySelector<HTMLElement>('.collect-wrapper')!;
    const likeClick = vi.spyOn(like, 'click').mockImplementation(() => undefined);
    const collectClick = vi.spyOn(collect, 'click').mockImplementation(() => undefined);
    const onDetail = vi.fn();
    const adapter = new XiaohongshuDetailAdapter(onDetail);

    adapter.init();

    expect(onDetail).toHaveBeenCalledOnce();
    expect(onDetail.mock.lastCall?.[0]).toMatchObject({ id: `xiaohongshu_${NOTE_ID}` });
    expect(adapter.triggerAction(`xiaohongshu_${NOTE_ID}`, 'react')).toBe(true);
    expect(adapter.triggerAction(`xiaohongshu_${NOTE_ID}`, 'bookmark')).toBe(true);
    expect(likeClick).toHaveBeenCalledOnce();
    expect(collectClick).toHaveBeenCalledOnce();
    expect(adapter.triggerAction('xiaohongshu_other', 'react')).toBe(false);
    expect(triggerXiaohongshuDetailAction(element, 'share')).toBe(false);
    adapter.disconnect();
  });
});
