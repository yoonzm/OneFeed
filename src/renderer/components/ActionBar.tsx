import type {
  FeedActionDescriptor,
  FeedMetric,
  FeedMetricKind,
} from '../../types/feed';

interface ActionBarProps {
  originalUrl: string;
  metrics: FeedMetric[];
  actions: FeedActionDescriptor[];
  onAction: (action: FeedActionDescriptor) => void;
}

const passiveMetricKinds = new Set<FeedMetricKind>(['reposts', 'views', 'score']);

export function ActionBar({ originalUrl, metrics, actions, onAction }: ActionBarProps) {
  const passiveMetrics = metrics.filter((metric) => passiveMetricKinds.has(metric.kind));

  return (
    <footer className="card-actions">
      {passiveMetrics.map((metric) => (
        <span className="passive-metric" key={metric.kind}>
          {metric.label || metric.kind} {metric.value.toLocaleString('zh-CN')}
        </span>
      ))}
      {actions.map((action) => action.kind === 'open' ? (
        <a
          className="open-action"
          href={originalUrl}
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
          onClick={() => onAction(action)}
        >
          {action.label}{action.count ? ` ${action.count.toLocaleString('zh-CN')}` : ''}
        </button>
      ))}
    </footer>
  );
}
