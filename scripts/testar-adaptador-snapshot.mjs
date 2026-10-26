import assert from 'node:assert/strict';
import { adaptarSnapshotCanonico } from '../src/js/SnapshotCanonicoAdapter.js';

function criarSnapshot() {
    return {
        schemaVersion: 1,
        metadados: {
            capturadoEm: '2026-10-20T02:00:00.000Z'
        },
        perfil: {
            nome: 'Teste',
            foto: null,
            posicaoFoto: { x: 50, y: 50 }
        },
        aparencia: {
            tema: 'escuro',
            tamanhoTexto: 'normal',
            animacoes: 'true'
        },
        configuracoes: {
            valoresAplicados: {
                valorUnitario: 0.21,
                metaSemanal: 500
            },
            valoresBrutos: {
                valorUnitario: '0.21',
                metaSemanal: null
            }
        },
        lancamentosAbertos: [
            { id: 12, pecas: 4500, valorUnitario: 0.21 }
        ],
        semanasFechadas: [
            {
                id: 15,
                periodo: '14/10',
                registros: [{ id: 18, pecas: 3000 }]
            }
        ],
        despesasPessoais: [
            {
                id: 23,
                descricao: 'Material',
                description: 'Material antigo',
                valor: 35,
                data: '14/10',
                categoria: 'Outros',
                campoExtra: 'preservar'
            }
        ]
    };
}

const original = criarSnapshot();

const resultado = adaptarSnapshotCanonico(original, {
    snapshotId: 'snapshot-teste',
    clientUpdatedAt: '2026-10-20T02:00:00.000Z'
});

assert.equal(resultado.documento.schemaVersion, 1);
assert.equal(resultado.documento.metadata.snapshotId, 'snapshot-teste');

assert.deepEqual(
    resultado.documento.producao.lancamentosAbertos,
    original.lancamentosAbertos
);

assert.deepEqual(
    resultado.documento.producao.semanasFechadas,
    original.semanasFechadas
);

assert.deepEqual(
    resultado.documento.despesasPessoais,
    original.despesasPessoais
);

assert.equal(resultado.documento.despesasPessoais[0].id, 23);
assert.equal(resultado.documento.despesasPessoais[0].description, 'Material antigo');
assert.equal(resultado.documento.despesasPessoais[0].campoExtra, 'preservar');

assert.deepEqual(original.despesasPessoais[0], {
    id: 23,
    descricao: 'Material',
    description: 'Material antigo',
    valor: 35,
    data: '14/10',
    categoria: 'Outros',
    campoExtra: 'preservar'
});

assert.equal(resultado.validacao.prontaParaSincronizar, false);

assert.throws(
    () => adaptarSnapshotCanonico({
        ...original,
        despesasPessoais: null
    }),
    /incompleto/
);

assert.throws(
    () => adaptarSnapshotCanonico({
        ...original,
        metadados: { capturadoEm: 'data-invalida' }
    }),
    /data de captura/
);

console.log('OK: testes do adaptador concluídos.');
console.log('A gravação remota continua bloqueada.');
