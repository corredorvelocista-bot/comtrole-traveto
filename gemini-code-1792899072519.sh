#!/usr/bin/env bash
# ==============================================================================
# Script de Automação: Correção Completa de Conexão e Sincronização (Anotei)
# ==============================================================================

set -e

PROJECT_DIR="anotei"

if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
fi

echo "🚀 Iniciando automação de correção do Anotei..."

# ------------------------------------------------------------------------------
# 1. Ajuste e padronização do arquivo .env
# ------------------------------------------------------------------------------
echo "⚙️ [1/4] Verificando e corrigindo variáveis de ambiente (.env)..."

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "   -> Arquivo .env criado a partir do .env.example."
    else
        cat << 'EOF' > .env
VITE_SUPABASE_URL=https://sua-instancia.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-anon-aqui
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
EOF
        echo "   -> Arquivo .env gerado com modelos padrão."
    fi
fi

# Garantir compatibilidade entre VITE_SUPABASE_PUBLISHABLE_KEY e VITE_SUPABASE_ANON_KEY
if ! grep -q "VITE_SUPABASE_PUBLISHABLE_KEY" .env; then
    ANON_KEY=$(grep "VITE_SUPABASE_ANON_KEY" .env | cut -d '=' -f2-)
    if [ -n "$ANON_KEY" ]; then
        echo "VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY" >> .env
        echo "   -> Mapeamento de VITE_SUPABASE_PUBLISHABLE_KEY ajustado."
    fi
fi

# ------------------------------------------------------------------------------
# 2. Correção da Inicialização do Supabase Client (src/js/SupabaseService.js)
# ------------------------------------------------------------------------------
echo "🛠️ [2/4] Atualizando src/js/SupabaseService.js com fallback de chaves..."

cat << 'EOF' > src/js/SupabaseService.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigurado = Boolean(
    supabaseUrl &&
    supabaseKey &&
    /^https:\/\/.+/.test(supabaseUrl) &&
    !supabaseUrl.includes('sua-instancia.supabase.co')
);

export const supabase = supabaseConfigurado
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    })
    : null;

export async function verificarConexaoSupabase() {
    if (!supabase) {
        return {
            ok: false,
            mensagem: 'Configuração Supabase ausente ou inválida. Verifique o arquivo .env.'
        };
    }

    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        return {
            ok: true,
            mensagem: 'Cliente Supabase conectado com sucesso.',
            sessaoAtiva: Boolean(data.session)
        };
    } catch (err) {
        return {
            ok: false,
            mensagem: err.message || 'Erro ao comunicar com o servidor Supabase.'
        };
    }
}
EOF

# ------------------------------------------------------------------------------
# 3. Consolidação da Migration SQL para o Supabase
# ------------------------------------------------------------------------------
echo "🗄️ [3/4] Gerando Migration SQL Mestra Corrigida em supabase/migrations/..."

mkdir -p supabase/migrations

cat << 'EOF' > supabase/migrations/20261025_anotei_schema_mestre_corrigido.sql
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
EOF

# ------------------------------------------------------------------------------
# 4. Criação do Script de Destravamento de Fila Local
# ------------------------------------------------------------------------------
echo "🧹 [4/4] Criando utilitário JS para destravar fila de sincronização..."

cat << 'EOF' > src/js/LimparFilaSincronizacao.js
/**
 * Utilitário para destravar itens que falharam por conflito no localStorage.
 */
export function destravamentoFilaLocal() {
    const CHAVE_FILA = 'anotei_fila_sincronizacao_v1';
    try {
        const raw = localStorage.getItem(CHAVE_FILA);
        if (!raw) return;
        
        let fila = JSON.parse(raw);
        if (!Array.isArray(fila)) return;

        let alterado = false;
        fila = fila.map(item => {
            if (item.bloqueado) {
                delete item.bloqueado;
                delete item.motivoBloqueio;
                item.tentativas = 0;
                alterado = true;
            }
            return item;
        });

        if (alterado) {
            localStorage.setItem(CHAVE_FILA, JSON.stringify(fila));
            console.log('[Anotei Sync] Fila local destravada com sucesso.');
        }
    } catch (e) {
        console.error('[Anotei Sync] Erro ao limpar fila local:', e);
    }
}
EOF

echo "✅ Correção concluída com sucesso!"
echo "👉 Lembre-se de aplicar o SQL 'supabase/migrations/20261025_anotei_schema_mestre_corrigido.sql' no Dashboard do Supabase (SQL Editor)."
