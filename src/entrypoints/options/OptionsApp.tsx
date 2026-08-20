import {
  ArrowLeft,
  Check,
  Copy,
  EyeSlash,
  Funnel,
  MoonStars,
  PencilSimple,
  Plus,
  Sparkle,
  Sun,
  Trash,
  X,
} from '@phosphor-icons/react';
import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { PlatformIcon } from '../../components/PlatformIcon';
import { getPlatformPresentation } from '../../config/platformPresentation';
import { getSupportedPlatforms, type PlatformId } from '../../config/platforms';
import {
  type FeedFilterCondition,
  type FeedFilterRule,
} from '../../filters/feedFilters';
import { useFeedFilters } from '../../filters/useFeedFilters';
import { useColorScheme } from '../../theme/useColorScheme';

const KIND_LABELS = {
  post: '动态',
  article: '文章',
  discussion: '讨论',
} as const;

const TEXT_FIELD_LABELS = {
  all: '标题或正文',
  title: '标题',
  content: '正文',
} as const;

interface DeletedRule {
  rule: FeedFilterRule;
  index: number;
}

function createRuleId(): string {
  return globalThis.crypto?.randomUUID?.() ||
    `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createRule(): FeedFilterRule {
  return {
    id: createRuleId(),
    name: '',
    enabled: true,
    conditions: [{ type: 'keyword', field: 'all', values: [''] }],
    action: 'hide',
  };
}

function createCondition(type: FeedFilterCondition['type']): FeedFilterCondition {
  if (type === 'author') return { type: 'author', operator: 'contains', value: '' };
  if (type === 'kind') return { type: 'kind', value: 'article' };
  return { type: 'keyword', field: 'all', values: [''] };
}

function conditionSummary(condition: FeedFilterCondition): string {
  if (condition.type === 'keyword') {
    return `${TEXT_FIELD_LABELS[condition.field]}包含“${condition.values.filter(Boolean).join('、')}”`;
  }
  if (condition.type === 'author') {
    return `作者${condition.operator === 'equals' ? '是' : '包含'}“${condition.value}”`;
  }
  return `内容类型是${KIND_LABELS[condition.value]}`;
}

function ruleSummary(rule: FeedFilterRule): string {
  const scope = rule.platformIds?.length
    ? rule.platformIds.map((id) => (
        getSupportedPlatforms().find((platform) => platform.id === id)?.name || id
      )).join('、')
    : '所有平台';
  return `${scope} · ${rule.conditions.map(conditionSummary).join('，并且')} · 隐藏`;
}

function ruleValidationError(rule: FeedFilterRule): string | undefined {
  if (!rule.conditions.length) return '至少添加一个过滤条件。';
  const invalid = rule.conditions.some((condition) => {
    if (condition.type === 'keyword') return !condition.values.some((value) => value.trim());
    if (condition.type === 'author') return !condition.value.trim();
    return false;
  });
  return invalid ? '请填写完整的关键词或作者条件。' : undefined;
}

interface ToggleProps {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ checked, label, disabled, onChange }: ToggleProps) {
  return (
    <button
      className={`filter-switch ${checked ? 'is-on' : ''}`}
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

interface RuleEditorProps {
  initialRule: FeedFilterRule;
  onCancel: () => void;
  onSave: (rule: FeedFilterRule) => void;
}

function RuleEditor({ initialRule, onCancel, onSave }: RuleEditorProps) {
  const [draft, setDraft] = useState<FeedFilterRule>(initialRule);
  const platforms = useMemo(() => getSupportedPlatforms(), []);
  const validationError = ruleValidationError(draft);
  const allPlatforms = !draft.platformIds?.length;

  const updateCondition = (index: number, condition: FeedFilterCondition) => {
    setDraft((current) => ({
      ...current,
      conditions: current.conditions.map((entry, entryIndex) => (
        entryIndex === index ? condition : entry
      )),
    }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (validationError) return;
    const conditions = draft.conditions.map((condition) => {
      if (condition.type === 'keyword') {
        return {
          ...condition,
          values: condition.values.map((value) => value.trim()).filter(Boolean),
        };
      }
      if (condition.type === 'author') return { ...condition, value: condition.value.trim() };
      return condition;
    });
    const unnamedRule = { ...draft, conditions };
    onSave({
      ...unnamedRule,
      name: draft.name.trim() || conditionSummary(conditions[0]!),
    });
  };

  return (
    <form className="rule-editor" onSubmit={handleSubmit}>
      <div className="editor-heading">
        <div>
          <p>规则编辑器</p>
          <h2>{initialRule.name ? '编辑过滤规则' : '创建过滤规则'}</h2>
        </div>
        <button className="icon-button" type="button" aria-label="关闭规则编辑器" onClick={onCancel}>
          <X size={21} />
        </button>
      </div>

      <label className="field-label">
        <span>规则名称 <small>可选</small></span>
        <input
          type="text"
          value={draft.name}
          placeholder="例如：减少推广内容"
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </label>

      <fieldset className="scope-fieldset">
        <legend>适用平台</legend>
        <div className="scope-choice">
          <label>
            <input
              type="radio"
              name="scope"
              checked={allPlatforms}
              onChange={() => setDraft({ ...draft, platformIds: undefined })}
            />
            所有平台
          </label>
          <label>
            <input
              type="radio"
              name="scope"
              checked={!allPlatforms}
              onChange={() => {
                const firstPlatform = platforms[0];
                if (firstPlatform) setDraft({ ...draft, platformIds: [firstPlatform.id] });
              }}
            />
            指定平台
          </label>
        </div>
        {!allPlatforms && (
          <div className="platform-checks">
            {platforms.map((platform) => {
              const checked = draft.platformIds?.includes(platform.id) === true;
              const presentation = getPlatformPresentation(platform.id as PlatformId);
              return (
                <label
                  key={platform.id}
                  style={{ '--platform-accent': presentation.accent } as CSSProperties}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const current = draft.platformIds || [];
                      const next = checked
                        ? current.filter((id) => id !== platform.id)
                        : [...current, platform.id];
                      setDraft({ ...draft, platformIds: next.length ? next : undefined });
                    }}
                  />
                  <span aria-hidden="true"><PlatformIcon platformId={platform.id as PlatformId} /></span>
                  {platform.name}
                </label>
              );
            })}
          </div>
        )}
      </fieldset>

      <fieldset className="conditions-fieldset">
        <legend>满足以下全部条件</legend>
        <div className="condition-list">
          {draft.conditions.map((condition, index) => (
            <div className="condition-row" key={`${condition.type}-${index}`}>
              <span className="condition-number">{index + 1}</span>
              <select
                aria-label={`条件 ${index + 1} 类型`}
                value={condition.type}
                onChange={(event) => updateCondition(
                  index,
                  createCondition(event.target.value as FeedFilterCondition['type']),
                )}
              >
                <option value="keyword">关键词</option>
                <option value="author">作者</option>
                <option value="kind">内容类型</option>
              </select>

              {condition.type === 'keyword' && (
                <>
                  <select
                    aria-label={`条件 ${index + 1} 文本范围`}
                    value={condition.field}
                    onChange={(event) => updateCondition(index, {
                      ...condition,
                      field: event.target.value as typeof condition.field,
                    })}
                  >
                    <option value="all">标题或正文</option>
                    <option value="title">仅标题</option>
                    <option value="content">仅正文</option>
                  </select>
                  <input
                    type="text"
                    aria-label={`条件 ${index + 1} 关键词`}
                    value={condition.values.join(', ')}
                    placeholder="多个词用逗号分隔"
                    onChange={(event) => updateCondition(index, {
                      ...condition,
                      values: event.target.value.split(/[,，]/),
                    })}
                  />
                </>
              )}

              {condition.type === 'author' && (
                <>
                  <select
                    aria-label={`条件 ${index + 1} 作者匹配方式`}
                    value={condition.operator}
                    onChange={(event) => updateCondition(index, {
                      ...condition,
                      operator: event.target.value as typeof condition.operator,
                    })}
                  >
                    <option value="contains">名称包含</option>
                    <option value="equals">名称等于</option>
                  </select>
                  <input
                    type="text"
                    aria-label={`条件 ${index + 1} 作者`}
                    value={condition.value}
                    placeholder="作者名称"
                    onChange={(event) => updateCondition(index, {
                      ...condition,
                      value: event.target.value,
                    })}
                  />
                </>
              )}

              {condition.type === 'kind' && (
                <select
                  className="condition-value"
                  aria-label={`条件 ${index + 1} 内容类型`}
                  value={condition.value}
                  onChange={(event) => updateCondition(index, {
                    ...condition,
                    value: event.target.value as typeof condition.value,
                  })}
                >
                  <option value="post">动态</option>
                  <option value="article">文章</option>
                  <option value="discussion">讨论</option>
                </select>
              )}

              <button
                className="remove-condition"
                type="button"
                aria-label={`删除条件 ${index + 1}`}
                disabled={draft.conditions.length === 1}
                onClick={() => setDraft({
                  ...draft,
                  conditions: draft.conditions.filter((_, entryIndex) => entryIndex !== index),
                })}
              >
                <X size={17} />
              </button>
            </div>
          ))}
        </div>
        <button
          className="add-condition"
          type="button"
          onClick={() => setDraft({
            ...draft,
            conditions: [...draft.conditions, createCondition('keyword')],
          })}
        >
          <Plus size={17} />
          添加条件
        </button>
      </fieldset>

      <div className="rule-preview">
        <span>规则句</span>
        <p>{ruleSummary(draft)}</p>
      </div>

      <div className="editor-actions">
        <p role="alert">{validationError || '规则只在当前设备本地执行。'}</p>
        <div>
          <button className="secondary-button" type="button" onClick={onCancel}>取消</button>
          <button className="primary-button" type="submit" disabled={Boolean(validationError)}>
            <Check size={18} weight="bold" />
            保存规则
          </button>
        </div>
      </div>
    </form>
  );
}

export function OptionsApp() {
  const { colorScheme, ready: colorReady, setColorScheme } = useColorScheme();
  const { settings, ready, saveSettings } = useFeedFilters();
  const [editingRule, setEditingRule] = useState<FeedFilterRule>();
  const [deletedRule, setDeletedRule] = useState<DeletedRule>();
  const activeRuleCount = settings.rules.filter((rule) => rule.enabled).length +
    Number(settings.hideSeen) + Number(settings.hideRecommended);
  const nextColorScheme = colorScheme === 'light' ? 'dark' : 'light';

  const saveRule = (rule: FeedFilterRule) => {
    saveSettings((current) => {
      const exists = current.rules.some((entry) => entry.id === rule.id);
      return {
        ...current,
        rules: exists
          ? current.rules.map((entry) => entry.id === rule.id ? rule : entry)
          : [...current.rules, rule],
      };
    });
    setEditingRule(undefined);
    setDeletedRule(undefined);
  };

  const deleteRule = (rule: FeedFilterRule) => {
    const index = settings.rules.findIndex((entry) => entry.id === rule.id);
    saveSettings({
      ...settings,
      rules: settings.rules.filter((entry) => entry.id !== rule.id),
    });
    setDeletedRule({ rule, index });
    if (editingRule?.id === rule.id) setEditingRule(undefined);
  };

  const undoDelete = () => {
    if (!deletedRule) return;
    saveSettings((current) => {
      const rules = [...current.rules];
      rules.splice(Math.max(0, deletedRule.index), 0, deletedRule.rule);
      return { ...current, rules };
    });
    setDeletedRule(undefined);
  };

  const duplicateRule = (rule: FeedFilterRule) => {
    const copy = {
      ...rule,
      id: createRuleId(),
      name: `${rule.name}副本`,
      enabled: false,
      platformIds: rule.platformIds ? [...rule.platformIds] : undefined,
      conditions: rule.conditions.map((condition) => ({ ...condition })),
    };
    saveSettings({ ...settings, rules: [...settings.rules, copy] });
    setEditingRule(copy);
  };

  return (
    <div className="options-page" data-onefeed-theme={colorScheme}>
      <a className="skip-link" href="#settings-main">跳到设置内容</a>
      <header className="options-header">
        <a className="options-brand" href="/board.html" aria-label="返回 OneFeed 启动中心">
          <img src="/icons/icon-128.png" alt="" />
          <span>OneFeed</span>
        </a>
        <div className="options-header-actions">
          <a href="/board.html"><ArrowLeft size={18} />返回启动中心</a>
          <button
            className="theme-button"
            type="button"
            aria-label={`切换到${nextColorScheme === 'dark' ? '深色' : '浅色'}主题`}
            disabled={!colorReady}
            onClick={() => setColorScheme(nextColorScheme)}
          >
            {colorScheme === 'light' ? <MoonStars size={22} /> : <Sun size={22} />}
          </button>
        </div>
      </header>

      <main id="settings-main" className="options-main">
        <section className="settings-intro" aria-labelledby="settings-title">
          <p>DISPLAY FILTER</p>
          <h1 id="settings-title">决定哪些内容<br />不再出现。</h1>
          <p>规则只改变 OneFeed 的展示，不会修改、删除或上传原网站内容。</p>
        </section>

        <div className="settings-workspace">
          <aside className="settings-index" aria-label="设置分类">
            <div className="index-title"><Funnel size={19} weight="fill" /><span>展示过滤</span></div>
            <p>同一规则内需满足全部条件；命中任意一条规则即隐藏。</p>
            <dl>
              <div><dt>状态</dt><dd>{settings.enabled ? '正在执行' : '已暂停'}</dd></div>
              <div><dt>生效规则</dt><dd>{activeRuleCount}</dd></div>
              <div><dt>数据位置</dt><dd>仅此设备</dd></div>
            </dl>
          </aside>

          <div className="settings-content">
            <section className="master-card" aria-labelledby="master-title">
              <div className="master-icon"><EyeSlash size={28} /></div>
              <div>
                <p>全局控制</p>
                <h2 id="master-title">展示过滤</h2>
                <span>{settings.enabled
                  ? `${activeRuleCount} 条规则正在参与列表筛选`
                  : '规则已保留，但暂时不会过滤内容'}</span>
              </div>
              <Toggle
                checked={settings.enabled}
                label="展示过滤总开关"
                disabled={!ready}
                onChange={(enabled) => saveSettings({ ...settings, enabled })}
              />
            </section>

            <section className="quick-section" aria-labelledby="quick-title">
              <div className="section-title">
                <div><p>快捷规则</p><h2 id="quick-title">先处理最常见的噪音</h2></div>
              </div>
              <div className="quick-grid">
                <article>
                  <div className="quick-icon"><Check size={22} /></div>
                  <div><h3>隐藏已读内容</h3><p>使用已打开条目的本地标记，避免重复出现。</p></div>
                  <Toggle
                    checked={settings.hideSeen}
                    label="隐藏已读内容"
                    disabled={!ready}
                    onChange={(hideSeen) => saveSettings({ ...settings, hideSeen })}
                  />
                </article>
                <article>
                  <div className="quick-icon"><Sparkle size={22} /></div>
                  <div><h3>隐藏平台推荐</h3><p>仅在平台提供推荐原因时生效，缺失字段不会误判。</p></div>
                  <Toggle
                    checked={settings.hideRecommended}
                    label="隐藏平台推荐内容"
                    disabled={!ready}
                    onChange={(hideRecommended) => saveSettings({ ...settings, hideRecommended })}
                  />
                </article>
              </div>
            </section>

            <section className="rules-section" aria-labelledby="rules-title">
              <div className="section-title rules-heading">
                <div><p>自定义规则</p><h2 id="rules-title">用你自己的条件过滤</h2></div>
                <button className="primary-button" type="button" onClick={() => setEditingRule(createRule())}>
                  <Plus size={18} weight="bold" />
                  新建规则
                </button>
              </div>

              {editingRule && (
                <RuleEditor
                  key={editingRule.id}
                  initialRule={editingRule}
                  onCancel={() => setEditingRule(undefined)}
                  onSave={saveRule}
                />
              )}

              {!settings.rules.length && !editingRule ? (
                <div className="rules-empty">
                  <Funnel size={26} />
                  <h3>还没有自定义规则</h3>
                  <p>从关键词、作者或内容类型开始，创建第一条过滤规则。</p>
                  <button type="button" onClick={() => setEditingRule(createRule())}>创建规则</button>
                </div>
              ) : (
                <div className="rule-list">
                  {settings.rules.map((rule) => (
                    <article className={`rule-card ${rule.enabled ? '' : 'is-disabled'}`} key={rule.id}>
                      <div className="rule-card-main">
                        <Toggle
                          checked={rule.enabled}
                          label={`${rule.enabled ? '停用' : '启用'}规则 ${rule.name}`}
                          onChange={(enabled) => saveSettings({
                            ...settings,
                            rules: settings.rules.map((entry) => (
                              entry.id === rule.id ? { ...entry, enabled } : entry
                            )),
                          })}
                        />
                        <div>
                          <h3>{rule.name}</h3>
                          <p className="rule-sentence">{ruleSummary(rule)}</p>
                        </div>
                      </div>
                      <div className="rule-actions">
                        <button type="button" aria-label={`编辑规则 ${rule.name}`} onClick={() => setEditingRule(rule)}>
                          <PencilSimple size={18} />
                        </button>
                        <button type="button" aria-label={`复制规则 ${rule.name}`} onClick={() => duplicateRule(rule)}>
                          <Copy size={18} />
                        </button>
                        <button type="button" aria-label={`删除规则 ${rule.name}`} onClick={() => deleteRule(rule)}>
                          <Trash size={18} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {deletedRule && (
        <div className="undo-toast" role="status">
          <span>已删除“{deletedRule.rule.name}”</span>
          <button type="button" onClick={undoDelete}>撤销</button>
        </div>
      )}
    </div>
  );
}
