import React from 'react';
import ReactDOM from 'react-dom/client';
import { i18n, localizeDocument } from '../../i18n';
import { OnboardingApp } from './OnboardingApp';
import './style.css';

localizeDocument(i18n.t('page.onboardingTitle'), i18n.t('page.onboardingDescription'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OnboardingApp />
  </React.StrictMode>,
);
