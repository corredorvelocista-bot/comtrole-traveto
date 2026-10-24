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
    window.location.replace(
        new URL('login.html', window.location.href).href
    );
});
