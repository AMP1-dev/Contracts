-- ============================================================
-- CRM de Consultorias — Schema Fase 1
-- Captura automática, leitura inteligente, cadastro automático,
-- Kanban e Dashboard
-- ============================================================

-- ------------------------------------------------------------
-- ENUM: status do Kanban
-- ------------------------------------------------------------
create type status_projeto as enum (
  'novo_contrato',
  'contato_inicial',
  'agendamento',
  'atendimento_realizado',
  'relatorio_elaboracao',
  'relatorio_enviado',
  'nf_pendente',
  'pagamento_aguardando',
  'concluido'
);

-- ------------------------------------------------------------
-- TABELA: consultores
-- (preparada para múltiplos consultores/provedores de e-mail no futuro)
-- ------------------------------------------------------------
create table consultores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  imap_host text,
  imap_usuario text,
  -- nunca armazenar senha em texto puro; usar Supabase Vault ou secret manager
  imap_secret_ref text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- TABELA: campos_configuraveis
-- Permite adicionar novos campos de extração sem alterar a aplicação
-- ------------------------------------------------------------
create table campos_configuraveis (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,        -- ex: 'codigo_rae', 'valor_consultoria'
  rotulo text not null,              -- ex: 'Código RAE'
  tipo text not null default 'texto',-- texto | numero | data | moeda | boolean
  obrigatorio boolean not null default false,
  ordem integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- TABELA: projetos
-- Campos fixos mais comuns + dados_extra (JSONB) para flexibilidade
-- ------------------------------------------------------------
create table projetos (
  id uuid primary key default gen_random_uuid(),
  consultor_id uuid references consultores(id),

  -- identificação
  codigo_rae text unique,
  status status_projeto not null default 'novo_contrato',

  -- cliente
  nome_cliente text,
  razao_social text,
  nome_fantasia text,
  cnpj text,
  cpf text,
  telefone text,
  celular text,
  email_cliente text,
  municipio text,
  estado text,
  endereco text,

  -- atendimento
  programa text,
  solucao_contratada text,
  objetivo_atendimento text,
  horas_contratadas numeric(6,2),
  horas_realizadas numeric(6,2) not null default 0,
  data_prevista_inicio date,
  data_prevista_fim date,
  modalidade text,                   -- presencial | online

  -- financeiro (base — detalhado na Fase 2)
  valor_consultoria numeric(12,2),

  -- extensibilidade
  dados_extra jsonb not null default '{}'::jsonb,
  observacoes text,

  -- rastreabilidade da origem
  email_origem_id text,              -- message-id do e-mail original
  documento_origem_path text,        -- caminho no Storage do PDF lido

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index idx_projetos_status on projetos(status);
create index idx_projetos_cnpj on projetos(cnpj);
create index idx_projetos_consultor on projetos(consultor_id);
create index idx_projetos_dados_extra on projetos using gin (dados_extra);

-- ------------------------------------------------------------
-- TABELA: historico
-- Linha do tempo de cada projeto
-- ------------------------------------------------------------
create table historico (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  evento text not null,              -- ex: 'contrato_recebido', 'cliente_contatado'
  descricao text,
  criado_em timestamptz not null default now()
);

create index idx_historico_projeto on historico(projeto_id);

-- ------------------------------------------------------------
-- TABELA: arquivos
-- Documentos anexados ao projeto (Supabase Storage)
-- ------------------------------------------------------------
create table arquivos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  tipo text not null,                -- contrato | documento_sebrae | relatorio | nf | outro
  nome_arquivo text not null,
  storage_path text not null,
  tamanho_bytes bigint,
  criado_em timestamptz not null default now()
);

create index idx_arquivos_projeto on arquivos(projeto_id);

-- ------------------------------------------------------------
-- TABELA: emails_processados
-- Garante idempotência do polling de e-mail (evita duplicar projeto)
-- ------------------------------------------------------------
create table emails_processados (
  id uuid primary key default gen_random_uuid(),
  consultor_id uuid references consultores(id),
  message_id text not null,
  remetente text,
  assunto text,
  status text not null default 'recebido', -- recebido | lido | processado | erro
  erro_detalhe text,
  projeto_id uuid references projetos(id),
  criado_em timestamptz not null default now(),
  unique (consultor_id, message_id)
);

-- ------------------------------------------------------------
-- Trigger: atualizar_em automático
-- ------------------------------------------------------------
create or replace function set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_projetos_atualizado_em
before update on projetos
for each row execute function set_atualizado_em();

-- ------------------------------------------------------------
-- RLS (ajustar policies conforme autenticação da aplicação)
-- ------------------------------------------------------------
alter table consultores enable row level security;
alter table projetos enable row level security;
alter table historico enable row level security;
alter table arquivos enable row level security;
alter table emails_processados enable row level security;
alter table campos_configuraveis enable row level security;

-- Exemplo inicial: usuário autenticado tem acesso total (refinar depois)
create policy "authenticated_full_access_projetos" on projetos
  for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access_historico" on historico
  for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access_arquivos" on arquivos
  for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access_consultores" on consultores
  for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access_emails" on emails_processados
  for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access_campos" on campos_configuraveis
  for all using (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- Seed inicial: campos configuráveis já mapeados no documento
-- ------------------------------------------------------------
insert into campos_configuraveis (chave, rotulo, tipo, obrigatorio, ordem) values
  ('codigo_rae', 'Código RAE', 'texto', true, 1),
  ('nome_cliente', 'Nome do Cliente', 'texto', true, 2),
  ('razao_social', 'Razão Social', 'texto', false, 3),
  ('nome_fantasia', 'Nome Fantasia', 'texto', false, 4),
  ('cnpj', 'CNPJ', 'texto', false, 5),
  ('cpf', 'CPF', 'texto', false, 6),
  ('telefone', 'Telefone', 'texto', false, 7),
  ('celular', 'Celular', 'texto', false, 8),
  ('email_cliente', 'E-mail', 'texto', false, 9),
  ('municipio', 'Município', 'texto', false, 10),
  ('estado', 'Estado', 'texto', false, 11),
  ('endereco', 'Endereço', 'texto', false, 12),
  ('programa', 'Programa', 'texto', false, 13),
  ('solucao_contratada', 'Solução Contratada', 'texto', false, 14),
  ('objetivo_atendimento', 'Objetivo do Atendimento', 'texto', false, 15),
  ('horas_contratadas', 'Quantidade de Horas', 'numero', false, 16),
  ('data_prevista_inicio', 'Data Prevista (Início)', 'data', false, 17),
  ('valor_consultoria', 'Valor da Consultoria', 'moeda', false, 18);
