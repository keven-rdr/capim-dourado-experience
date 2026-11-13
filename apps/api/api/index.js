// Função da Vercel. Reexporta a API já compilada por `npm run build -w @cde/api` (pasta dist).
// NÃO TESTADO na Vercel: veja apps/api/README.md.
export { DELETE, GET, HEAD, OPTIONS, PATCH, POST } from '../dist/vercel.js';
