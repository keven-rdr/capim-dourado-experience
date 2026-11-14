import { CAPI_ART } from '@cde/ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { CONSOLE_ART } from './lib/eggs';

// recado para quem abre o console (ovo escondido)
console.log(`%c${CONSOLE_ART}`, 'color:#b06f45;font-weight:bold;font-family:monospace');

// a Capi da biblioteca passa a usar a imagem do modelo 3D (gerada de public/models/capi.glb)
CAPI_ART.full = '/capi.webp';
CAPI_ART.face = '/capi-rosto.webp';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
