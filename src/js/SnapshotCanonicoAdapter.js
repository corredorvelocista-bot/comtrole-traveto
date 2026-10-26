/**
 * Adaptador puro: snapshot local v1 -> documento canônico v1.
 * Não acessa localStorage/IndexedDB, não modifica o snapshot recebido e não
 * realiza operações de rede ou gravações no Supabase.
 */

function objetoValido(valor) {
    return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

function criarUuid() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

    if (globalThis.crypto?.getRandomValues) {
        const bytes = new Uint8Array(16);
        globalThis.crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    throw new Error('Este navegador não oferece um gerador criptográfico para o identificador do snapshot.');
}

function copiarJson(valor) {
    // Faz cópia profunda sem alterar a origem e confirma serialização JSON.
    const serializado = JSON.stringify(valor);
    if (serializado === undefined) {
        throw new Error('O snapshot não pode ser representado como JSON.');
    }
    return JSON.parse(serializado);
}

function validarDocumento(documento) {
    const problemas = [];
    const obrigatoriosObjeto = ['perfil', 'aparencia', 'configuracoes', 'producao', 'metadata'];

    if (!objetoValido(documento)) {
        return [{ nivel: 'erro', codigo: 'DOCUMENTO_NAO_E_OBJETO', mensagem: 'O documento canônico deve ser um objeto.' }];
    }
    if (documento.schemaVersion !== 1) {
        problemas.push({ nivel: 'erro', codigo: 'VERSAO_CANONICA_INVALIDA', campo: 'schemaVersion', mensagem: 'schemaVersion deve ser o inteiro 1.' });
    }
    for (const campo of obrigatoriosObjeto) {
        if (!objetoValido(documento[campo])) {
            problemas.push({ nivel: 'erro', codigo: 'CAMPO_OBRIGATORIO_INVALIDO', campo, mensagem: `O campo obrigatório "${campo}" deve ser um objeto.` });
        }
    }
    if (!Array.isArray(documento.despesasPessoais)) {
        problemas.push({ nivel: 'erro', codigo: 'LISTA_CANONICA_INVALIDA', campo: 'despesasPessoais', mensagem: 'despesasPessoais deve ser uma lista.' });
    }

    if (objetoValido(documento.producao)) {
        for (const campo of ['lancamentosAbertos', 'semanasFechadas']) {
            if (!Array.isArray(documento.producao[campo])) {
                problemas.push({ nivel: 'erro', codigo: 'LISTA_CANONICA_INVALIDA', campo: `producao.${campo}`, mensagem: `producao.${campo} deve ser uma lista.` });
            }
        }
    }

    if (objetoValido(documento.metadata)) {
        if (typeof documento.metadata.snapshotId !== 'string' || !documento.metadata.snapshotId) {
            problemas.push({ nivel: 'erro', codigo: 'METADATA_ID_INVALIDO', campo: 'metadata.snapshotId', mensagem: 'metadata.snapshotId é obrigatório.' });
        }
        if (typeof documento.metadata.clientUpdatedAt !== 'string' || Number.isNaN(Date.parse(documento.metadata.clientUpdatedAt))) {
            problemas.push({ nivel: 'erro', codigo: 'METADATA_DATA_INVALIDA', campo: 'metadata.clientUpdatedAt', mensagem: 'metadata.clientUpdatedAt deve ser uma data ISO válida.' });
        }
        if (documento.metadata.schemaVersion !== 1) {
            problemas.push({ nivel: 'erro', codigo: 'METADATA_VERSAO_INVALIDA', campo: 'metadata.schemaVersion', mensagem: 'metadata.schemaVersion deve ser 1.' });
        }
    }

    const fotoRef = documento?.perfil?.fotoRef;
    if (typeof fotoRef === 'string' && fotoRef.startsWith('data:')) {
        problemas.push({
            nivel: 'aviso',
            codigo: 'FOTO_DATA_URL_PENDENTE',
            campo: 'perfil.fotoRef',
            mensagem: 'A foto ainda é uma data URL. A referência foi preservada, mas a sincronização remota deve continuar bloqueada até definir a migração para Storage.'
        });
    }

    try {
        JSON.stringify(documento);
    } catch {
        problemas.push({ nivel: 'erro', codigo: 'DOCUMENTO_NAO_SERIALIZAVEL', mensagem: 'O documento canônico não pode ser serializado como JSON.' });
    }

    return problemas;
}

/**
 * Converte uma captura retornada por capturarSnapshotLocal() no contrato v1.
 * Campos de produção/despesas são copiados sem normalização ou remoção.
 */
export function adaptarSnapshotCanonico(snapshotLocal, opcoes = {}) {
    if (!objetoValido(snapshotLocal)) {
        throw new TypeError('Snapshot local inválido: esperado um objeto.');
    }
    if (snapshotLocal.schemaVersion !== 1) {
        throw new Error(`Versão de snapshot local não suportada: ${snapshotLocal.schemaVersion}`);
    }

    const perfilLocal = objetoValido(snapshotLocal.perfil) ? snapshotLocal.perfil : {};
    const aparenciaLocal = objetoValido(snapshotLocal.aparencia) ? snapshotLocal.aparencia : {};
    const configuracoesLocal = objetoValido(snapshotLocal.configuracoes) ? snapshotLocal.configuracoes : {};
    const valoresAplicados = objetoValido(configuracoesLocal.valoresAplicados)
        ? configuracoesLocal.valoresAplicados
        : {};

    const lancamentosAbertos = snapshotLocal.lancamentosAbertos;
    const semanasFechadas = snapshotLocal.semanasFechadas;
    const despesasPessoais = snapshotLocal.despesasPessoais;

    if (!Array.isArray(lancamentosAbertos) || !Array.isArray(semanasFechadas) || !Array.isArray(despesasPessoais)) {
        throw new Error('Snapshot local incompleto: lançamentos, semanas e despesas precisam ser listas.');
    }

    const capturadoEm = snapshotLocal.metadados?.capturadoEm;
    const dataCliente = opcoes.clientUpdatedAt ?? capturadoEm ?? new Date().toISOString();
    if (Number.isNaN(Date.parse(dataCliente))) {
        throw new Error('A data de captura não é válida; não é possível criar metadata.clientUpdatedAt.');
    }

    const documento = {
        schemaVersion: 1,
        perfil: {
            nome: perfilLocal.nome ?? null,
            fotoRef: perfilLocal.foto ?? null,
            fotoPosicao: perfilLocal.posicaoFoto == null ? null : copiarJson(perfilLocal.posicaoFoto)
        },
        aparencia: {
            tema: aparenciaLocal.tema ?? null,
            tamanhoTexto: aparenciaLocal.tamanhoTexto ?? null,
            animacoesAtivas: aparenciaLocal.animacoes ?? null
        },
        configuracoes: copiarJson(valoresAplicados),
        producao: {
            lancamentosAbertos: copiarJson(lancamentosAbertos),
            semanasFechadas: copiarJson(semanasFechadas)
        },
        despesasPessoais: copiarJson(despesasPessoais),
        metadata: {
            snapshotId: opcoes.snapshotId ?? criarUuid(),
            clientUpdatedAt: new Date(dataCliente).toISOString(),
            schemaVersion: 1
        }
    };

    const problemas = validarDocumento(documento);
    const erros = problemas.filter(item => item.nivel === 'erro').length;
    const avisos = problemas.filter(item => item.nivel === 'aviso').length;
    const serializado = JSON.stringify(documento);
    const tamanhoEstimadoBytes = new TextEncoder().encode(serializado).length;

    return {
        documento,
        validacao: {
            validaParaRevisao: erros === 0,
            prontaParaSincronizar: false,
            erros,
            avisos,
            problemas
        },
        resumo: {
            schemaVersion: documento.schemaVersion,
            quantidadeSemanasFechadas: documento.producao.semanasFechadas.length,
            quantidadeLancamentosAbertos: documento.producao.lancamentosAbertos.length,
            quantidadeDespesasPessoais: documento.despesasPessoais.length,
            quantidadeConfiguracoes: Object.keys(documento.configuracoes).length,
            tamanhoEstimadoBytes
        }
    };
}

export function validarSnapshotCanonico(documento) {
    const problemas = validarDocumento(documento);
    const erros = problemas.filter(item => item.nivel === 'erro').length;
    const avisos = problemas.filter(item => item.nivel === 'aviso').length;
    return {
        validaParaRevisao: erros === 0,
        prontaParaSincronizar: false,
        erros,
        avisos,
        problemas
    };
}
