import { i18n } from '../i18n';
import { handleOpenOptionsMessage } from '../runtimeMessages';

const DISABLED_BADGE_COLOR = '#5f6b7e';

function updateActionState(enabled: boolean): void {
  void chrome.action.setTitle({
    title: enabled
      ? i18n.t('manifest.actionEnabled')
      : i18n.t('manifest.actionDisabled'),
  });
  void chrome.action.setBadgeText({ text: enabled ? '' : 'OFF' });
  if (!enabled) {
    void chrome.action.setBadgeBackgroundColor({ color: DISABLED_BADGE_COLOR });
  }
}

function syncActionState(): void {
  chrome.storage.local.get({ enabled: true }, (stored) => {
    updateActionState(stored.enabled !== false);
  });
}

export default defineBackground({
  type: 'module',
  main() {
    chrome.runtime.onInstalled.addListener((details) => {
      chrome.storage.local.get(['enabled', 'theme', 'colorScheme'], (stored) => {
        const defaults: Record<string, boolean | string> = {};
        if (stored.enabled === undefined) defaults.enabled = true;
        if (stored.theme === undefined) defaults.theme = 'focus-paper';
        if (stored.colorScheme === undefined) defaults.colorScheme = 'light';
        if (Object.keys(defaults).length) chrome.storage.local.set(defaults);
        updateActionState(stored.enabled !== false);
      });

      /** 欢迎页只在首次安装时出现，扩展升级不应打断用户当前浏览。 */
      if (details.reason === 'install') {
        void chrome.tabs.create({ url: chrome.runtime.getURL('/onboarding.html') });
      }
    });

    chrome.runtime.onStartup.addListener(syncActionState);

    /** 工具栏图标始终打开启动中心；全局接管状态由页面内开关明确控制。 */
    chrome.action.onClicked.addListener(() => {
      void chrome.tabs.create({ url: chrome.runtime.getURL('/board.html') });
    });

    /** 内容脚本不直接依赖 openOptionsPage；由 Service Worker 创建扩展设置标签页。 */
    chrome.runtime.onMessage.addListener((message) => {
      handleOpenOptionsMessage(message, () => {
        void chrome.tabs.create({ url: chrome.runtime.getURL('/options.html') });
      });
    });

    /** 页面悬浮开关与启动中心共用同一状态，任一入口变更后都要同步反馈。 */
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes.enabled) return;
      updateActionState(changes.enabled.newValue !== false);
    });

    syncActionState();
  },
});
