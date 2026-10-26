import { verificarAcesso } from './AuthBootstrap.js';

const modulosPorPagina = {
    'index.html': [
        'app.js',
        'index.js',
        'menu-principal.js'
    ],
    'historico.html': [
        'historico.js',
        'barra-inferior-compartilhada.js'
    ],
    'perfil.html': [
        'GlobalAparenciaController.js',
        'perfil.js'
    ],
    'ajuda.html': [
        'GlobalAparenciaController.js'
    ],
    'relatorios.html': [
        'relatorios.js'
    ],
    'gestao-financeira.html': [
        'app.js',
        'index.js',
        'barra-inferior-compartilhada.js'
    ],
    'despesas-pessoais.html': [
        'app.js',
        'index.js',
        'despesas-prototipo.js',
        'barra-inferior-compartilhada.js'
    ]
};

const carregadores = {
    'app.js': () => import('./app.js'),
    'index.js': () => import('./index.js'),
    'menu-principal.js': () => import('./menu-principal.js'),
    'historico.js': () => import('./historico.js'),
    'barra-inferior-compartilhada.js': () =>
        import('./barra-inferior-compartilhada.js'),
    'GlobalAparenciaController.js': () =>
        import('./GlobalAparenciaController.js'),
    'perfil.js': () => import('./perfil.js'),
    'relatorios.js': () => import('./relatorios.js'),
    'despesas-prototipo.js': () => import('./despesas-prototipo.js')
};

async function iniciar() {
    if (document.readyState === 'loading') {
        await new Promise((resolve) => {
            document.addEventListener('DOMContentLoaded', resolve, {
                once: true
            });
        });
    }

    const pagina = window.location.pathname.split('/').pop() || 'index.html';
    const nomes = modulosPorPagina[pagina];

    if (!nomes) {
        throw new Error(`Página sem módulos configurados: ${pagina}`);
    }

    for (const nome of nomes) {
        if (typeof carregadores[nome] !== 'function') {
            throw new Error(`Módulo desconhecido: ${nome}`);
        }
    }

    const autorizado = await verificarAcesso();

    if (!autorizado) return;

    for (const nome of nomes) {
        await carregadores[nome]();
    }

    document.dispatchEvent(new Event('DOMContentLoaded'));
}

iniciar().catch((erro) => {
    console.error('Falha ao iniciar página autenticada:', erro);

    let aviso = document.getElementById('anotei-erro-inicializacao');

    if (!aviso) {
        aviso = document.createElement('section');
        aviso.id = 'anotei-erro-inicializacao';

        Object.assign(aviso.style, {
            margin: '24px auto',
            padding: '20px',
            maxWidth: '640px',
            fontFamily: 'system-ui, sans-serif',
            lineHeight: '1.5',
            border: '1px solid #d1d5db',
            borderRadius: '12px'
        });

        const titulo = document.createElement('h2');
        titulo.textContent = 'Não foi possível carregar uma parte do Anotei';

        const mensagem = document.createElement('p');
        mensagem.textContent =
            'Sua sessão não foi encerrada por este erro. ' +
            'Tente recarregar a página. Se persistir, consulte o console.';

        const botao = document.createElement('button');
        botao.type = 'button';
        botao.textContent = 'Recarregar página';
        botao.addEventListener('click', () => window.location.reload());

        aviso.append(titulo, mensagem, botao);
        document.body.prepend(aviso);
    }
});
