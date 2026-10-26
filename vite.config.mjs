import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(import.meta.dirname, 'index.html'),
                login: resolve(import.meta.dirname, 'login.html'),
                historico: resolve(import.meta.dirname, 'historico.html'),
                perfil: resolve(import.meta.dirname, 'perfil.html'),
                ajuda: resolve(import.meta.dirname, 'ajuda.html'),
                relatorios: resolve(import.meta.dirname, 'relatorios.html'),
                gestaoFinanceira: resolve(import.meta.dirname, 'gestao-financeira.html'),
                despesasPessoais: resolve(import.meta.dirname, 'despesas-pessoais.html'),
                migracaoDados: resolve(import.meta.dirname, 'migracao-dados.html')
            }
        }
    }
});
