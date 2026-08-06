import type { FeedActionDescriptor, FeedItem, FeedMetricKind } from '../../types/feed';

interface ActionBarProps {
  item: FeedItem;
  onAction: (item: FeedItem, action: FeedActionDescriptor) => void;
}

const passiveMetricKinds = new Set<FeedMetricKind>(['reposts', 'views', 'score']);

export function ActionBar({ item, onAction }: ActionBarProps) {
  const passiveMetrics = item.metrics.filter((metric) => passiveMetricKinds.has(metric.kind));

  return (
    <footer className="card-actions">
      {passiveMetrics.map((metric) => (
        <span className="passive-metric" key={metric.kind}>
          {metric.label || metric.kind} {metric.value.toLocaleString('zh-CN')}
        </span>
      ))}
      {item.actions.map((action) => action.kind === 'open' ? (
        <a
          className="open-action"
          href={item.originalUrl}
          target="_blank"
          rel="noreferrer"
          key={action.id}
        >
          {action.label} ↗
        </a>
      ) : (
        <button
          type="button"
          key={action.id}
          disabled={!action.enabled}
          aria-pressed={action.active}
          onClick={() => onAction(item, action)}
        >
          {action.label}{action.count ? ` ${action.count.toLocaleString('zh-CN')}` : ''}
        </button>
      ))}
    </footer>
  );
}
