export default defineBackground({
  type: 'module',
  main() {
    chrome.runtime.onInstalled.addListener(() => {
      chrome.storage.local.get(['enabled', 'theme', 'colorScheme'], (stored) => {
        const defaults: Record<string, boolean | string> = {};
        if (stored.enabled === undefined) defaults.enabled = true;
        if (stored.theme === undefined) defaults.theme = 'focus-paper';
        if (stored.colorScheme === undefined) defaults.colorScheme = 'light';
        if (Object.keys(defaults).length) chrome.storage.local.set(defaults);
      });
    });
  },
});
