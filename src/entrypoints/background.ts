const ENABLED_ACTION_TITLE = 'OneFeed 已开启，点击暂停';
const DISABLED_ACTION_TITLE = 'OneFeed 已暂停，点击开启';
const DISABLED_BADGE_COLOR = '#5f6b7e';

function updateActionState(enabled: boolean): void {
  void chrome.action.setTitle({
    title: enabled ? ENABLED_ACTION_TITLE : DISABLED_ACTION_TITLE,
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

    /** 工具栏图标只切换 OneFeed 的全局接管状态，不会禁用扩展本身。 */
    chrome.action.onClicked.addListener(() => {
      chrome.storage.local.get({ enabled: true }, (stored) => {
        chrome.storage.local.set({ enabled: stored.enabled === false });
      });
    });

    /** 页面悬浮开关与工具栏共用同一状态，任一入口变更后都要同步反馈。 */
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes.enabled) return;
      updateActionState(changes.enabled.newValue !== false);
    });

    syncActionState();
  },
});
