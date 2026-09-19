# Central Evolução

Sistema de organização e gestão do trabalho de marketing e comunicação do
Colégio Evolução. Arquitetura: `Frontend → Nginx → API própria → PostgreSQL`,
hospedado em VPS própria (Hostinger), sem depender de Google Apps Script ou
Google Sheets como backend.

## Status

**5 módulos implementados** sobre a nova arquitetura própria (API Node.js +
PostgreSQL): Central, Agenda, Calendário, Tarefas e Arquivos.

Conteúdo, Campanhas, Eventos, Projetos e Instagram foram removidos por
decisão do usuário (não fazem parte do escopo real de uso) — código,
telas e tabelas do banco foram excluídos (migration `010_remove_modulos.sql`).
O Calendário e os Relatórios foram ajustados para não depender mais deles
(agregam apenas Agenda + Tarefas).

Pendências conhecidas:
- Falta autenticação de usuário (a API não exige login ainda).
- O deploy real na Hostinger VPS não foi executado nesta sessão — o guia em
  `infra/DEPLOY.md` está pronto para isso.
- Redesign visual em andamento para aproximar do padrão de referência do
  usuário (pills de navegação, cores por segmento, cards de destaque).

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
