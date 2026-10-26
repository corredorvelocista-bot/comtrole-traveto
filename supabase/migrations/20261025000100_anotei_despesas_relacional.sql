-- Anotei: tabela relacional dedicada para sincronização de despesas.
-- A tabela legada public.despesas_pessoais é mantida intacta porque seu esquema
-- existente não contém usuario_id. Não copiar nem alterar registros legados.
begin;

create extension if not exists pgcrypto;

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

create index if not exists anotei_despesas_usuario_data_idx
  on public.anotei_despesas_pessoais (usuario_id, data_despesa desc);
create index if not exists anotei_despesas_usuario_categoria_idx
  on public.anotei_despesas_pessoais (usuario_id, categoria);

alter table public.anotei_despesas_pessoais enable row level security;
drop policy if exists anotei_despesas_select_own on public.anotei_despesas_pessoais;
drop policy if exists anotei_despesas_insert_own on public.anotei_despesas_pessoais;
drop policy if exists anotei_despesas_update_own on public.anotei_despesas_pessoais;
drop policy if exists anotei_despesas_delete_own on public.anotei_despesas_pessoais;
create policy anotei_despesas_select_own on public.anotei_despesas_pessoais
  for select to authenticated using ((select auth.uid()) = usuario_id);
create policy anotei_despesas_insert_own on public.anotei_despesas_pessoais
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy anotei_despesas_update_own on public.anotei_despesas_pessoais
  for update to authenticated using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);
create policy anotei_despesas_delete_own on public.anotei_despesas_pessoais
  for delete to authenticated using ((select auth.uid()) = usuario_id);

grant select, insert, update, delete on public.anotei_despesas_pessoais to authenticated;
commit;
