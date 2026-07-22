-- ============================================================
-- Migração 002 — suporte ao polling de e-mail (Edge Function poll-emails)
-- ============================================================

-- domínio a ser monitorado por consultor (ex: 'sebrae.com.br')
alter table consultores
  add column if not exists dominio_filtro text not null default 'sebrae.com.br';

-- rastreio do anexo baixado antes de virar um "arquivo" formal do projeto
alter table emails_processados
  add column if not exists anexo_storage_path text,
  add column if not exists anexo_nome text;

-- bucket de storage para anexos recém-capturados (staging, antes do cadastro do projeto)
insert into storage.buckets (id, name, public)
values ('contratos-staging', 'contratos-staging', false)
on conflict (id) do nothing;
