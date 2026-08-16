import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { clearChunkReloadFlag } from './app/lazyWithRetry';
import './index.css';

clearChunkReloadFlag();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
