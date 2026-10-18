import { verificarAcesso } from './AuthBootstrap.js';

const carregadores = {
    'app.js': () => import('./app.js'),
    'index.js': () => import('./index.js'),
    'menu-principal.js': () => import('./menu-principal.js'),
    'historico.js': () => import('./historico.js'),
    'barra-inferior-compartilhada.js': () => import('./barra-inferior-compartilhada.js'),
    'GlobalAparenciaController.js': () => import('./GlobalAparenciaController.js'),
    'perfil.js': () => import('./perfil.js'),
    'relatorios.js': () => import('./relatorios.js'),
    'despesas-prototipo.js': () => import('./despesas-prototipo.js')
};

async function iniciar() {
    if (document.readyState === 'loading') {
        await new Promise((resolve) => {
            document.addEventListener(
                'DOMContentLoaded',
                resolve,
                { once: true }
            );
        });
    }

    const elemento = document.querySelector(
        'script[data-auth-entry]'
    );

    const nomes = (elemento?.dataset.modules || '')
        .split(',')
        .map((nome) => nome.trim())
        .filter(Boolean);

    for (const nome of nomes) {
        if (typeof carregadores[nome] !== 'function') {
            throw new Error(
                `Módulo desconhecido: ${nome}`
            );
        }
    }

    const autorizado = await verificarAcesso();

    if (!autorizado) {
        return;
    }

    for (const nome of nomes) {
        await carregadores[nome]();
    }

    document.dispatchEvent(
        new Event('DOMContentLoaded')
    );
}

iniciar().catch((erro) => {
    console.error(
        'Falha ao iniciar página autenticada:',
        erro
    );

    window.location.replace(
        new URL('login.html', window.location.href).href
    );
});
