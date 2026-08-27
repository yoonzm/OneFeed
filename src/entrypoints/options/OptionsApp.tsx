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
import {
  getPlatformDisplayName,
  getSupportedPlatforms,
  type PlatformId,
} from '../../config/platforms';
import {
  type FeedFilterCondition,
  type FeedFilterRule,
} from '../../filters/feedFilters';
import { useFeedFilters } from '../../filters/useFeedFilters';
import { formatNumber, i18n } from '../../i18n';
import { useColorScheme } from '../../theme/useColorScheme';

const KIND_LABELS = {
  post: i18n.t('filter.kind.post'),
  article: i18n.t('filter.kind.article'),
  discussion: i18n.t('filter.kind.discussion'),
} as const;

const TEXT_FIELD_LABELS = {
  all: i18n.t('filter.field.all'),
  title: i18n.t('filter.field.title'),
  content: i18n.t('filter.field.content'),
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
    return i18n.t('filter.summaryKeyword', {
      field: TEXT_FIELD_LABELS[condition.field],
      value: condition.values.filter(Boolean).join(', '),
    });
  }
  if (condition.type === 'author') {
    return i18n.t(
      condition.operator === 'equals'
        ? 'filter.summaryAuthorEquals'
        : 'filter.summaryAuthorContains',
      { value: condition.value },
    );
  }
  return i18n.t('filter.summaryKind', { kind: KIND_LABELS[condition.value] });
}

function ruleSummary(rule: FeedFilterRule): string {
  const scope = rule.platformIds?.length
    ? rule.platformIds.map((id) => (
        getSupportedPlatforms().find((platform) => platform.id === id)
          ? getPlatformDisplayName(id as PlatformId)
          : id
      )).join(' · ')
    : i18n.t('filter.allPlatforms');
  return i18n.t('filter.ruleSummary', {
    scope,
    conditions: rule.conditions.map(conditionSummary).join(i18n.t('filter.conditionSeparator')),
  });
}

function ruleValidationError(rule: FeedFilterRule): string | undefined {
  if (!rule.conditions.length) return i18n.t('filter.validationCondition');
  const invalid = rule.conditions.some((condition) => {
    if (condition.type === 'keyword') return !condition.values.some((value) => value.trim());
    if (condition.type === 'author') return !condition.value.trim();
    return false;
  });
  return invalid ? i18n.t('filter.validationValue') : undefined;
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
          <p>{i18n.t('filter.editorEyebrow')}</p>
          <h2>{initialRule.name
            ? i18n.t('filter.editorEdit')
            : i18n.t('filter.editorCreate')}</h2>
        </div>
        <button className="icon-button" type="button" aria-label={i18n.t('filter.editorClose')} onClick={onCancel}>
          <X size={21} />
        </button>
      </div>

      <label className="field-label">
        <span>{i18n.t('filter.ruleName')} <small>{i18n.t('filter.optional')}</small></span>
        <input
          type="text"
          value={draft.name}
          placeholder={i18n.t('filter.ruleNamePlaceholder')}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </label>

      <fieldset className="scope-fieldset">
        <legend>{i18n.t('filter.scope')}</legend>
        <div className="scope-choice">
          <label>
            <input
              type="radio"
              name="scope"
              checked={allPlatforms}
              onChange={() => setDraft({ ...draft, platformIds: undefined })}
            />
            {i18n.t('filter.allPlatforms')}
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
            {i18n.t('filter.specificPlatforms')}
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
                  {getPlatformDisplayName(platform.id as PlatformId)}
                </label>
              );
            })}
          </div>
        )}
      </fieldset>

      <fieldset className="conditions-fieldset">
        <legend>{i18n.t('filter.allConditions')}</legend>
        <div className="condition-list">
          {draft.conditions.map((condition, index) => (
            <div className="condition-row" key={`${condition.type}-${index}`}>
              <span className="condition-number">{index + 1}</span>
              <select
                aria-label={i18n.t('filter.conditionType', [String(index + 1)])}
                value={condition.type}
                onChange={(event) => updateCondition(
                  index,
                  createCondition(event.target.value as FeedFilterCondition['type']),
                )}
              >
                <option value="keyword">{i18n.t('filter.keyword')}</option>
                <option value="author">{i18n.t('filter.author')}</option>
                <option value="kind">{i18n.t('filter.contentType')}</option>
              </select>

              {condition.type === 'keyword' && (
                <>
                  <select
                    aria-label={i18n.t('filter.textRange', [String(index + 1)])}
                    value={condition.field}
                    onChange={(event) => updateCondition(index, {
                      ...condition,
                      field: event.target.value as typeof condition.field,
                    })}
                  >
                    <option value="all">{i18n.t('filter.field.all')}</option>
                    <option value="title">{i18n.t('filter.titleOnly')}</option>
                    <option value="content">{i18n.t('filter.contentOnly')}</option>
                  </select>
                  <input
                    type="text"
                    aria-label={i18n.t('filter.conditionKeyword', [String(index + 1)])}
                    value={condition.values.join(', ')}
                    placeholder={i18n.t('filter.keywordsPlaceholder')}
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
                    aria-label={i18n.t('filter.authorMatch', [String(index + 1)])}
                    value={condition.operator}
                    onChange={(event) => updateCondition(index, {
                      ...condition,
                      operator: event.target.value as typeof condition.operator,
                    })}
                  >
                    <option value="contains">{i18n.t('filter.nameContains')}</option>
                    <option value="equals">{i18n.t('filter.nameEquals')}</option>
                  </select>
                  <input
                    type="text"
                    aria-label={i18n.t('filter.conditionAuthor', [String(index + 1)])}
                    value={condition.value}
                    placeholder={i18n.t('filter.authorPlaceholder')}
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
                  aria-label={i18n.t('filter.conditionContentType', [String(index + 1)])}
                  value={condition.value}
                  onChange={(event) => updateCondition(index, {
                    ...condition,
                    value: event.target.value as typeof condition.value,
                  })}
                >
                  <option value="post">{i18n.t('filter.kind.post')}</option>
                  <option value="article">{i18n.t('filter.kind.article')}</option>
                  <option value="discussion">{i18n.t('filter.kind.discussion')}</option>
                </select>
              )}

              <button
                className="remove-condition"
                type="button"
                aria-label={i18n.t('filter.deleteCondition', [String(index + 1)])}
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
          {i18n.t('filter.addCondition')}
        </button>
      </fieldset>

      <div className="rule-preview">
        <span>{i18n.t('filter.ruleSentence')}</span>
        <p>{ruleSummary(draft)}</p>
      </div>

      <div className="editor-actions">
        <p role="alert">{validationError || i18n.t('filter.localOnly')}</p>
        <div>
          <button className="secondary-button" type="button" onClick={onCancel}>{i18n.t('filter.cancel')}</button>
          <button className="primary-button" type="submit" disabled={Boolean(validationError)}>
            <Check size={18} weight="bold" />
            {i18n.t('filter.saveRule')}
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
      name: `${rule.name}${i18n.t('filter.duplicateSuffix')}`,
      enabled: false,
      platformIds: rule.platformIds ? [...rule.platformIds] : undefined,
      conditions: rule.conditions.map((condition) => ({ ...condition })),
    };
    saveSettings({ ...settings, rules: [...settings.rules, copy] });
    setEditingRule(copy);
  };

  return (
    <div className="options-page" data-onefeed-theme={colorScheme}>
      <a className="skip-link" href="#settings-main">{i18n.t('filter.skip')}</a>
      <header className="options-header">
        <a className="options-brand" href="/board.html" aria-label={i18n.t('filter.backLabel')}>
          <img src="/icons/icon-128.png" alt="" />
          <span>OneFeed</span>
        </a>
        <div className="options-header-actions">
          <a href="/board.html"><ArrowLeft size={18} />{i18n.t('filter.back')}</a>
          <button
            className="theme-button"
            type="button"
            aria-label={nextColorScheme === 'dark'
              ? i18n.t('common.themeSwitchDark')
              : i18n.t('common.themeSwitchLight')}
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
          <h1 id="settings-title">{i18n.t('filter.introTitle')}</h1>
          <p>{i18n.t('filter.introDescription')}</p>
        </section>

        <div className="settings-workspace">
          <aside className="settings-index" aria-label={i18n.t('filter.categories')}>
            <div className="index-title"><Funnel size={19} weight="fill" /><span>{i18n.t('filter.displayFilter')}</span></div>
            <p>{i18n.t('filter.indexDescription')}</p>
            <dl>
              <div><dt>{i18n.t('filter.status')}</dt><dd>{settings.enabled ? i18n.t('filter.running') : i18n.t('common.paused')}</dd></div>
              <div><dt>{i18n.t('filter.activeRules')}</dt><dd>{formatNumber(activeRuleCount)}</dd></div>
              <div><dt>{i18n.t('filter.dataLocation')}</dt><dd>{i18n.t('filter.thisDevice')}</dd></div>
            </dl>
          </aside>

          <div className="settings-content">
            <section className="master-card" aria-labelledby="master-title">
              <div className="master-icon"><EyeSlash size={28} /></div>
              <div>
                <p>{i18n.t('filter.globalControl')}</p>
                <h2 id="master-title">{i18n.t('filter.displayFilter')}</h2>
                <span>{settings.enabled
                  ? i18n.t('filter.activeSummary', activeRuleCount, [formatNumber(activeRuleCount)])
                  : i18n.t('filter.pausedSummary')}</span>
              </div>
              <Toggle
                checked={settings.enabled}
                label={i18n.t('filter.masterToggle')}
                disabled={!ready}
                onChange={(enabled) => saveSettings({ ...settings, enabled })}
              />
            </section>

            <section className="quick-section" aria-labelledby="quick-title">
              <div className="section-title">
                <div><p>{i18n.t('filter.quickRules')}</p><h2 id="quick-title">{i18n.t('filter.quickTitle')}</h2></div>
              </div>
              <div className="quick-grid">
                <article>
                  <div className="quick-icon"><Check size={22} /></div>
                  <div><h3>{i18n.t('filter.hideSeen')}</h3><p>{i18n.t('filter.hideSeenDescription')}</p></div>
                  <Toggle
                    checked={settings.hideSeen}
                    label={i18n.t('filter.hideSeen')}
                    disabled={!ready}
                    onChange={(hideSeen) => saveSettings({ ...settings, hideSeen })}
                  />
                </article>
                <article>
                  <div className="quick-icon"><Sparkle size={22} /></div>
                  <div><h3>{i18n.t('filter.hideRecommended')}</h3><p>{i18n.t('filter.hideRecommendedDescription')}</p></div>
                  <Toggle
                    checked={settings.hideRecommended}
                    label={i18n.t('filter.hideRecommendedToggle')}
                    disabled={!ready}
                    onChange={(hideRecommended) => saveSettings({ ...settings, hideRecommended })}
                  />
                </article>
              </div>
            </section>

            <section className="rules-section" aria-labelledby="rules-title">
              <div className="section-title rules-heading">
                <div><p>{i18n.t('filter.customRules')}</p><h2 id="rules-title">{i18n.t('filter.customTitle')}</h2></div>
                <button className="primary-button" type="button" onClick={() => setEditingRule(createRule())}>
                  <Plus size={18} weight="bold" />
                  {i18n.t('filter.newRule')}
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
                  <h3>{i18n.t('filter.emptyTitle')}</h3>
                  <p>{i18n.t('filter.emptyDescription')}</p>
                  <button type="button" onClick={() => setEditingRule(createRule())}>{i18n.t('filter.createRule')}</button>
                </div>
              ) : (
                <div className="rule-list">
                  {settings.rules.map((rule) => (
                    <article className={`rule-card ${rule.enabled ? '' : 'is-disabled'}`} key={rule.id}>
                      <div className="rule-card-main">
                        <Toggle
                          checked={rule.enabled}
                          label={i18n.t(
                            rule.enabled ? 'filter.disableRule' : 'filter.enableRule',
                            [rule.name],
                          )}
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
                        <button type="button" aria-label={i18n.t('filter.editRule', [rule.name])} onClick={() => setEditingRule(rule)}>
                          <PencilSimple size={18} />
                        </button>
                        <button type="button" aria-label={i18n.t('filter.copyRule', [rule.name])} onClick={() => duplicateRule(rule)}>
                          <Copy size={18} />
                        </button>
                        <button type="button" aria-label={i18n.t('filter.deleteRule', [rule.name])} onClick={() => deleteRule(rule)}>
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
          <span>{i18n.t('filter.deleted', [deletedRule.rule.name])}</span>
          <button type="button" onClick={undoDelete}>{i18n.t('filter.undo')}</button>
        </div>
      )}
    </div>
  );
}
