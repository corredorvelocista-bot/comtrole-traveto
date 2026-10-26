-- Migration Mestra Unificada: Anotei
begin;

create extension if not exists pgcrypto;

-- 1. Tabela de Perfis
create table if not exists public.perfis (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  foto_ref text,
  foto_posicao jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- 2. Configurações de Usuário
create table if not exists public.configuracoes_usuario (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  valores jsonb not null default '{}'::jsonb,
  versao bigint not null default 1 check (versao > 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- 3. Semanas de Produção
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

-- 4. Lançamentos de Produção
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

-- 5. Despesas Pessoais (Nome unificado)
create table if not exists public.anotei_despesas_pessoais (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  id_origem text not null,
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
  constraint anotei_despesas_usuario_origem_unique unique (usuario_id, id_origem)
);

-- RLS & Grants
do $$
declare t text;
begin
  foreach t in array array[
    'perfis', 'configuracoes_usuario', 'semanas_producao',
    'lancamentos_producao', 'anotei_despesas_pessoais'
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
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end;
$$;

commit;
