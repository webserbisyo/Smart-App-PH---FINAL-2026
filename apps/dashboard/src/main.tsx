import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { releaseBootSplash } from './app/boot-splash.js';
import { listenForNewVersion } from './app/new-version.js';

listenForNewVersion();
releaseBootSplash();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
