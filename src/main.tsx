import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

function setEmojiFavicon(emoji: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');

  if (!context) return;

  context.clearRect(0, 0, 64, 64);
  context.font = '52px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(emoji, 32, 36);

  const favicon = document.querySelector("link[rel='icon']") ?? document.createElement('link');
  favicon.setAttribute('rel', 'icon');
  favicon.setAttribute('href', canvas.toDataURL('image/png'));

  if (!favicon.parentNode) {
    document.head.appendChild(favicon);
  }
}

setEmojiFavicon('🪞');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
