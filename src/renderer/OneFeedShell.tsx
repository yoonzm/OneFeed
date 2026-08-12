import type { ReactNode } from 'react';
import { PlatformBar } from './components/PlatformBar';

interface OneFeedShellProps {
  activePlatformId: string;
  surface: 'feed' | 'article' | 'thread';
  scrollElement: HTMLElement;
  children: ReactNode;
}

export function OneFeedShell({
  activePlatformId,
  surface,
  scrollElement,
  children,
}: OneFeedShellProps) {
  return (
    <div className="min-h-full">
      <PlatformBar
        activePlatformId={activePlatformId}
        surface={surface}
        scrollElement={scrollElement}
      />
      {children}
    </div>
  );
}
