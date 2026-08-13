import React from 'react';
import ReactDOM from 'react-dom/client';
import { BoardApp } from './BoardApp';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BoardApp />
  </React.StrictMode>,
);
