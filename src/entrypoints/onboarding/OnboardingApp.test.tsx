import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getSupportedPlatforms } from '../../config/platforms';
import { OnboardingApp } from './OnboardingApp';

describe('OnboardingApp', () => {
  it('explains installation, product purpose, usage and privacy', () => {
    const markup = renderToStaticMarkup(<OnboardingApp />);

    expect(markup).toContain('background-clip:text');
    expect(markup).toContain('OneFeed 已安装成功');
    expect(markup).toContain('让信息流回到');
    expect(markup).toContain('打开 Hacker News 立即体验');
    expect(markup).toContain('打开常用网站');
    expect(markup).toContain('随时切回原页');
    expect(markup).toContain('建议将 OneFeed 固定到工具栏');
    expect(markup).toContain('不上传浏览内容');
    expect(markup).toContain('提交反馈');
    expect(markup.match(/class="platform-icon"/g)).toHaveLength(8);
  });

  it('links every currently supported platform from the shared catalog', () => {
    const markup = renderToStaticMarkup(<OnboardingApp />);

    for (const platform of getSupportedPlatforms()) {
      expect(markup).toContain(`href="${platform.homeUrl}"`);
      expect(markup).toContain(`>${platform.name}<`);
    }
  });
});
