import { Check, Plus, X } from '@phosphor-icons/react';
import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { PlatformIcon } from '../../components/PlatformIcon';
import { getPlatformPresentation } from '../../config/platformPresentation';
import {
  getPlatformDisplayName,
  getSupportedPlatforms,
  type PlatformId,
} from '../../config/platforms';
import type { FeedFilterCondition, FeedFilterRule } from '../../filters/feedFilters';
import { i18n } from '../../i18n';
import {
  conditionSummary,
  createCondition,
  ruleSummary,
  ruleValidationError,
} from './filterRuleUtils';

interface RuleEditorProps {
  initialRule: FeedFilterRule;
  onCancel: () => void;
  onSave: (rule: FeedFilterRule) => void;
}

export function RuleEditor({ initialRule, onCancel, onSave }: RuleEditorProps) {
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
    onSave({
      ...draft,
      conditions,
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
        <button
          className="icon-button"
          type="button"
          aria-label={i18n.t('filter.editorClose')}
          onClick={onCancel}
        >
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
                  <span aria-hidden="true">
                    <PlatformIcon platformId={platform.id as PlatformId} />
                  </span>
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
          <button className="secondary-button" type="button" onClick={onCancel}>
            {i18n.t('filter.cancel')}
          </button>
          <button className="primary-button" type="submit" disabled={Boolean(validationError)}>
            <Check size={18} weight="bold" />
            {i18n.t('filter.saveRule')}
          </button>
        </div>
      </div>
    </form>
  );
}
