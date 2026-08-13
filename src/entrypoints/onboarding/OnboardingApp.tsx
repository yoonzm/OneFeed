import { PLATFORM_PRESENTATIONS } from '../../config/platformPresentation';
import { getPlatformById } from '../../config/platforms';
import type { CSSProperties } from 'react';

const GITHUB_URL = 'https://github.com/yoonzm/OneFeed';
const ISSUE_URL = `${GITHUB_URL}/issues`;

const steps = [
  {
    number: '01',
    title: '打开常用网站',
    description: '进入下方任一受支持的信息流页面，不需要另外启动 OneFeed。',
  },
  {
    number: '02',
    title: '开始专注阅读',
    description: 'OneFeed 会自动整理内容，保留阅读、滚动和必要互动。',
  },
  {
    number: '03',
    title: '随时切回原页',
    description: '点击页面右侧开关，或在启动中心关闭总开关，即刻暂停接管。',
  },
];

const features = [
  {
    title: '统一排版',
    description: '不同平台的标题、正文、图片与互动信息，使用同一套清晰结构呈现。',
  },
  {
    title: 'Focus Paper',
    description: '克制的阅读主题减少页面噪音，并支持浅色与深色外观。',
  },
  {
    title: '连续阅读',
    description: '保留无限滚动与分页加载，不必为了安静的界面牺牲浏览效率。',
  },
  {
    title: '原站互动',
    description: '赞同、评论等操作会代理到原网站；无法可靠代理时会带你返回原文。',
  },
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M8 5h-3v10h10v-3M11 4h5v5M9 11l7-7" />
    </svg>
  );
}

export function OnboardingApp() {
  const experienceUrl = getPlatformById('hacker-news')!.homeUrl;

  return (
    <div className="onboarding-page">
      <a className="skip-link" href="#main">跳到主要内容</a>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="OneFeed 欢迎页首页">
          <img src="/icons/icon-128.png" alt="" />
          <span>OneFeed</span>
        </a>
        <nav aria-label="欢迎页导航">
          <a href="#start">如何使用</a>
          <a href="#platforms">支持网站</a>
          <a href="#features">核心功能</a>
        </nav>
        <a className="header-link" href={GITHUB_URL} target="_blank" rel="noreferrer">
          GitHub
          <ExternalIcon />
        </a>
      </header>

      <main id="main">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="install-status"><span aria-hidden="true">✓</span> OneFeed 已安装成功</p>
            <h1 id="hero-title">让信息流回到<br />阅读本身。</h1>
            <p className="hero-intro">
              OneFeed 把不同网站重新排成统一、安静、由你控制的阅读界面。
              内容仍来自原来的平台，阅读体验从此由你决定。
            </p>
            <div className="hero-actions">
              <a className="primary-action" href={experienceUrl} target="_blank" rel="noreferrer">
                打开 Hacker News 立即体验
                <ArrowIcon />
              </a>
              <a className="text-action" href="#platforms">查看全部支持网站</a>
            </div>
            <p className="experience-note">无需登录 · 新标签页打开后自动生效</p>
          </div>

          <div className="reader-preview" aria-label="OneFeed 将多个网站整理为统一阅读界面的示意">
            <div className="preview-margin" aria-hidden="true">
              <span>READ</span>
              <i><b /></i>
              <small>34%</small>
            </div>
            <div className="preview-sheet">
              <div className="preview-head">
                <strong>OneFeed</strong>
                <span><i /> 正在专注阅读</span>
              </div>
              <article>
                <small>01 · 来自知乎</small>
                <h2>把真正重要的内容留下</h2>
                <p>统一的排版，清晰的层级，以及不打扰阅读的必要操作。</p>
                <footer><span>赞同 1280</span><span>评论 86</span></footer>
              </article>
              <article>
                <small>02 · 来自 V2EX</small>
                <h2>一个更安静的信息流</h2>
                <p>保留内容，也保留随时返回原页面的选择。</p>
              </article>
            </div>
            <div className="preview-toggle">
              <span><strong>OneFeed 已开启</strong><small>点击显示原页面</small></span>
              <b aria-hidden="true"><i /></b>
            </div>
          </div>
        </section>

        <section className="section start-section" id="start" aria-labelledby="start-title">
          <div className="section-heading">
            <p>开始使用</p>
            <h2 id="start-title">不用学习新的操作。</h2>
          </div>
          <ol className="steps">
            {steps.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
          <aside className="pin-note">
            <div className="toolbar-illustration" aria-hidden="true">
              <span>⌄</span>
              <b><img src="/icons/icon-32.png" alt="" /></b>
              <i>⋮</i>
            </div>
            <div>
              <strong>建议将 OneFeed 固定到工具栏</strong>
              <p>打开 Chrome 的扩展菜单，找到 OneFeed 并点击固定。之后点图标即可打开启动中心。</p>
            </div>
          </aside>
        </section>

        <section className="section platform-section" id="platforms" aria-labelledby="platform-title">
          <div className="section-heading split-heading">
            <div>
              <p>当前支持</p>
              <h2 id="platform-title">从你熟悉的网站开始。</h2>
            </div>
            <p className="section-note">点击任一网站即可前往；OneFeed 只在已适配的页面上接管界面。</p>
          </div>
          <div className="platform-grid">
            {PLATFORM_PRESENTATIONS.map((intro) => {
              const platform = getPlatformById(intro.id)!;
              return (
                <a
                  className="platform-card"
                  key={intro.id}
                  href={platform.homeUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ '--platform-accent': intro.accent } as CSSProperties}
                >
                  <span className="platform-mark" aria-hidden="true">{intro.mark}</span>
                  <span className="platform-copy">
                    <strong>{platform.name}</strong>
                    <small>{intro.scope}</small>
                    <em>{intro.access}</em>
                  </span>
                  <ExternalIcon />
                </a>
              );
            })}
          </div>
        </section>

        <section className="section feature-section" id="features" aria-labelledby="feature-title">
          <div className="section-heading">
            <p>核心功能</p>
            <h2 id="feature-title">少一点界面，多一点内容。</h2>
          </div>
          <div className="feature-layout">
            <div className="feature-list">
              {features.map((feature, index) => (
                <article key={feature.title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </article>
              ))}
            </div>
            <aside className="control-note">
              <p>随时由你控制</p>
              <h3>想看原页面，只需一次点击。</h3>
              <div className="toggle-demo" aria-hidden="true">
                <span><b>OneFeed 已开启</b><small>点击显示原页面</small></span>
                <i><b /></i>
              </div>
              <p className="control-description">
                页面右侧悬浮开关与启动中心总开关使用同一状态。暂停后，原页面会立即恢复。
              </p>
            </aside>
          </div>
        </section>

        <section className="trust-section" aria-labelledby="trust-title">
          <p>放心使用</p>
          <h2 id="trust-title">你的阅读，只留在你的浏览器里。</h2>
          <div className="trust-points">
            <span>本地解析与排版</span>
            <span>不收集平台账号密码</span>
            <span>不上传浏览内容</span>
            <span>不需要 OneFeed 账号</span>
          </div>
          <p className="trust-detail">
            OneFeed 仅在你打开受支持页面时读取页面内容，用于生成统一阅读界面。
          </p>
        </section>

        <section className="closing-section" aria-labelledby="closing-title">
          <p>准备好了</p>
          <h2 id="closing-title">从下一条信息流开始，<br />读得更专注一点。</h2>
          <a className="primary-action" href={experienceUrl} target="_blank" rel="noreferrer">
            打开 Hacker News 立即体验
            <ArrowIcon />
          </a>
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <a className="brand footer-brand" href="#top">
            <img src="/icons/icon-128.png" alt="" />
            <span>OneFeed</span>
          </a>
          <p>统一信息流 · 专注阅读</p>
        </div>
        <nav aria-label="帮助链接">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">使用说明</a>
          <a href={ISSUE_URL} target="_blank" rel="noreferrer">没有生效？</a>
          <a href={ISSUE_URL} target="_blank" rel="noreferrer">提交反馈</a>
        </nav>
      </footer>
    </div>
  );
}
