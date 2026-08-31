import {
  getLanguageRedirect,
  languagePreferenceKey,
  resolvePreferredLanguage,
} from './language-routing.js';

function readLanguagePreference() {
  try {
    return window.localStorage.getItem(languagePreferenceKey);
  } catch {
    return null;
  }
}

function saveLanguagePreference(language) {
  try {
    window.localStorage.setItem(languagePreferenceKey, language);
  } catch {
    // Language switching must still work when storage is unavailable.
  }
}

const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
const preferredLanguage = resolvePreferredLanguage(browserLanguages, readLanguagePreference());
const languageRedirect = getLanguageRedirect(window.location.pathname, preferredLanguage);

if (languageRedirect) {
  window.location.replace(`${languageRedirect}${window.location.search}${window.location.hash}`);
}

document.querySelectorAll('[data-language-choice]').forEach((link) => {
  link.addEventListener('click', () => {
    saveLanguagePreference(link.dataset.languageChoice);
  });
});

const navToggle = document.querySelector('[data-nav-toggle]');
const siteHeader = document.querySelector('[data-site-header]');

function closeNavigation() {
  if (!navToggle || !siteHeader) return;
  siteHeader.classList.remove('nav-open');
  navToggle.setAttribute('aria-expanded', 'false');
}

navToggle?.addEventListener('click', () => {
  if (!siteHeader) return;
  const isOpen = siteHeader.classList.toggle('nav-open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

siteHeader?.querySelectorAll('nav a').forEach((link) => {
  link.addEventListener('click', closeNavigation);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeNavigation();
});

document.querySelectorAll('[data-demo]').forEach((demo) => {
  const buttons = demo.querySelectorAll('[data-demo-mode]');
  const panels = demo.querySelectorAll('[data-demo-panel]');
  const status = demo.querySelector('[data-demo-status]');

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.demoMode;

      buttons.forEach((item) => {
        item.setAttribute('aria-pressed', String(item === button));
      });

      panels.forEach((panel) => {
        panel.hidden = panel.dataset.demoPanel !== mode;
      });

      if (status) status.textContent = button.dataset.status ?? '';
    });
  });
});

document.querySelectorAll('[data-current-year]').forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});
