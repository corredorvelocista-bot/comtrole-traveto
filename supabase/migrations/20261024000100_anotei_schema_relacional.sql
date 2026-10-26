-- Anotei — esquema relacional inicial (RASCUNHO PARA REVISÃO)
-- PostgreSQL / Supabase. NÃO executar em produção sem revisão e testes.
-- Este arquivo cria tabelas novas; não apaga nem altera tabelas existentes.
-- Dados legados são preservados em source_payload quando a aplicação migrar registros.

begin;

create extension if not exists pgcrypto;

-- Perfil público vinculado à identidade gerida pelo Supabase Auth.
create table if not exists public.perfis (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  foto_ref text,
  foto_posicao jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Preferências e configurações do Anotei. O JSONB permite evolução sem perder
-- configurações antigas; nomes locais continuam mapeados pela camada JS.
create table if not exists public.configuracoes_usuario (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  valores jsonb not null default jsonb_build_object(
    'metaSemanal', 500.00,
    'semanaPadrao', 'atual',
    'dataSemana', '',
    'formatoNumeros', 'milhar',
    'confirmacaoSalvar', 'perguntar',
    'valorUnitario', 0.21,
    'custoFixoMensal', 0.00,
    'retiradaSemanalDesejada', 0.00,
    'modoPlanejamentoFinanceiro', 'meta_semanal',
    'modoCalculoFinanceiro', 'liquido',
    'somLancamento', true,
    'somMeta', true,
    'confeteMeta', true
  ),
  versao bigint not null default 1 check (versao > 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Semana fechada. Datas reais ficam nullable porque os dados legados podem
-- conter apenas rótulos como "Semana Atual" ou datas sem ano confiável.
create table if not exists public.semanas_producao (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  id_origem text,
  periodo_label text not null default '',
  data_inicio date,
  data_fim date,
  pecas_total numeric(14,2) not null default 0 check (pecas_total >= 0),
  valor_total numeric(14,2) not null default 0 check (valor_total >= 0),
  fechada_em timestamptz,
  source_payload jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (usuario_id, id_origem)
);
create index if not exists semanas_producao_usuario_periodo_idx
  on public.semanas_producao (usuario_id, data_inicio desc, data_fim desc);

-- Lançamentos individuais. `id_origem` preserva IDs numéricos/string legados
-- sem forçar conversão; `data_texto` mantém datas ambíguas como DD/MM.
create table if not exists public.lancamentos_producao (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  semana_id uuid references public.semanas_producao(id) on delete set null,
  id_origem text,
  estado text not null default 'aberto' check (estado in ('aberto', 'fechado')),
  data_producao date,
  data_texto text not null default '',
  data_completa_texto text,
  semana_referencia text,
  texto_original text not null default '',
  texto_bruto text,
  pecas numeric(14,2) not null default 0 check (pecas >= 0),
  valor_unitario numeric(14,4) not null default 0.21 check (valor_unitario >= 0),
  valor_total numeric(14,2) not null default 0 check (valor_total >= 0),
  detalhes jsonb not null default '[]'::jsonb,
  source_payload jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (usuario_id, id_origem)
);
create index if not exists lancamentos_producao_usuario_data_idx
  on public.lancamentos_producao (usuario_id, data_producao desc);
create index if not exists lancamentos_producao_usuario_estado_idx
  on public.lancamentos_producao (usuario_id, estado, semana_referencia);
create index if not exists lancamentos_producao_semana_idx
  on public.lancamentos_producao (semana_id);

-- Despesas pessoais. `source_payload` preserva campos extras e aliases legados
-- durante a migração; não presumir que todo registro antigo tem data ISO.
create table if not exists public.despesas_pessoais (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  id_origem text,
  descricao text not null default '',
  categoria text not null default '',
  semana_referencia text,
  valor numeric(14,2) not null default 0 check (valor >= 0),
  data_despesa date,
  data_texto text,
  tipo text,
  observacao text not null default '',
  source_payload jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (usuario_id, id_origem)
);
create index if not exists despesas_pessoais_usuario_data_idx
  on public.despesas_pessoais (usuario_id, data_despesa desc);
create index if not exists despesas_pessoais_usuario_categoria_idx
  on public.despesas_pessoais (usuario_id, categoria);

-- Estado de sincronização por dispositivo. Não guarda conteúdo completo do
-- snapshot; só controle de versão e estado necessário para diagnosticar conflitos.
create table if not exists public.dispositivos_sincronizacao (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  dispositivo_id text not null,
  nome_dispositivo text,
  schema_version integer not null default 1 check (schema_version > 0),
  ultima_versao_confirmada bigint not null default 0 check (ultima_versao_confirmada >= 0),
  ultima_sincronizacao_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (usuario_id, dispositivo_id)
);

-- Registro de conflitos para diagnóstico. O payload local/remoto completo não
-- é armazenado aqui por padrão para evitar cópia desnecessária de dados pessoais.
create table if not exists public.conflitos_sincronizacao (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  dispositivo_id text,
  entidade text not null,
  entidade_id text,
  versao_esperada bigint,
  versao_encontrada bigint,
  estado text not null default 'pendente'
    check (estado in ('pendente', 'resolvido_local', 'resolvido_remoto', 'mesclado', 'descartado')),
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz
);
create index if not exists conflitos_sincronizacao_usuario_estado_idx
  on public.conflitos_sincronizacao (usuario_id, estado, criado_em desc);

-- Preferências da integração contábil. Tokens OAuth não devem ser guardados
-- nesta tabela nem em localStorage; autenticação Google deve ser revista à parte.
create table if not exists public.integracoes_contabeis (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  provedor text not null default 'google_sheets' check (provedor in ('google_sheets')),
  ativa boolean not null default false,
  planilha_id text,
  nome_planilha text,
  ultima_sincronizacao_em timestamptz,
  estado_sincronizacao text not null default 'nao_configurada'
    check (estado_sincronizacao in ('nao_configurada', 'ativa', 'pausada', 'erro')),
  mensagem_erro text,
  configuracoes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (usuario_id, provedor)
);

-- Histórico de exportações solicitadas manualmente. Não implica envio automático.
create table if not exists public.exportacoes_contabeis (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  formato text not null check (formato in ('csv', 'xlsx', 'pdf')),
  data_inicio date,
  data_fim date,
  estado text not null default 'solicitada'
    check (estado in ('solicitada', 'gerada', 'falhou')),
  nome_arquivo text,
  arquivo_ref text,
  filtros jsonb not null default '{}'::jsonb,
  resumo jsonb not null default '{}'::jsonb,
  erro text,
  solicitada_em timestamptz not null default now(),
  concluida_em timestamptz,
  check (data_inicio is null or data_fim is null or data_inicio <= data_fim)
);
create index if not exists exportacoes_contabeis_usuario_data_idx
  on public.exportacoes_contabeis (usuario_id, solicitada_em desc);

-- Atualiza timestamps gerenciados pelo servidor.
create or replace function public.anotei_set_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'perfis', 'configuracoes_usuario', 'semanas_producao',
    'lancamentos_producao', 'despesas_pessoais',
    'dispositivos_sincronizacao', 'integracoes_contabeis'
  ] loop
    execute format('drop trigger if exists trg_%I_atualizado_em on public.%I', t, t);
    execute format('create trigger trg_%I_atualizado_em before update on public.%I for each row execute function public.anotei_set_atualizado_em()', t, t);
  end loop;
end;
$$;

-- RLS: cada pessoa acessa somente linhas cujo usuario_id é sua identidade.
-- Tabelas privadas: sem políticas permissivas para anon.
do $$
declare t text;
begin
  foreach t in array array[
    'perfis', 'configuracoes_usuario', 'semanas_producao',
    'lancamentos_producao', 'despesas_pessoais',
    'dispositivos_sincronizacao', 'conflitos_sincronizacao',
    'integracoes_contabeis', 'exportacoes_contabeis'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'anotei_select_own_' || t, t);
    execute format('drop policy if exists %I on public.%I', 'anotei_insert_own_' || t, t);
    execute format('drop policy if exists %I on public.%I', 'anotei_update_own_' || t, t);
    execute format('drop policy if exists %I on public.%I', 'anotei_delete_own_' || t, t);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = usuario_id)', 'anotei_select_own_' || t, t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = usuario_id)', 'anotei_insert_own_' || t, t);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id)', 'anotei_update_own_' || t, t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = usuario_id)', 'anotei_delete_own_' || t, t);
  end loop;
end;
$$;

-- O perfil pode ser criado automaticamente quando uma conta Auth é criada.
create or replace function public.anotei_criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (usuario_id, nome)
  values (new.id, nullif(new.raw_user_meta_data ->> 'name', ''))
  on conflict (usuario_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_anotei on auth.users;
create trigger on_auth_user_created_anotei
after insert on auth.users
for each row execute function public.anotei_criar_perfil();

-- Permissões explícitas para usuários autenticados; RLS continua restringindo linhas.
grant select, insert, update, delete on
  public.perfis,
  public.configuracoes_usuario,
  public.semanas_producao,
  public.lancamentos_producao,
  public.despesas_pessoais,
  public.dispositivos_sincronizacao,
  public.conflitos_sincronizacao,
  public.integracoes_contabeis,
  public.exportacoes_contabeis
 to authenticated;

commit;
