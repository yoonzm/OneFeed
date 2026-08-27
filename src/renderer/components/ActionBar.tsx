import type {
  FeedActionDescriptor,
  FeedMetric,
  FeedMetricKind,
} from '../../types/feed';
import { formatNumber, i18n } from '../../i18n';

interface ActionBarProps {
  originalUrl: string;
  metrics: FeedMetric[];
  actions: FeedActionDescriptor[];
  onAction: (action: FeedActionDescriptor) => void;
  surface?: 'feed' | 'detail';
}

const passiveMetricKinds = new Set<FeedMetricKind>(['reposts', 'views', 'score']);
const detailHiddenMetricKinds = new Set<FeedMetricKind>(['reactions', 'replies']);
const detailHiddenActionKinds = new Set<FeedActionDescriptor['kind']>(['react', 'reply', 'open']);
const actionMetricKinds: Partial<Record<FeedActionDescriptor['kind'], FeedMetricKind>> = {
  react: 'reactions',
  reply: 'replies',
  repost: 'reposts',
};
const metricLabels: Record<FeedMetricKind, string> = {
  reactions: i18n.t('metric.reactions'),
  replies: i18n.t('metric.replies'),
  reposts: i18n.t('metric.reposts'),
  views: i18n.t('metric.views'),
  score: i18n.t('metric.score'),
};

/** 渲染跨平台统计与操作，同时避免同一数字以 metric 和 action 重复出现。 */
export function ActionBar({
  originalUrl,
  metrics,
  actions,
  onAction,
  surface = 'feed',
}: ActionBarProps) {
  // 详情页已位于原内容中，不再重复提供打开原文、回复和赞同入口。
  const visibleMetrics = surface === 'detail'
    ? metrics.filter((metric) => !detailHiddenMetricKinds.has(metric.kind))
    : metrics;
  const visibleActions = surface === 'detail'
    ? actions.filter((action) => !detailHiddenActionKinds.has(action.kind))
    : actions;
  // 可交互动作通常自带 count；对应 metric 被覆盖后只保留动作版本。
  const coveredMetricKinds = new Set(
    visibleActions.map((action) => actionMetricKinds[action.kind]).filter(Boolean),
  );
  const passiveMetrics = visibleMetrics.filter((metric) => (
    passiveMetricKinds.has(metric.kind) || !coveredMetricKinds.has(metric.kind)
  ));

  if (!passiveMetrics.length && !visibleActions.length) return null;

  return (
    <footer className="card-actions">
      {passiveMetrics.map((metric) => (
        <span className="passive-metric" key={metric.kind}>
          {metric.label || metricLabels[metric.kind]} {formatNumber(metric.value)}
        </span>
      ))}
      {/* open 是普通链接；其余动作必须交回 Adapter 代理用户在原站的操作。 */}
      {visibleActions.map((action) => action.kind === 'open' ? (
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
          {action.label}{action.count !== undefined ? ` ${formatNumber(action.count)}` : ''}
        </button>
      ))}
    </footer>
  );
}
