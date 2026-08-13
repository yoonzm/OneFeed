import type { PlatformId } from '../config/platforms';

interface PlatformIconProps {
  platformId: PlatformId;
}

/** Brand SVGs are bundled locally so platform cards never depend on remote favicon requests. */
export function PlatformIcon({ platformId }: PlatformIconProps) {
  return (
    <img
      className="platform-icon"
      src={`/platform-icons/${platformId}.svg`}
      alt=""
      aria-hidden="true"
      data-platform-icon={platformId}
      draggable={false}
    />
  );
}
