export class GoogleService {

    constructor(config) {

        const ambienteLocal =
            config.ambienteLocal === true;

        this.CLIENT_ID =
            ambienteLocal
                ? '751192071126-02fgofvlqbofcks42kb93jd8te7ktq24.apps.googleusercontent.com'
                : '751192071126-02l99756dcqr65orhm2iqs5hajnjr54i.apps.googleusercontent.com';

        this.SCOPES =
            'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

        this.spreadsheetStorageKey =
            ambienteLocal
                ? 'google_spreadsheet_id_dev'
                : 'google_spreadsheet_id';

        this.nomePlanilhaGoogle =
            ambienteLocal
                ? 'Controle de Travete - TESTE DEV'
                : 'Controle de Travete - Meus Dados';

        this.tokenClient =
            null;

        this.accessToken =
            localStorage.getItem(
                'google_access_token'
            ) || null;

        this.spreadsheetIdSalvo =
            localStorage.getItem(
                this.spreadsheetStorageKey
            ) || null;

        this.nomeAba =
            null;

        this.onLoginStatusChange =
            config.onLoginStatusChange ||
            (() => { });

        this.onRender =
            config.onRender ||
            (() => { });
    }

    // =====================================================
    // GOOGLE AUTH
    // =====================================================

    initGoogleAuth() {

        if (
            typeof google === 'undefined' ||
            !google.accounts ||
            !google.accounts.oauth2
        ) {

            console.warn(
                'Google Identity Services ainda não carregou. Tentando novamente...'
            );

            setTimeout(
                () =>
                    this.initGoogleAuth(),
                500
            );

            return;
        }

        this.tokenClient =
            google.accounts.oauth2.initTokenClient({

                client_id:
                    this.CLIENT_ID,

                scope:
                    this.SCOPES,

                callback:
                    (response) => {

                        if (response.error) {

                            console.error(
                                response
                            );

                            alert(
                                'Erro na autenticação com o Google.'
                            );

                            return;
                        }

                        this.accessToken =
                            response.access_token;

                        localStorage.setItem(
                            'google_access_token',
                            this.accessToken
                        );

                        this.onLoginStatusChange(
                            true,
                            this.accessToken
                        );

                        this.onRender();

                        alert(
                            'Conta Google conectada com sucesso!'
                        );
                    }
            });

        if (this.accessToken) {

            this.onLoginStatusChange(
                true,
                this.accessToken
            );

        } else {

            this.onLoginStatusChange(
                false,
                null
            );
        }
    }

    fazerLoginGoogle() {

        if (!this.tokenClient) {

            alert(
                'A biblioteca do Google ainda está carregando ou falhou. Verifique sua conexão.'
            );

            return;
        }

        this.tokenClient.requestAccessToken({
            prompt: 'consent'
        });
    }

    fazerLogoutGoogle() {

        if (!this.accessToken) {
            return;
        }

        google.accounts.oauth2.revoke(
            this.accessToken,
            () => {

                this.accessToken =
                    null;

                localStorage.removeItem(
                    'google_access_token'
                );

                localStorage.removeItem(
                    this.spreadsheetStorageKey
                );

                this.spreadsheetIdSalvo =
                    null;

                this.nomeAba =
                    null;

                this.onLoginStatusChange(
                    false,
                    null
                );

                this.onRender();

                alert(
                    'Você desconectou sua conta do Google.'
                );
            }
        );
    }

    // =====================================================
    // DESCOBRIR ABA DA PLANILHA
    // =====================================================

    async obterNomePrimeiraAba() {

        if (!this.accessToken) {

            throw new Error(
                'Usuário não está conectado ao Google.'
            );
        }

        if (!this.spreadsheetIdSalvo) {

            throw new Error(
                'ID da planilha não encontrado.'
            );
        }

        const resposta =
            await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetIdSalvo}?fields=sheets.properties`,
                {
                    method: 'GET',

                    headers: {
                        Authorization:
                            `Bearer ${this.accessToken}`
                    }
                }
            );

        if (!resposta.ok) {

            throw new Error(
                `Falha ao obter informações da planilha. Status: ${resposta.status}`
            );
        }

        const dados =
            await resposta.json();

        const primeiraAba =
            dados.sheets?.[0]?.properties;

        if (
            !primeiraAba ||
            !primeiraAba.title
        ) {

            throw new Error(
                'A planilha não possui uma aba válida.'
            );
        }

        this.nomeAba =
            primeiraAba.title;

        return this.nomeAba;
    }

    async obterNomeAbaComSeguranca() {

        if (this.nomeAba) {
            return this.nomeAba;
        }

        return await this.obterNomePrimeiraAba();
    }

    // =====================================================
    // PLANILHA
    // =====================================================

    async obterOuCriarPlanilhaDrive() {

        if (!this.accessToken) {

            throw new Error(
                'Usuário não está conectado ao Google.'
            );
        }

        const nomePlanilha =
            this.nomePlanilhaGoogle;

        const query =
            `name='${nomePlanilha.replace(
                /'/g,
                "\\'"
            )}' ` +
            `and mimeType='application/vnd.google-apps.spreadsheet' ` +
            `and trashed=false`;

        const respostaBusca =
            await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
                {
                    method: 'GET',

                    headers: {
                        Authorization:
                            `Bearer ${this.accessToken}`
                    }
                }
            );

        if (!respostaBusca.ok) {

            throw new Error(
                `Falha ao procurar a planilha no Google Drive. Status: ${respostaBusca.status}`
            );
        }

        const dadosBusca =
            await respostaBusca.json();

        if (
            dadosBusca.files &&
            dadosBusca.files.length > 0
        ) {

            this.spreadsheetIdSalvo =
                dadosBusca.files[0].id;

            localStorage.setItem(
                this.spreadsheetStorageKey,
                this.spreadsheetIdSalvo
            );

            // Descobre automaticamente
            // o nome real da primeira aba.
            await this.obterNomePrimeiraAba();

            return this.spreadsheetIdSalvo;
        }

        // =================================================
        // CRIAR NOVA PLANILHA
        // =================================================

        const respostaCriacao =
            await fetch(
                'https://sheets.googleapis.com/v4/spreadsheets',
                {
                    method: 'POST',

                    headers: {
                        Authorization:
                            `Bearer ${this.accessToken}`,

                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        properties: {
                            title:
                                nomePlanilha
                        }
                    })
                }
            );

        if (!respostaCriacao.ok) {

            throw new Error(
                `Falha ao criar a planilha no Google Sheets. Status: ${respostaCriacao.status}`
            );
        }

        const novaPlanilha =
            await respostaCriacao.json();

        this.spreadsheetIdSalvo =
            novaPlanilha.spreadsheetId;

        localStorage.setItem(
            this.spreadsheetStorageKey,
            this.spreadsheetIdSalvo
        );

        // A API retorna a primeira aba
        // da nova planilha.
        this.nomeAba =
            novaPlanilha.sheets?.[0]?.properties?.title ||
            'Página1';

        const cabecalho =
            [
                [
                    'Data do Lançamento',
                    'Descrição / Texto Bruto',
                    'Peças',
                    'Valor Unitário',
                    'Valor Total'
                ]
            ];

        const nomeAbaCodificado =
            encodeURIComponent(
                this.nomeAba
            );

        const respostaCabecalho =
            await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetIdSalvo}/values/${nomeAbaCodificado}!A1:E1?valueInputOption=USER_ENTERED`,
                {
                    method: 'PUT',

                    headers: {
                        Authorization:
                            `Bearer ${this.accessToken}`,

                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        values:
                            cabecalho
                    })
                }
            );

        if (!respostaCabecalho.ok) {

            throw new Error(
                `Falha ao criar o cabeçalho da planilha. Status: ${respostaCabecalho.status}`
            );
        }

        return this.spreadsheetIdSalvo;
    }

    // =====================================================
    // GARANTIR PLANILHA E ABA
    // =====================================================

    async garantirPlanilha() {

        if (!this.spreadsheetIdSalvo) {

            await this.obterOuCriarPlanilhaDrive();

            return;
        }

        try {

            await this.obterNomePrimeiraAba();

        } catch (erro) {

            console.warn(
                'Planilha salva localmente não pôde ser acessada. Procurando novamente no Drive...',
                erro
            );

            this.spreadsheetIdSalvo =
                null;

            this.nomeAba =
                null;

            localStorage.removeItem(
                this.spreadsheetStorageKey
            );

            await this.obterOuCriarPlanilhaDrive();
        }
    }

    // =====================================================
    // ENVIAR LANÇAMENTOS
    // =====================================================

    async enviarLancamentos(linhas) {

        if (!this.accessToken) {

            throw new Error(
                'Usuário não está conectado ao Google.'
            );
        }

        if (
            !Array.isArray(linhas) ||
            linhas.length === 0
        ) {

            throw new Error(
                'Nenhum lançamento foi enviado para a planilha.'
            );
        }

        await this.garantirPlanilha();

        const nomeAba =
            await this.obterNomeAbaComSeguranca();

        const nomeAbaCodificado =
            encodeURIComponent(
                nomeAba
            );

        const resposta =
            await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetIdSalvo}/values/${nomeAbaCodificado}!A:E:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
                {
                    method: 'POST',

                    headers: {
                        Authorization:
                            `Bearer ${this.accessToken}`,

                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        values:
                            linhas
                    })
                }
            );

        if (!resposta.ok) {

            const erroTexto =
                await resposta.text();

            console.error(
                'Erro retornado pelo Google Sheets:',
                erroTexto
            );

            throw new Error(
                `Falha ao gravar dados na planilha. Status: ${resposta.status}`
            );
        }

        return await resposta.json();
    }

    // =====================================================
    // LER LANÇAMENTOS
    // =====================================================

    async lerLancamentos() {

        if (!this.accessToken) {

            throw new Error(
                'Usuário não está conectado ao Google.'
            );
        }

        await this.garantirPlanilha();

        const nomeAba =
            await this.obterNomeAbaComSeguranca();

        const nomeAbaCodificado =
            encodeURIComponent(
                nomeAba
            );

        const resposta =
            await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetIdSalvo}/values/${nomeAbaCodificado}!A:E`,
                {
                    method: 'GET',

                    headers: {
                        Authorization:
                            `Bearer ${this.accessToken}`
                    }
                }
            );

        if (!resposta.ok) {

            const erroTexto =
                await resposta.text();

            console.error(
                'Erro ao ler Google Sheets:',
                erroTexto
            );

            throw new Error(
                `Falha ao ler dados da planilha. Status: ${resposta.status}`
            );
        }

        const dados =
            await resposta.json();

        return dados.values || [];
    }
}