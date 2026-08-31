import { PLATFORM_PRESENTATIONS } from '../../config/platformPresentation';
import { getPlatformById, getPlatformDisplayName } from '../../config/platforms';
import { DiaTextReveal } from '../../components/DiaTextReveal';
import { PlatformIcon } from '../../components/PlatformIcon';
import { i18n } from '../../i18n';
import { useColorScheme } from '../../theme/useColorScheme';
import type { CSSProperties } from 'react';

const GITHUB_URL = 'https://github.com/yoonzm/OneFeed';
const ISSUE_URL = `${GITHUB_URL}/issues`;

const steps = [
  {
    number: '01',
    title: i18n.t('onboarding.stepOneTitle'),
    description: i18n.t('onboarding.stepOneDescription'),
  },
  {
    number: '02',
    title: i18n.t('onboarding.stepTwoTitle'),
    description: i18n.t('onboarding.stepTwoDescription'),
  },
  {
    number: '03',
    title: i18n.t('onboarding.stepThreeTitle'),
    description: i18n.t('onboarding.stepThreeDescription'),
  },
];

const features = [
  {
    title: i18n.t('onboarding.featureLayoutTitle'),
    description: i18n.t('onboarding.featureLayoutDescription'),
  },
  {
    title: i18n.t('onboarding.featureThemeTitle'),
    description: i18n.t('onboarding.featureThemeDescription'),
  },
  {
    title: i18n.t('onboarding.featureReadingTitle'),
    description: i18n.t('onboarding.featureReadingDescription'),
  },
  {
    title: i18n.t('onboarding.featureActionsTitle'),
    description: i18n.t('onboarding.featureActionsDescription'),
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
  const { colorScheme } = useColorScheme();

  return (
    <div className="onboarding-page" data-onefeed-theme={colorScheme}>
      <a className="skip-link" href="#main">{i18n.t('common.skipToMain')}</a>

      <header className="site-header">
        <a className="brand" href="#top" aria-label={i18n.t('onboarding.homeLabel')}>
          <img src="/icons/icon-128.png" alt="" />
          <DiaTextReveal text="OneFeed" />
        </a>
        <nav aria-label={i18n.t('onboarding.navigation')}>
          <a href="#start">{i18n.t('onboarding.howToUse')}</a>
          <a href="#platforms">{i18n.t('onboarding.supportedWebsites')}</a>
          <a href="#features">{i18n.t('onboarding.coreFeatures')}</a>
        </nav>
        <a className="header-link" href={GITHUB_URL} target="_blank" rel="noreferrer">
          GitHub
          <ExternalIcon />
        </a>
      </header>

      <main id="main">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="install-status"><span aria-hidden="true">✓</span> {i18n.t('onboarding.installed')}</p>
            <h1 id="hero-title">{i18n.t('onboarding.heroTitle')}</h1>
            <p className="hero-intro">{i18n.t('onboarding.heroIntro')}</p>
            <div className="hero-actions">
              <a className="primary-action" href={experienceUrl} target="_blank" rel="noreferrer">
                {i18n.t('onboarding.tryHackerNews')}
                <ArrowIcon />
              </a>
              <a className="text-action" href="#platforms">{i18n.t('onboarding.viewAllWebsites')}</a>
            </div>
            <p className="experience-note">{i18n.t('onboarding.experienceNote')}</p>
          </div>

          <div className="reader-preview" aria-label={i18n.t('onboarding.previewLabel')}>
            <div className="preview-margin" aria-hidden="true">
              <span>READ</span>
              <i><b /></i>
              <small>34%</small>
            </div>
            <div className="preview-sheet">
              <div className="preview-head">
                <strong>OneFeed</strong>
                <span><i /> {i18n.t('onboarding.previewFocused')}</span>
              </div>
              <article>
                <small>{i18n.t('onboarding.previewSourceZhihu')}</small>
                <h2>{i18n.t('onboarding.previewTitleOne')}</h2>
                <p>{i18n.t('onboarding.previewBodyOne')}</p>
                <footer><span>{i18n.t('onboarding.previewAgree')}</span><span>{i18n.t('onboarding.previewComments')}</span></footer>
              </article>
              <article>
                <small>{i18n.t('onboarding.previewSourceV2ex')}</small>
                <h2>{i18n.t('onboarding.previewTitleTwo')}</h2>
                <p>{i18n.t('onboarding.previewBodyTwo')}</p>
              </article>
            </div>
            <div className="preview-toggle">
              <span><strong>{i18n.t('onboarding.toggleEnabled')}</strong><small>{i18n.t('onboarding.toggleShowOriginal')}</small></span>
              <b aria-hidden="true"><i /></b>
            </div>
          </div>
        </section>

        <section className="section start-section" id="start" aria-labelledby="start-title">
          <div className="section-heading">
            <p>{i18n.t('onboarding.startEyebrow')}</p>
            <h2 id="start-title">{i18n.t('onboarding.startTitle')}</h2>
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
              <strong>{i18n.t('onboarding.pinTitle')}</strong>
              <p>{i18n.t('onboarding.pinDescription')}</p>
            </div>
          </aside>
        </section>

        <section className="section platform-section" id="platforms" aria-labelledby="platform-title">
          <div className="section-heading split-heading">
            <div>
              <p>{i18n.t('onboarding.supportedEyebrow')}</p>
              <h2 id="platform-title">{i18n.t('onboarding.supportedTitle')}</h2>
            </div>
            <p className="section-note">{i18n.t('onboarding.supportedNote')}</p>
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
                  <span className="platform-mark" aria-hidden="true">
                    <PlatformIcon platformId={intro.id} />
                  </span>
                  <span className="platform-copy">
                    <strong>{getPlatformDisplayName(intro.id)}</strong>
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
            <p>{i18n.t('onboarding.featuresEyebrow')}</p>
            <h2 id="feature-title">{i18n.t('onboarding.featuresTitle')}</h2>
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
              <p>{i18n.t('onboarding.controlEyebrow')}</p>
              <h3>{i18n.t('onboarding.controlTitle')}</h3>
              <div className="toggle-demo" aria-hidden="true">
                <span><b>{i18n.t('onboarding.toggleEnabled')}</b><small>{i18n.t('onboarding.toggleShowOriginal')}</small></span>
                <i><b /></i>
              </div>
              <p className="control-description">
                {i18n.t('onboarding.controlDescription')}
              </p>
            </aside>
          </div>
        </section>

        <section className="trust-section" aria-labelledby="trust-title">
          <p>{i18n.t('onboarding.trustEyebrow')}</p>
          <h2 id="trust-title">{i18n.t('onboarding.trustTitle')}</h2>
          <div className="trust-points">
            <span>{i18n.t('onboarding.trustLocal')}</span>
            <span>{i18n.t('onboarding.trustNoCredentials')}</span>
            <span>{i18n.t('onboarding.trustNoUploads')}</span>
            <span>{i18n.t('onboarding.trustNoAccount')}</span>
          </div>
          <p className="trust-detail">
            {i18n.t('onboarding.trustDescription')}
          </p>
        </section>

        <section className="closing-section" aria-labelledby="closing-title">
          <p>{i18n.t('onboarding.closingEyebrow')}</p>
          <h2 id="closing-title">{i18n.t('onboarding.closingTitle')}</h2>
          <a className="primary-action" href={experienceUrl} target="_blank" rel="noreferrer">
            {i18n.t('onboarding.tryHackerNews')}
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
          <p>{i18n.t('onboarding.tagline')}</p>
        </div>
        <nav aria-label={i18n.t('common.helpLinks')}>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">{i18n.t('onboarding.instructions')}</a>
          <a href={ISSUE_URL} target="_blank" rel="noreferrer">{i18n.t('onboarding.notWorking')}</a>
          <a href={ISSUE_URL} target="_blank" rel="noreferrer">{i18n.t('onboarding.submitFeedback')}</a>
        </nav>
      </footer>
    </div>
  );
}
