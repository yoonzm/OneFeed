import type { ReactNode } from 'react';
import type { ColorScheme } from '../theme/useColorScheme';
import { useColorScheme } from '../theme/useColorScheme';
import { PlatformBar } from './components/PlatformBar';

interface OneFeedShellProps {
  activePlatformId: string;
  surface: 'feed' | 'article' | 'thread';
  scrollElement: HTMLElement;
  initialColorScheme?: ColorScheme;
  children: ReactNode;
}

export function OneFeedShell({
  activePlatformId,
  surface,
  scrollElement,
  initialColorScheme,
  children,
}: OneFeedShellProps) {
  const { colorScheme, ready, setColorScheme } = useColorScheme(initialColorScheme);

  return (
    <div
      className="min-h-full bg-onefeed-paper text-onefeed-ink transition-colors duration-200"
      data-onefeed-theme={colorScheme}
    >
      <PlatformBar
        activePlatformId={activePlatformId}
        surface={surface}
        scrollElement={scrollElement}
        colorScheme={colorScheme}
        themeReady={ready}
        onColorSchemeChange={setColorScheme}
      />
      {children}
    </div>
  );
}
