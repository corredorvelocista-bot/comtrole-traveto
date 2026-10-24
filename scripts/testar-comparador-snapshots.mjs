import assert from 'node:assert/strict';
import { compararSnapshotsCanonicos } from '../src/js/ComparadorSnapshotsService.js';

function documento() {
    return {
        schemaVersion: 1,
        perfil: { nome: 'Teste', fotoRef: null, fotoPosicao: null },
        aparencia: { tema: 'escuro', tamanhoTexto: null, animacoesAtivas: null },
        configuracoes: { valorUnitario: 0.21 },
        producao: {
            lancamentosAbertos: [],
            semanasFechadas: [{ id: 10, periodo: '14/10', registros: [] }]
        },
        despesasPessoais: [],
        metadata: {
            snapshotId: 'snapshot-a',
            clientUpdatedAt: '2026-10-19T10:00:00.000Z',
            schemaVersion: 1
        }
    };
}

function remoto(doc) {
    return { dados: doc, atualizado_em: '2026-10-19T10:00:00Z' };
}

let local = documento();

let resultado = compararSnapshotsCanonicos(local, null);
assert.equal(resultado.estado, 'remoto_inexistente');
assert.equal(resultado.podeGravar, false);

resultado = compararSnapshotsCanonicos(local, remoto(documento()));
assert.equal(resultado.estado, 'identicos');
assert.equal(resultado.podeGravar, false);

// Metadata diferente não deve gerar conflito de conteúdo.
const comMetadataDiferente = documento();
comMetadataDiferente.metadata.snapshotId = 'snapshot-b';
comMetadataDiferente.metadata.clientUpdatedAt = '2026-10-20T10:00:00Z';
resultado = compararSnapshotsCanonicos(local, remoto(comMetadataDiferente));
assert.equal(resultado.estado, 'identicos');

// Diferenças de conteúdo devem ser sinalizadas, sem mesclagem.
const comDiferenca = documento();
comDiferenca.producao.semanasFechadas[0].registros.push({
    id: 99,
    pecas: 3000
});
resultado = compararSnapshotsCanonicos(local, remoto(comDiferenca));
assert.equal(resultado.estado, 'conflito');
assert.ok(resultado.diferencas.includes('producao.semanasFechadas'));
assert.equal(resultado.podeGravar, false);

// Formato antigo não pode ser interpretado como canônico.
resultado = compararSnapshotsCanonicos(local, {
    dados: { perfil: {}, semanasFechadas: [], lancamentosAbertos: [] }
});
assert.equal(resultado.estado, 'remoto_legado');
assert.equal(resultado.podeGravar, false);

// Versão futura deve bloquear a operação.
const futuro = documento();
futuro.schemaVersion = 2;
resultado = compararSnapshotsCanonicos(local, remoto(futuro));
assert.equal(resultado.estado, 'versao_remota_incompativel');
assert.equal(resultado.podeGravar, false);

// Estrutura inválida deve bloquear a comparação.
const invalido = documento();
invalido.producao.semanasFechadas = null;
resultado = compararSnapshotsCanonicos(invalido, remoto(documento()));
assert.equal(resultado.estado, 'snapshot_local_invalido');
assert.equal(resultado.podeGravar, false);

// Registro remoto canônico incompleto também deve bloquear.
const remotoInvalido = documento();
remotoInvalido.despesasPessoais = null;
resultado = compararSnapshotsCanonicos(local, remoto(remotoInvalido));
assert.equal(resultado.estado, 'documento_remoto_invalido');
assert.equal(resultado.podeGravar, false);


// Campo de produção em formato desconhecido: bloquear.
const formatoDesconhecido = documento();
formatoDesconhecido.schemaVersion = '1';
resultado = compararSnapshotsCanonicos(local, remoto(formatoDesconhecido));
assert.equal(resultado.estado, 'formato_remoto_desconhecido');
assert.equal(resultado.podeGravar, false);

// Uma semana com formato inesperado não pode ser considerada segura
// apenas porque o campo semanasFechadas é uma lista.
const semanaInvalida = documento();
semanaInvalida.producao.semanasFechadas = [null];
resultado = compararSnapshotsCanonicos(semanaInvalida, remoto(documento()));
assert.equal(resultado.estado, 'snapshot_local_invalido');
assert.equal(resultado.podeGravar, false);

// Um lançamento inválido também deve bloquear a comparação.
const lancamentoInvalido = documento();
lancamentoInvalido.producao.lancamentosAbertos = ['registro inválido'];
resultado = compararSnapshotsCanonicos(lancamentoInvalido, remoto(documento()));
assert.equal(resultado.estado, 'snapshot_local_invalido');
assert.equal(resultado.podeGravar, false);

// Nunca habilitar gravação, nem mesmo quando os documentos são idênticos.
resultado = compararSnapshotsCanonicos(local, remoto(documento()));
assert.equal(resultado.podeGravar, false);
assert.equal(resultado.requerDecisaoExplicita, false);

console.log('OK: 11 cenários de segurança passaram.');
console.log('Nenhum acesso ao Supabase ou gravação foi executado.');
