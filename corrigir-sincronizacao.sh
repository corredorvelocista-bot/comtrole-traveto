#!/usr/bin/env bash
set -Eeuo pipefail

echo "=== ANOTEI | DIAGNÓSTICO DA SINCRONIZAÇÃO ==="

if [[ ! -f src/js/app.js ||
      ! -f src/js/StorageService.js ||
      ! -f src/js/SupabaseRelacionalService.js ||
      ! -f src/js/historico.js ]]; then
    echo "ERRO: arquivos esperados não encontrados."
    echo "Execute na raiz do projeto Anotei."
    exit 1
fi

# Preserva uma cópia dos arquivos antes de qualquer correção.
BACKUP="backup-sincronizacao-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP/src/js"

for arquivo in app.js StorageService.js SupabaseRelacionalService.js historico.js; do
    cp -p "src/js/$arquivo" "$BACKUP/src/js/$arquivo"
done

echo
echo "Backup criado em: $BACKUP"
echo
echo "=== Verificando métodos de sincronização ==="

grep -nE \
'carregarLancamentosRemotos|removerLancamento|listarLancamentos|salvarLancamento|excluirLancamento|salvarLancamentosTemporarios' \
src/js/app.js \
src/js/StorageService.js \
src/js/SupabaseRelacionalService.js \
src/js/historico.js || true

echo
echo "=== Verificando referências e IDs ==="

grep -nE \
'id_origem|source_payload|temp_lancamentos|lancamentos_producao|usuario_id' \
src/js/app.js \
src/js/StorageService.js \
src/js/SupabaseRelacionalService.js \
src/js/historico.js || true

echo
echo "=== Verificando sintaxe JavaScript ==="

if command -v node >/dev/null 2>&1; then
    for arquivo in \
        src/js/app.js \
        src/js/StorageService.js \
        src/js/SupabaseRelacionalService.js \
        src/js/historico.js; do
        if node --check "$arquivo"; then
            echo "OK: $arquivo"
        else
            echo "ERRO DE SINTAXE: $arquivo"
            echo "Nenhum arquivo original foi alterado por este diagnóstico."
            exit 1
        fi
    done
else
    echo "AVISO: Node.js não está instalado ou não está no PATH."
    echo "A verificação de sintaxe foi ignorada."
fi

echo
echo "=== Resultado ==="
echo "Diagnóstico concluído."
echo "Os arquivos originais permanecem intactos."
echo "O backup está em: $BACKUP"
echo
echo "IMPORTANTE:"
echo "- A exclusão local não garante exclusão no Supabase."
echo "- O carregamento remoto pode restaurar registros antigos."
echo "- A correção definitiva exige ajustar os métodos identificados,"
echo "  preservando IDs estáveis e registros locais ainda não sincronizados."
echo "- Este script não exclui nem modifica registros no Supabase."
