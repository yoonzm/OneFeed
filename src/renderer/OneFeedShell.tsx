import type { ReactNode } from 'react';
import type { ColorScheme } from '../theme/useColorScheme';
import type { PlatformDefinition } from '../config/platforms';
import type { FeedChannel } from '../types/feed';
import { useColorScheme } from '../theme/useColorScheme';
import { PlatformBar } from './components/PlatformBar';

interface OneFeedShellProps {
  activePlatformId: string;
  channels?: readonly FeedChannel[];
  platforms?: readonly PlatformDefinition[];
  onFeedChannelSelect?: (channelId: string) => boolean;
  surface: 'feed' | 'article' | 'thread';
  scrollElement: HTMLElement;
  initialColorScheme?: ColorScheme;
  hiddenItemCount?: number;
  initialSearchQuery?: string;
  onSearch?: (query: string) => boolean;
  children: ReactNode;
}

export function OneFeedShell({
  activePlatformId,
  channels = [],
  platforms,
  onFeedChannelSelect,
  surface,
  scrollElement,
  initialColorScheme,
  hiddenItemCount = 0,
  initialSearchQuery,
  onSearch,
  children,
}: OneFeedShellProps) {
  const { colorScheme, ready, setColorScheme } = useColorScheme(initialColorScheme);

  return (
    <div
      className="min-h-full bg-onefeed-paper text-onefeed-ink transition-colors duration-200"
      data-onefeed-theme={colorScheme}
    >
      {surface === 'feed' && (
        <PlatformBar
          activePlatformId={activePlatformId}
          channels={channels}
          platforms={platforms}
          onFeedChannelSelect={onFeedChannelSelect}
          surface={surface}
          scrollElement={scrollElement}
          colorScheme={colorScheme}
          themeReady={ready}
          hiddenItemCount={hiddenItemCount}
          initialSearchQuery={initialSearchQuery}
          onColorSchemeChange={setColorScheme}
          onSearch={onSearch}
        />
      )}
      {children}
    </div>
  );
}
