import React from 'react';
import ReactDOM from 'react-dom/client';
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