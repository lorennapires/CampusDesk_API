# Frontend de integração

Execute npm ci e npm run dev. No desenvolvimento conjunto, o proxy Vite encaminha /api para 127.0.0.1:3333.

Para publicar no Cloudflare ou outro serviço estático, configure public/config.js com a URL HTTPS pública da porta 3333 do Codespaces, sem /api no final. Execute npm run build e publique dist. O arquivo src/service.js usa somente fetch, sem dados simulados. O backend precisa estar ativo e com CORS habilitado (já fornecido no esqueleto).
