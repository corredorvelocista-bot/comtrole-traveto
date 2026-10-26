import { ConfiguracaoService } from './ConfiguracaoService.js';
import { PerfilController } from './PerfilController.js';
import { DespesasPessoaisService } from './DespesasPessoaisService.js';

/**
 * Captura local para preparação da sincronização.
 *
 * Este serviço é somente de leitura: não grava em localStorage/IndexedDB,
 * não chama o Supabase e não modifica os objetos recebidos do armazenamento.
 */

const CHAVES_APARENCIA = {
    tema: 'tema_aparencia',
    tamanhoTexto: 'tamanho_texto',
    animacoes: 'animacoes_ativas'
};

const CHAVES_DADOS = {
    lancamentosAbertos: 'temp_lancamentos',
    semanasFallback: 'historico_semanas',
    despesasPessoais: 'despesas_pessoais'
};

/**
 * Lê o histórico sem transformar falhas de armazenamento em lista vazia.
 * É específico para o snapshot e não altera o comportamento do StorageService
 * usado pelas telas existentes.
 */
async function lerSemanasFechadasEstritamente(problemas) {
    if (!window.indexedDB) {
        const bruto = localStorage.getItem(CHAVES_DADOS.semanasFallback);
        if (bruto === null) return [];

        try {
            const semanas = JSON.parse(bruto);
            if (!Array.isArray(semanas)) {
                throw new Error('O histórico local não contém uma lista.');
            }
            return semanas;
        } catch (erro) {
            problemas.push({
                nivel: 'erro',
                codigo: 'HISTORICO_LOCAL_INVALIDO',
                chave: CHAVES_DADOS.semanasFallback,
                mensagem: `Não foi possível ler o histórico local: ${erro.message}`
            });
            throw erro;
        }
    }

    const db = await new Promise((resolve, reject) => {
        let request;
        try {
            request = indexedDB.open('TraveteDB', 1);
        } catch (erro) {
            reject(erro);
            return;
        }

        request.onerror = () => reject(
            request.error || new Error('Falha ao abrir o IndexedDB.')
        );
        request.onblocked = () => reject(
            new Error('A abertura do IndexedDB foi bloqueada por outra conexão.')
        );
        request.onupgradeneeded = (event) => {
            // Não criar silenciosamente uma estrutura vazia durante o snapshot.
            // O StorageService é responsável pela inicialização normal do banco.
            if (event.oldVersion === 0) {
                try { request.transaction.abort(); } catch { /* sem ação */ }
                reject(new Error('O banco TraveteDB ainda não foi inicializado.'));
            }
        };
        request.onsuccess = () => resolve(request.result);
    });

    try {
        if (!db.objectStoreNames.contains('semanas')) {
            throw new Error('O banco TraveteDB não contém o armazenamento "semanas".');
        }

        return await new Promise((resolve, reject) => {
            let transaction;
            try {
                transaction = db.transaction(['semanas'], 'readonly');
            } catch (erro) {
                reject(erro);
                return;
            }

            const store = transaction.objectStore('semanas');
            const request = store.getAll();
            let resultadoRecebido = false;

            request.onsuccess = () => {
                resultadoRecebido = true;
                if (!Array.isArray(request.result)) {
                    reject(new Error('O IndexedDB retornou um histórico em formato inválido.'));
                    return;
                }
                resolve(request.result);
            };
            request.onerror = () => reject(
                request.error || new Error('Falha ao ler as semanas no IndexedDB.')
            );
            transaction.onabort = () => reject(
                transaction.error || new Error('A leitura do histórico foi abortada.')
            );
            transaction.onerror = () => reject(
                transaction.error || new Error('Falha na transação de leitura do histórico.')
            );
            transaction.oncomplete = () => {
                if (!resultadoRecebido) {
                    reject(new Error('A leitura do histórico terminou sem resultado.'));
                }
            };
        });
    } finally {
        db.close();
    }
}

function lerJSONLocal(chave, padrao, problemas) {
    const bruto = localStorage.getItem(chave);
    if (bruto === null) return padrao;

    try {
        return JSON.parse(bruto);
    } catch {
        problemas.push({
            nivel: 'erro',
            codigo: 'JSON_LOCAL_INVALIDO',
            chave,
            mensagem: `O conteúdo local de "${chave}" não é um JSON válido. O valor original foi mantido.`
        });
        return {
            __snapshotLeituraComErro: true,
            chave,
            valorOriginal: bruto
        };
    }
}

function validarLista(nome, valor, problemas) {
    if (!Array.isArray(valor)) {
        problemas.push({
            nivel: 'erro',
            codigo: 'LISTA_INVALIDA',
            campo: nome,
            mensagem: `O campo "${nome}" deveria ser uma lista. Não será corrigido automaticamente.`
        });
        return;
    }

    valor.forEach((item, indice) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            problemas.push({
                nivel: 'aviso',
                codigo: 'ITEM_COM_FORMATO_INESPERADO',
                campo: nome,
                indice,
                mensagem: `O item ${indice} de "${nome}" não é um objeto. O item será preservado na captura.`
            });
        }
    });
}

function contarCampos(objeto) {
    return objeto && typeof objeto === 'object' && !Array.isArray(objeto)
        ? Object.keys(objeto).length
        : 0;
}

export class SnapshotLocalService {
    constructor() {
        this.configuracoes = new ConfiguracaoService();
        this.perfil = new PerfilController();
        this.despesas = new DespesasPessoaisService();
    }

    async capturar() {
        const problemas = [];

        // A leitura do histórico é estrita: falhas não podem parecer um histórico vazio.
        let semanasFechadas;
        try {
            semanasFechadas = await lerSemanasFechadasEstritamente(problemas);
        } catch (erro) {
            if (!problemas.some(item => item.codigo === 'FALHA_LEITURA_HISTORICO')) {
                problemas.push({
                    nivel: 'erro',
                    codigo: 'FALHA_LEITURA_HISTORICO',
                    campo: 'semanasFechadas',
                    mensagem: `A captura foi interrompida porque o histórico não pôde ser lido com segurança: ${erro.message}`
                });
            }
            // Não continuar com uma lista vazia inventada: aborta a captura.
            throw new Error(`Snapshot cancelado: falha ao ler o histórico de produção. ${erro.message}`, { cause: erro });
        }
        const lancamentosAbertos = lerJSONLocal(
            CHAVES_DADOS.lancamentosAbertos,
            [],
            problemas
        );
        const despesasPessoais = lerJSONLocal(
            CHAVES_DADOS.despesasPessoais,
            [],
            problemas
        );

        const perfil = {
            nome: this.perfil.obterNome(),
            foto: this.perfil.obterFoto(),
            posicaoFoto: lerJSONLocal(
                'perfil_foto_posicao',
                { x: 50, y: 50 },
                problemas
            )
        };

        // ConfiguracaoService oferece os valores interpretados usados pelo app.
        // Também capturamos os valores brutos para que padrões aplicados pelo
        // serviço não sejam confundidos com configurações explicitamente salvas.
        const configuracoes = {
            valoresAplicados: this.configuracoes.obterTodas(),
            valoresBrutos: {}
        };
        Object.entries(this.configuracoes.chaves).forEach(([nome, chave]) => {
            configuracoes.valoresBrutos[nome] = localStorage.getItem(chave);
        });

        const aparencia = {};
        Object.entries(CHAVES_APARENCIA).forEach(([nome, chave]) => {
            aparencia[nome] = localStorage.getItem(chave);
        });

        validarLista('semanasFechadas', semanasFechadas, problemas);
        validarLista('lancamentosAbertos', lancamentosAbertos, problemas);
        validarLista('despesasPessoais', despesasPessoais, problemas);

        if (Array.isArray(semanasFechadas)) {
            semanasFechadas.forEach((semana, indice) => {
                if (!semana || typeof semana !== 'object' || Array.isArray(semana)) return;
                if (!Array.isArray(semana.registros)) {
                    problemas.push({
                        nivel: 'aviso',
                        codigo: 'SEMANA_SEM_REGISTROS_VALIDOS',
                        campo: 'semanasFechadas',
                        indice,
                        mensagem: `A semana no índice ${indice} não contém "registros" como lista. Foi preservada sem alterações.`
                    });
                }
            });
        }

        if (typeof perfil.foto === 'string' && perfil.foto.startsWith('data:')) {
            problemas.push({
                nivel: 'aviso',
                codigo: 'FOTO_EM_DATA_URL',
                campo: 'perfil.foto',
                mensagem: 'A foto do perfil parece estar armazenada como data URL. O tamanho deve ser avaliado antes de sincronizar.'
            });
        }

        const snapshot = {
            schemaVersion: 1,
            metadados: {
                capturadoEm: new Date().toISOString(),
                origem: 'armazenamento-local',
                modo: 'somente-leitura'
            },
            perfil,
            aparencia,
            configuracoes,
            lancamentosAbertos,
            semanasFechadas,
            despesasPessoais
        };

        let tamanhoEstimadoBytes = null;
        try {
            tamanhoEstimadoBytes = new TextEncoder().encode(JSON.stringify(snapshot)).length;
        } catch {
            problemas.push({
                nivel: 'aviso',
                codigo: 'TAMANHO_NAO_CALCULADO',
                mensagem: 'Não foi possível calcular o tamanho estimado da captura.'
            });
        }

        const erros = problemas.filter(item => item.nivel === 'erro').length;
        const avisos = problemas.filter(item => item.nivel === 'aviso').length;

        return {
            snapshot,
            validacao: {
                validaParaRevisao: erros === 0,
                prontaParaSincronizar: false,
                erros,
                avisos,
                problemas
            },
            resumo: {
                quantidadeSemanasFechadas: Array.isArray(semanasFechadas) ? semanasFechadas.length : null,
                quantidadeLancamentosAbertos: Array.isArray(lancamentosAbertos) ? lancamentosAbertos.length : null,
                quantidadeDespesasPessoais: Array.isArray(despesasPessoais) ? despesasPessoais.length : null,
                quantidadeConfiguracoes: contarCampos(configuracoes.valoresAplicados),
                tamanhoEstimadoBytes
            }
        };
    }
}

/**
 * Atalho conveniente para diagnóstico manual no console do navegador:
 * const resultado = await capturarSnapshotLocal();
 * Não envia nem grava o resultado automaticamente.
 */
export async function capturarSnapshotLocal() {
    return new SnapshotLocalService().capturar();
}
