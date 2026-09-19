# Central Evolução

Sistema de organização e gestão do trabalho de marketing e comunicação do
Colégio Evolução. Arquitetura: `Frontend → Nginx → API própria → PostgreSQL`,
hospedado em VPS própria (Hostinger), sem depender de Google Apps Script ou
Google Sheets como backend.

## Status

**Todos os 11 módulos implementados** sobre a nova arquitetura própria
(API Node.js + PostgreSQL): Central, Agenda, Calendário, Tarefas, Conteúdo,
Campanhas, Eventos, Projetos, Arquivos, Instagram e Relatórios.

Simplificações conscientes em relação ao prompt funcional completo, a
detalhar/expandir em etapas futuras se necessário:
- **Instagram**: implementado cadastro de conteúdos e métricas de conta,
  resumo, ranking por engajamento e comparação entre as duas contas. A
  camada de "inteligência de conteúdo" mais avançada do prompt (score 0–100,
  benchmarks por pilar/tema/horário, snapshots mensais, metas) não foi
  construída nesta etapa.
- **Eventos**: checklist operacional livre (JSON) existe no banco mas ainda
  sem tela de edição — só as 4 etapas fixas (Divulgação/Foto/Vídeo/Pós-evento)
  têm UI.
- Falta autenticação de usuário (a API não exige login ainda).
- O deploy real na Hostinger VPS não foi executado nesta sessão — o guia em
  `infra/DEPLOY.md` está pronto para isso.

Ainda restam: implantação de fato na VPS, autenticação e a etapa de
migração dos dados antigos (Google Sheets/Apps Script) para o PostgreSQL.

## Estrutura

```
backend/    API Node.js + Express + PostgreSQL
frontend/   HTML/CSS/JS estático, servido pelo Nginx em produção
infra/      Configuração de Nginx e passo a passo de deploy na VPS
```

## Rodando localmente

Requer PostgreSQL e Node.js instalados.

```bash
# 1. Banco
sudo -u postgres psql -c "CREATE USER central_evo WITH PASSWORD 'central_evo_dev';"
sudo -u postgres psql -c "CREATE DATABASE central_evo_homolog OWNER central_evo;"

# 2. API
cd backend
cp .env.example .env   # ajuste as credenciais se necessário
npm install
npm run migrate
npm start               # API em http://localhost:3001

# 3. Frontend (em outro terminal)
cd frontend
npx http-server -p 8080 .   # ou qualquer servidor estático
```

Acesse `http://localhost:8080` para a Central e
`http://localhost:8080/tarefas.html` para o módulo Tarefas.

Veja `infra/DEPLOY.md` para o passo a passo de publicação na Hostinger VPS.
