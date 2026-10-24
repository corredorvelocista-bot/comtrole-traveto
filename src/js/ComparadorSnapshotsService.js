/**
 * Comparador puro de snapshots do Anotei.
 *
 * Somente leitura: não acessa navegador, rede, IndexedDB ou Supabase.
 * Não mescla, corrige, apaga ou grava dados.
 */

function objetoValido(valor) {
    return valor !== null &&
        typeof valor === 'object' &&
        !Array.isArray(valor);
}

function igualarJSON(a, b) {
    function ordenar(valor) {
        if (Array.isArray(valor)) {
            return valor.map(ordenar);
        }

        if (objetoValido(valor)) {
            return Object.fromEntries(
                Object.keys(valor)
                    .sort()
                    .map(chave => [chave, ordenar(valor[chave])])
            );
        }

        return valor;
    }

    return JSON.stringify(ordenar(a)) === JSON.stringify(ordenar(b));
}

function validarDocumento(documento) {
    const erros = [];

    if (!objetoValido(documento)) {
        return ['O documento não é um objeto JSON válido.'];
    }

    if (documento.schemaVersion !== 1) {
        erros.push('A versão do documento local deve ser 1.');
    }

    for (const campo of [
        'perfil',
        'aparencia',
        'configuracoes',
        'producao',
        'metadata'
    ]) {
        if (!objetoValido(documento[campo])) {
            erros.push(`O campo "${campo}" deve ser um objeto.`);
        }
    }

    if (!Array.isArray(documento.despesasPessoais)) {
        erros.push('despesasPessoais deve ser uma lista.');
    }

    if (objetoValido(documento.producao)) {
        for (const campo of [
            'lancamentosAbertos',
            'semanasFechadas'
        ]) {
            if (!Array.isArray(documento.producao[campo])) {
                erros.push(`producao.${campo} deve ser uma lista.`);
            }
        }
    }

    if (objetoValido(documento.producao)) {
        for (const campo of ['lancamentosAbertos', 'semanasFechadas']) {
            const lista = documento.producao[campo];

            if (Array.isArray(lista)) {
                lista.forEach((item, indice) => {
                    if (!objetoValido(item)) {
                        erros.push(
                            `producao.${campo}[${indice}] deve ser um objeto.`
                        );
                    }
                });
            }
        }
    }

    if (Array.isArray(documento.despesasPessoais)) {
        documento.despesasPessoais.forEach((item, indice) => {
            if (!objetoValido(item)) {
                erros.push(`despesasPessoais[${indice}] deve ser um objeto.`);
            }
        });
    }

    return erros;
}

function obterDocumentoRemoto(registro) {
    if (registro == null) {
        return null;
    }

    // Aceita tanto a linha retornada pelo Supabase quanto o JSON direto.
    if (objetoValido(registro) &&
        Object.prototype.hasOwnProperty.call(registro, 'dados')) {
        return registro.dados;
    }

    return registro;
}

function contar(valor) {
    return Array.isArray(valor) ? valor.length : null;
}

function resumoLegado(documento) {
    const producao = objetoValido(documento?.producao)
        ? documento.producao
        : documento;

    return {
        semanasFechadas: contar(producao?.semanasFechadas),
        lancamentosAbertos: contar(producao?.lancamentosAbertos),
        despesasPessoais: contar(documento?.despesasPessoais)
    };
}

function resultadoBloqueado(estado, mensagem, detalhes = {}) {
    return {
        modo: 'somente leitura',
        estado,
        comparacaoConfiavel: false,
        podeGravar: false,
        requerDecisaoExplicita: true,
        mensagem,
        ...detalhes
    };
}

/**
 * Recebe um documento local canônico (resultado.documento do adaptador)
 * e o registro remoto ou o documento JSON remoto.
 */
export function compararSnapshotsCanonicos(
    documentoLocal,
    registroRemoto
) {
    const errosLocais = validarDocumento(documentoLocal);

    if (errosLocais.length > 0) {
        return resultadoBloqueado(
            'snapshot_local_invalido',
            'A comparação foi interrompida porque o snapshot local é inválido.',
            { errosLocais }
        );
    }

    const remoto = obterDocumentoRemoto(registroRemoto);

    if (remoto === null) {
        return {
            modo: 'somente leitura',
            estado: 'remoto_inexistente',
            comparacaoConfiavel: true,
            podeGravar: false,
            requerDecisaoExplicita: true,
            mensagem: 'Não existe documento remoto. Inicialização exige decisão explícita.',
            local: {
                semanasFechadas: documentoLocal.producao.semanasFechadas.length,
                lancamentosAbertos: documentoLocal.producao.lancamentosAbertos.length,
                despesasPessoais: documentoLocal.despesasPessoais.length
            },
            remoto: null,
            diferencas: []
        };
    }

    if (!objetoValido(remoto)) {
        return resultadoBloqueado(
            'documento_remoto_invalido',
            'O conteúdo remoto não é um objeto JSON válido.'
        );
    }

    if (Number.isInteger(remoto.schemaVersion) &&
        remoto.schemaVersion > 1) {
        return resultadoBloqueado(
            'versao_remota_incompativel',
            'O documento remoto usa uma versão mais nova. Não tente convertê-lo ou sobrescrevê-lo.',
            { schemaVersionRemota: remoto.schemaVersion }
        );
    }

    if (remoto.schemaVersion !== 1) {
        const legado = !Object.prototype.hasOwnProperty.call(
            remoto,
            'schemaVersion'
        ) && !Object.prototype.hasOwnProperty.call(remoto, 'producao');

        return resultadoBloqueado(
            legado ? 'remoto_legado' : 'formato_remoto_desconhecido',
            legado
                ? 'O documento remoto é legado. Não é seguro compará-lo como se fosse canônico.'
                : 'O formato remoto não corresponde ao contrato canônico v1.',
            {
                resumoRemoto: resumoLegado(remoto),
                categoriasRemotas: Object.keys(remoto)
            }
        );
    }

    const errosRemotos = validarDocumento(remoto);

    if (errosRemotos.length > 0) {
        return resultadoBloqueado(
            'documento_remoto_invalido',
            'O documento remoto não passou na validação canônica.',
            { errosRemotos }
        );
    }

    // metadata é excluída: IDs e horários de snapshots diferentes
    // não significam, por si só, diferenças nos dados do usuário.
    const categorias = [
        ['perfil', documentoLocal.perfil, remoto.perfil],
        ['aparencia', documentoLocal.aparencia, remoto.aparencia],
        ['configuracoes', documentoLocal.configuracoes, remoto.configuracoes],
        [
            'producao.lancamentosAbertos',
            documentoLocal.producao.lancamentosAbertos,
            remoto.producao.lancamentosAbertos
        ],
        [
            'producao.semanasFechadas',
            documentoLocal.producao.semanasFechadas,
            remoto.producao.semanasFechadas
        ],
        [
            'despesasPessoais',
            documentoLocal.despesasPessoais,
            remoto.despesasPessoais
        ]
    ];

    const comparacoes = categorias.map(([campo, local, remotoValor]) => ({
        campo,
        estado: igualarJSON(local, remotoValor) ? 'igual' : 'diferente',
        quantidadeLocal: Array.isArray(local) ? local.length : null,
        quantidadeRemota: Array.isArray(remotoValor) ? remotoValor.length : null
    }));

    const iguais = comparacoes.every(item => item.estado === 'igual');

    return {
        modo: 'somente leitura',
        estado: iguais ? 'identicos' : 'conflito',
        formatoRemoto: 'canonico-v1',
        comparacaoConfiavel: true,
        podeGravar: false,
        requerDecisaoExplicita: !iguais,
        mensagem: iguais
            ? 'As categorias de dados-base são iguais. Nenhuma gravação foi realizada.'
            : 'Foram encontradas diferenças. Preserve os dois lados; não há mesclagem automática.',
        comparacoes,
        diferencas: comparacoes
            .filter(item => item.estado === 'diferente')
            .map(item => item.campo)
    };
}
