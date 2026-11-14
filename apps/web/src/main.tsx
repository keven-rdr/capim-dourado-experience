import { CAPI_ART } from '@cde/ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { CONSOLE_ART } from './lib/eggs';

// recado para quem abre o console (ovo escondido)
console.log(`%c${CONSOLE_ART}`, 'color:#b06f45;font-weight:bold;font-family:monospace');

// a Capi da biblioteca usa imagens dos modelos 3D (public/models), com a roupa de cada tema
CAPI_ART.full = '/capi.webp';
CAPI_ART.face = '/capi-rosto.webp';
CAPI_ART.bySeason = {
  natal: { full: '/capi-natal.webp', face: '/capi-natal-rosto.webp' },
  halloween: { full: '/capi-bf.webp', face: '/capi-bf-rosto.webp' },
};

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
