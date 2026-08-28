import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FloatingToggle } from './FloatingToggle';

const toggleStyles = readFileSync(
  resolve(process.cwd(), 'src/content/floatingToggle.css'),
  'utf8',
);

describe('FloatingToggle', () => {
  const iconUrl = 'chrome-extension://onefeed/icons/icon-32.png';

  it('exposes the current enabled state as an accessible switch', () => {
    const markup = renderToStaticMarkup(
      <FloatingToggle enabled ready iconUrl={iconUrl} onToggle={vi.fn()} />,
    );

    expect(markup).toContain('role="switch"');
    expect(markup).toContain('aria-checked="true"');
    expect(markup).toContain(`src="${iconUrl}"`);
    expect(markup).not.toContain('<svg');
    expect(markup).toContain('关闭 OneFeed，显示原页面');
    expect(markup).toContain('OneFeed 已开启');
  });

  it('labels the action to resume OneFeed when disabled', () => {
    const markup = renderToStaticMarkup(
      <FloatingToggle enabled={false} ready iconUrl={iconUrl} onToggle={vi.fn()} />,
    );

    expect(markup).toContain('aria-checked="false"');
    expect(markup).toContain('开启 OneFeed 专注阅读');
    expect(markup).toContain('OneFeed 已暂停');
  });

  it('keeps the switch half-hidden until hover or keyboard focus', () => {
    expect(toggleStyles).toContain('transform: translateX(50%);');
    expect(toggleStyles).toMatch(
      /\.floating-toggle:hover,\s*\.floating-toggle:focus-within\s*{[^}]*transform: translateX\(0\);/,
    );
  });
});
