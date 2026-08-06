export default defineBackground({
  type: 'module',
  main() {
    chrome.runtime.onInstalled.addListener(() => {
      chrome.storage.local.get(['enabled'], (stored) => {
        if (stored.enabled === undefined) {
          chrome.storage.local.set({ enabled: true, theme: 'focus-paper' });
        }
      });
    });
  },
});
