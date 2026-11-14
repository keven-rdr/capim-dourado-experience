# Revisão de componentização

Revisão por leitura do código, concentrada em interfaces repetidas; não é uma auditoria visual completa de todas as telas.

- **Resolvido:** a bolinha da Capi na Home e a Capi minimizada das demais telas usam `FloatingCapi` de `packages/ui`. A bolinha é semitransparente em repouso e se encaixa na borda mais próxima ao ser solta; a ação ao tocar é configurada pela tela. A posição antiga salva da companheira continua sendo lida.
- **Formulários:** `apps/web/src/screens/MerchantPromotions.tsx`, `StorePanel.tsx`, `Onboarding.tsx` e `Profile.tsx` têm campos com estilos e estados parecidos. Um campo e um seletor acessíveis em `packages/ui` reduziriam a duplicação. Preservar rótulos e validações próprios de cada fluxo.
- **Cabeçalhos e voltar:** `apps/web/src/layout/Screen.tsx` oferece cabeçalho comum, mas `StorePanel.tsx` e o chat têm variações próprias. Avaliar propriedades e um botão de voltar reutilizável sem apagar as diferenças visuais previstas.
- **Chat:** `apps/web/src/screens/Chat.css` usa cores fixas e componentes próprios para balões, ações e campo de entrada. Avaliar tokens sazonais e extração das peças que serão reutilizadas, mantendo o desenho solicitado para a Capi.
- **Catálogo e cartões:** `apps/web/src/layout/Product.tsx` concentra a vitrine e já é reutilizado; suas ações circulares e as de outras telas merecem comparação com `Button` antes de extrair outra variante.

Essas oportunidades não foram alteradas nesta entrega para evitar mudar fluxos e visuais além da bolinha solicitada.
