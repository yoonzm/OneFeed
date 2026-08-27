import React from 'react';
import ReactDOM from 'react-dom/client';
import { i18n, localizeDocument } from '../../i18n';
import { OptionsApp } from './OptionsApp';
import './style.css';

localizeDocument(i18n.t('page.optionsTitle'), i18n.t('page.optionsDescription'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>,
);
