from pathlib import Path
from datetime import datetime
import re
import shutil
import sys

BASE = Path("src/js")
ARQUIVOS = [
    BASE / "app.js",
    BASE / "SupabaseRelacionalService.js",
    BASE / "historico.js",
]

for arquivo in ARQUIVOS:
    if not arquivo.is_file():
        sys.exit(f"ERRO: arquivo não encontrado: {arquivo}")

app_path = BASE / "app.js"
service_path = BASE / "SupabaseRelacionalService.js"
history_path = BASE / "historico.js"

app = app_path.read_text(encoding="utf-8")
service = service_path.read_text(encoding="utf-8")
history = history_path.read_text(encoding="utf-8")

# Não aplicar novamente sobre arquivos já corrigidos.
if "async excluirLancamentoPorOrigem(" in service:
    sys.exit(
        "O método de exclusão remota já existe. "
        "Nenhum arquivo foi alterado para evitar duplicação."
    )

# 1. Validar o método da tela principal.
inicio = app.find("    async removerLancamento(index) {")
if inicio < 0:
    sys.exit("ERRO: método removerLancamento(index) não encontrado.")

marcador_fim = "    // EDITAR LANÇAMENTO"
fim = app.find(marcador_fim, inicio)
if fim < 0:
    sys.exit("ERRO: limite do método de exclusão não encontrado.")

bloco_antigo = app[inicio:fim]
if "this.lancamentosAtuais.splice" not in bloco_antigo:
    sys.exit("ERRO: estrutura inesperada em removerLancamento().")

novo_metodo = """    async removerLancamento(index) {
        if (
            index < 0 ||
            index >= this.lancamentosAtuais.length
        ) {
            return;
        }

        const lancamento = this.lancamentosAtuais[index];
        if (!lancamento) return;

        if (!confirm('Deseja realmente excluir este lançamento?')) {
            return;
        }

        const origem = lancamento.id_origem ?? lancamento.id;
        if (origem === undefined || origem === null ||
            String(origem).trim() === '') {
            alert(
                'Não foi possível identificar este lançamento. ' +
                'Nenhum dado foi removido.'
            );
            return;
        }

        try {
            if (supabaseConfigurado) {
                await this.supabaseRelacionalService
                    .excluirLancamentoPorOrigem(origem);
            }

            this.lancamentosAtuais.splice(index, 1);
            this.storage.salvarLancamentosTemporarios(
                this.lancamentosAtuais
            );

            await this.render();
        } catch (erro) {
            console.error(
                '[Anotei Sync] Falha ao excluir lançamento:',
                erro
            );
            alert(
                'A exclusão no servidor falhou. ' +
                'O lançamento foi mantido na tela. ' +
                'Confira a conexão e as permissões do Supabase.'
            );
        }
    }

"""

app_novo = app[:inicio] + novo_metodo + app[fim:]

# 2. Adicionar exclusão remota segura por usuário e ID de origem.
marcador_service = "  async listarSemanas("
pos_service = service.find(marcador_service)
if pos_service < 0:
    sys.exit("ERRO: ponto de inserção do serviço Supabase não encontrado.")

novo_service = """  async excluirLancamentoPorOrigem(idOrigem) {
    const client = this.exigirCliente();
    const user = await this.obterUsuarioAtual();

    if (
      idOrigem === undefined ||
      idOrigem === null ||
      String(idOrigem).trim() === ''
    ) {
      throw new TypeError('ID de origem do lançamento inválido.');
    }

    const { data, error } = await client
      .from('lancamentos_producao')
      .delete()
      .eq('usuario_id', user.id)
      .eq('id_origem', String(idOrigem))
      .select('id_origem');

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error(
        'Nenhum lançamento remoto foi excluído. ' +
        'Verifique o ID de origem e as políticas RLS.'
      );
    }

    return true;
  }

"""

service_novo = (
    service[:pos_service] + novo_service + service[pos_service:]
)

# 3. Corrigir também a exclusão pela tela de histórico.
alvo_history = """                const sucesso =
                    await storage.excluirLancamento(
                        semana.id,
                        indiceLancamento
                    );"""

if alvo_history not in history:
    sys.exit(
        "ERRO: bloco esperado da exclusão no histórico não encontrado. "
        "Nenhum arquivo foi alterado."
    )

novo_history = """                // Excluir primeiro no servidor para evitar que
                // a próxima sincronização restaure o lançamento.
                const servicoRemoto =
                    window.app?.supabaseRelacionalService;

                if (servicoRemoto) {
                    const origem =
                        registro.id_origem ?? registro.id;

                    if (
                        origem === undefined ||
                        origem === null ||
                        String(origem).trim() === ''
                    ) {
                        window.alert(
                            'O lançamento não possui ID de origem. ' +
                            'Nenhum dado foi removido.'
                        );
                        return;
                    }

                    try {
                        await servicoRemoto
                            .excluirLancamentoPorOrigem(origem);
                    } catch (erro) {
                        console.error(
                            '[Anotei Sync] Falha ao excluir do histórico remoto:',
                            erro
                        );
                        window.alert(
                            'Não foi possível excluir no Supabase. ' +
                            'O histórico local foi preservado.'
                        );
                        return;
                    }
                }

                const sucesso =
                    await storage.excluirLancamento(
                        semana.id,
                        indiceLancamento
                    );"""

history_novo = history.replace(alvo_history, novo_history, 1)

# Validar todas as mudanças antes de gravar qualquer arquivo.
if app_novo == app or service_novo == service or history_novo == history:
    sys.exit("ERRO: nenhuma alteração detectada; arquivos preservados.")

backup = Path(
    "backup-correcao-sincronizacao-" +
    datetime.now().strftime("%Y%m%d-%H%M%S")
)
(backup / "src/js").mkdir(parents=True)

for arquivo in ARQUIVOS:
    shutil.copy2(arquivo, backup / arquivo)

try:
    app_path.write_text(app_novo, encoding="utf-8")
    service_path.write_text(service_novo, encoding="utf-8")
    history_path.write_text(history_novo, encoding="utf-8")
except Exception:
    for arquivo in ARQUIVOS:
        shutil.copy2(backup / arquivo, arquivo)
    raise

print("Correções aplicadas:")
print("- Exclusão remota por usuário e ID de origem.")
print("- Exclusão da tela principal sincronizada.")
print("- Exclusão do histórico sincronizada.")
print(f"Backup original: {backup}")
