-- Remove os módulos Conteúdo, Campanhas, Eventos, Projetos e Instagram
-- (decisão do usuário: não fazem parte do escopo real de uso).
ALTER TABLE arquivos DROP COLUMN IF EXISTS projeto_id;
ALTER TABLE arquivos DROP COLUMN IF EXISTS evento_id;
ALTER TABLE arquivos DROP COLUMN IF EXISTS conteudo_id;

DROP TABLE IF EXISTS conteudos CASCADE;
DROP TABLE IF EXISTS eventos CASCADE;
DROP TABLE IF EXISTS campanhas CASCADE;
DROP TABLE IF EXISTS projeto_milestones CASCADE;
DROP TABLE IF EXISTS projetos CASCADE;
DROP TABLE IF EXISTS instagram_conteudos CASCADE;
DROP TABLE IF EXISTS instagram_metricas_conta CASCADE;
