import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite HMR websocket connection errors in container preview environment
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || event.reason?.toString() || '';
  if (msg.includes('WebSocket') || msg.includes('websocket')) {
    event.preventDefault();
    event.stopImmediatePropagation?.();
  }
}, true);

window.addEventListener('error', (event) => {
  const msg = event.message || '';
  if (msg.includes('WebSocket') || msg.includes('websocket') || msg.includes('[vite]')) {
    event.preventDefault();
    event.stopImmediatePropagation?.();
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

