import { FloatingCapi, usePortalTarget } from '@cde/ui';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

/** Na tela inicial, a bolinha abre o chat da Capi. */
export function ChatShortcut() {
  const target = usePortalTarget();
  const navigate = useNavigate();
  if (!target) return null;
  return createPortal(
    <FloatingCapi
      label="Conversar com a Capi; arraste para mover"
      imageSrc="/capi-rosto.webp"
      onActivate={() => navigate('/chat')}
    />,
    target,
  );
}
