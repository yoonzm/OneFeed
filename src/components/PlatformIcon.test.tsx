import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PLATFORM_CATALOG } from '../config/platforms';
import { PlatformIcon } from './PlatformIcon';

describe('PlatformIcon', () => {
  it.each(PLATFORM_CATALOG)('uses a bundled brand asset for $name', (platform) => {
    const markup = renderToStaticMarkup(<PlatformIcon platformId={platform.id} />);

    expect(markup).toContain(`src="/platform-icons/${platform.id}.svg"`);
    expect(markup).toContain(`data-platform-icon="${platform.id}"`);
    expect(markup).toContain('aria-hidden="true"');
  });
});
