import React from 'react';
import ReactDOM from 'react-dom/client';
import { i18n, localizeDocument } from '../../i18n';
import { BoardApp } from './BoardApp';
import './style.css';

localizeDocument(i18n.t('page.boardTitle'), i18n.t('page.boardDescription'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BoardApp />
  </React.StrictMode>,
);
