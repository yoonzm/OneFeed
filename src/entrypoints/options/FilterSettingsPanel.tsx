import {
  Check,
  Copy,
  EyeSlash,
  Funnel,
  PencilSimple,
  Plus,
  Sparkle,
  Trash,
} from '@phosphor-icons/react';
import { useState } from 'react';
import type { FeedFilterRule } from '../../filters/feedFilters';
import { useFeedFilters } from '../../filters/useFeedFilters';
import { formatNumber, i18n } from '../../i18n';
import { SettingSwitch } from './components/SettingSwitch';
import { SettingsPanelHeader } from './components/SettingsLayout';
import { createRule, createRuleId, ruleSummary } from './filterRuleUtils';
import { RuleEditor } from './RuleEditor';

interface DeletedRule {
  rule: FeedFilterRule;
  index: number;
}

export function FilterSettingsPanel() {
  const { settings, ready, saveSettings } = useFeedFilters();
  const [editingRule, setEditingRule] = useState<FeedFilterRule>();
  const [deletedRule, setDeletedRule] = useState<DeletedRule>();
  const activeRuleCount = settings.rules.filter((rule) => rule.enabled).length +
    Number(settings.hideSeen) + Number(settings.hideRecommended);

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
    <>
      <SettingsPanelHeader
        title={i18n.t('settings.filters')}
        description={i18n.t('settings.filtersPanelDescription')}
      />

      <section className="master-card" aria-labelledby="master-title">
        <div className="master-icon"><EyeSlash size={28} /></div>
        <div>
          <p>{i18n.t('filter.globalControl')}</p>
          <h2 id="master-title">{i18n.t('filter.displayFilter')}</h2>
          <span>{settings.enabled
            ? i18n.t('filter.activeSummary', activeRuleCount, [formatNumber(activeRuleCount)])
            : i18n.t('filter.pausedSummary')}</span>
        </div>
        <SettingSwitch
          checked={settings.enabled}
          label={i18n.t('filter.masterToggle')}
          disabled={!ready}
          onCheckedChange={(enabled) => saveSettings({ ...settings, enabled })}
        />
      </section>

      <section className="quick-section" aria-labelledby="quick-title">
        <div className="section-title">
          <div>
            <p>{i18n.t('filter.quickRules')}</p>
            <h2 id="quick-title">{i18n.t('filter.quickTitle')}</h2>
          </div>
        </div>
        <div className="quick-grid">
          <article>
            <div className="quick-icon"><Check size={22} /></div>
            <div>
              <h3>{i18n.t('filter.hideSeen')}</h3>
              <p>{i18n.t('filter.hideSeenDescription')}</p>
            </div>
            <SettingSwitch
              checked={settings.hideSeen}
              label={i18n.t('filter.hideSeen')}
              disabled={!ready}
              onCheckedChange={(hideSeen) => saveSettings({ ...settings, hideSeen })}
            />
          </article>
          <article>
            <div className="quick-icon"><Sparkle size={22} /></div>
            <div>
              <h3>{i18n.t('filter.hideRecommended')}</h3>
              <p>{i18n.t('filter.hideRecommendedDescription')}</p>
            </div>
            <SettingSwitch
              checked={settings.hideRecommended}
              label={i18n.t('filter.hideRecommendedToggle')}
              disabled={!ready}
              onCheckedChange={(hideRecommended) => saveSettings({ ...settings, hideRecommended })}
            />
          </article>
        </div>
      </section>

      <section className="rules-section" aria-labelledby="rules-title">
        <div className="section-title rules-heading">
          <div>
            <p>{i18n.t('filter.customRules')}</p>
            <h2 id="rules-title">{i18n.t('filter.customTitle')}</h2>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => setEditingRule(createRule())}
          >
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
            <button type="button" onClick={() => setEditingRule(createRule())}>
              {i18n.t('filter.createRule')}
            </button>
          </div>
        ) : (
          <div className="rule-list">
            {settings.rules.map((rule) => (
              <article className={`rule-card ${rule.enabled ? '' : 'is-disabled'}`} key={rule.id}>
                <div className="rule-card-main">
                  <SettingSwitch
                    checked={rule.enabled}
                    label={i18n.t(
                      rule.enabled ? 'filter.disableRule' : 'filter.enableRule',
                      [rule.name],
                    )}
                    onCheckedChange={(enabled) => saveSettings({
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
                  <button
                    type="button"
                    aria-label={i18n.t('filter.editRule', [rule.name])}
                    onClick={() => setEditingRule(rule)}
                  >
                    <PencilSimple size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label={i18n.t('filter.copyRule', [rule.name])}
                    onClick={() => duplicateRule(rule)}
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label={i18n.t('filter.deleteRule', [rule.name])}
                    onClick={() => deleteRule(rule)}
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {deletedRule && (
        <div className="undo-toast" role="status">
          <span>{i18n.t('filter.deleted', [deletedRule.rule.name])}</span>
          <button type="button" onClick={undoDelete}>{i18n.t('filter.undo')}</button>
        </div>
      )}
    </>
  );
}
