import * as Tabs from '@radix-ui/react-tabs';
import { CaretRight, LockKey } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { i18n } from '../../../i18n';

export interface SettingsCategory {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
  content: ReactNode;
}

interface SettingsLayoutProps {
  categories: SettingsCategory[];
}

/**
 * 分类元数据集中在调用方；增加设置类别时，只需注册一个菜单项和对应面板。
 * forceMount 保留切换分类前尚未保存的表单草稿，CSS 负责隐藏非活动面板。
 */
export function SettingsLayout({ categories }: SettingsLayoutProps) {
  const firstCategory = categories[0];
  if (!firstCategory) return null;

  return (
    <Tabs.Root
      className="settings-workspace"
      defaultValue={firstCategory.id}
      orientation="vertical"
    >
      <aside className="settings-sidebar" aria-label={i18n.t('filter.categories')}>
        <div className="settings-sidebar-heading">
          <h1>{i18n.t('settings.title')}</h1>
          <p>{i18n.t('settings.description')}</p>
        </div>

        <Tabs.List className="settings-menu" aria-label={i18n.t('filter.categories')}>
          {categories.map((category) => (
            <Tabs.Trigger
              className="settings-menu-item"
              key={category.id}
              value={category.id}
            >
              <span className="settings-menu-icon" aria-hidden="true">{category.icon}</span>
              <span className="settings-menu-copy">
                <strong>{category.label}</strong>
                <small>{category.description}</small>
              </span>
              <CaretRight className="settings-menu-caret" size={16} aria-hidden="true" />
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="settings-local-note">
          <LockKey size={16} aria-hidden="true" />
          <div>
            <strong>{i18n.t('settings.localTitle')}</strong>
            <span>{i18n.t('settings.localDescription')}</span>
          </div>
        </div>
      </aside>

      <div className="settings-content">
        {categories.map((category) => (
          <Tabs.Content
            className="settings-panel"
            forceMount
            key={category.id}
            value={category.id}
          >
            {category.content}
          </Tabs.Content>
        ))}
      </div>
    </Tabs.Root>
  );
}

interface SettingsPanelHeaderProps {
  title: string;
  description: string;
}

export function SettingsPanelHeader({ title, description }: SettingsPanelHeaderProps) {
  return (
    <header className="settings-panel-header">
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  );
}
