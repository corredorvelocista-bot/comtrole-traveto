export class DadosService {

    constructor(storageService) {
        this.storage = storageService;

        this.chavesLocalStorage = [
            'temp_lancamentos',
            'meta_semanal_valor',
            'config_semana_padrao',
            'config_data_semana',
            'config_formato_numeros',
            'config_confirmacao_salvar',
            'config_valor_unitario',
            'config_custo_fixo_mensal',
            'config_retirada_semanal_desejada',
            'config_modo_planejamento_financeiro',
            'config_modo_calculo_financeiro',
            'despesas_pessoais',
            'config_som_lancamento',
            'config_som_meta',
            'config_confete_meta',
            'tema_aparencia',
            'tamanho_texto',
            'animacoes_ativas',
            'perfil_nome',
            'perfil_foto',
            'perfil_foto_posicao',
            'semana_referencia_atual',
            'meta_batida_disparada'
        ];
    }

    async criarBackup() {

        const localStorageData = {};

        this.chavesLocalStorage.forEach(chave => {

            const valor =
                localStorage.getItem(chave);

            if (valor !== null) {
                localStorageData[chave] = valor;
            }

        });

        const semanas =
            await this.storage.obterTodasSemanas();

        return {
            aplicativo: 'Controle de Travete',
            tipo: 'backup',
            versao: 1,
            criadoEm: new Date().toISOString(),
            localStorage: localStorageData,
            semanas
        };
    }

    async exportar() {

        const backup =
            await this.criarBackup();

        const conteudo =
            JSON.stringify(
                backup,
                null,
                2
            );

        const blob =
            new Blob(
                [conteudo],
                {
                    type: 'application/json'
                }
            );

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement('a');

        const data =
            new Date()
                .toISOString()
                .slice(0, 10);

        link.href = url;

        link.download =
            `controle-travete-backup-${data}.json`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        return true;
    }

    validarBackup(backup) {

        if (
            !backup ||
            typeof backup !== 'object'
        ) {
            throw new Error(
                'Arquivo de backup inválido.'
            );
        }

        if (
            backup.tipo !== 'backup' ||
            backup.aplicativo !== 'Controle de Travete'
        ) {
            throw new Error(
                'Este arquivo não pertence ao Controle de Travete.'
            );
        }

        if (
            !Array.isArray(backup.semanas)
        ) {
            throw new Error(
                'O histórico do backup está inválido.'
            );
        }

        if (
            !backup.localStorage ||
            typeof backup.localStorage !== 'object'
        ) {
            throw new Error(
                'As configurações do backup estão inválidas.'
            );
        }

        return true;
    }

    async importarArquivo(file) {

        if (!file) {
            throw new Error(
                'Nenhum arquivo foi selecionado.'
            );
        }

        const texto =
            await file.text();

        let backup;

        try {
            backup =
                JSON.parse(texto);
        } catch {
            throw new Error(
                'O arquivo selecionado não é um JSON válido.'
            );
        }

        this.validarBackup(backup);

        await this.storage.substituirTodasSemanas(
            backup.semanas
        );

        this.chavesLocalStorage.forEach(chave => {

            localStorage.removeItem(chave);

        });

        Object.entries(
            backup.localStorage
        ).forEach(([chave, valor]) => {

            if (
                this.chavesLocalStorage.includes(chave)
            ) {
                localStorage.setItem(
                    chave,
                    String(valor)
                );
            }

        });

        return true;
    }

    async limparDados() {

        await this.storage.limparTudo();

        this.chavesLocalStorage.forEach(chave => {

            localStorage.removeItem(chave);

        });

        return true;
    }
}
