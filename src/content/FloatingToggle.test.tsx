import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FloatingToggle } from './FloatingToggle';

describe('FloatingToggle', () => {
  it('exposes the current enabled state as an accessible switch', () => {
    const markup = renderToStaticMarkup(
      <FloatingToggle enabled ready onToggle={vi.fn()} />,
    );

    expect(markup).toContain('role="switch"');
    expect(markup).toContain('aria-checked="true"');
    expect(markup).toContain('关闭 OneFeed，显示原页面');
    expect(markup).toContain('OneFeed 已开启');
  });

  it('labels the action to resume OneFeed when disabled', () => {
    const markup = renderToStaticMarkup(
      <FloatingToggle enabled={false} ready onToggle={vi.fn()} />,
    );

    expect(markup).toContain('aria-checked="false"');
    expect(markup).toContain('开启 OneFeed 专注阅读');
    expect(markup).toContain('OneFeed 已暂停');
  });
});
