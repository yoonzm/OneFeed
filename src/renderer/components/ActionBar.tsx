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
const actionMetricKinds: Partial<Record<FeedActionDescriptor['kind'], FeedMetricKind>> = {
  react: 'reactions',
  reply: 'replies',
  repost: 'reposts',
};

/** 渲染跨平台统计与操作，同时避免同一数字以 metric 和 action 重复出现。 */
export function ActionBar({ originalUrl, metrics, actions, onAction }: ActionBarProps) {
  // 可交互动作通常自带 count；对应 metric 被覆盖后只保留动作版本。
  const coveredMetricKinds = new Set(
    actions.map((action) => actionMetricKinds[action.kind]).filter(Boolean),
  );
  const passiveMetrics = metrics.filter((metric) => (
    passiveMetricKinds.has(metric.kind) || !coveredMetricKinds.has(metric.kind)
  ));

  if (!passiveMetrics.length && !actions.length) return null;

  return (
    <footer className="card-actions">
      {passiveMetrics.map((metric) => (
        <span className="passive-metric" key={metric.kind}>
          {metric.label || metric.kind} {metric.value.toLocaleString('zh-CN')}
        </span>
      ))}
      {/* open 是普通链接；其余动作必须交回 Adapter 代理用户在原站的操作。 */}
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
