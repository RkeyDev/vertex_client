import React from 'react';
import ReactDOM from 'react-dom/client';

// ==============================================================================
// WEB SECURE CONTEXT POLYFILL
// Ensures crypto.randomUUID is defined even when running under unsecure contexts
// (like http://host.docker.internal inside headless Docker/Playwright contexts)
// ==============================================================================
if (typeof window !== 'undefined' && (!window.crypto || !window.crypto.randomUUID)) {
  if (!window.crypto) {
    (window as any).crypto = {} as Crypto;
  }
  
  window.crypto.randomUUID = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }) as any; // Cast to bypass strict template literal type validation
  };
  console.warn('[Polyfill] Insecure context detected: crypto.randomUUID polyfill successfully injected.');
}

import App from './App';
import './index.css'; // Load Tailwind

/**
 * This is the entry point of the application.
 * It mounts the React component tree into the 'root' DOM element.
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);