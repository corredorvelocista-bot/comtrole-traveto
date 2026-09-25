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

        this.tokenClient = null;

        this.accessToken =
            localStorage.getItem(
                'google_access_token'
            ) || null;

        this.spreadsheetIdSalvo =
            localStorage.getItem(
                this.spreadsheetStorageKey
            ) ||
            null;

        this.onLoginStatusChange =
            config.onLoginStatusChange || (() => { });

        this.onRender =
            config.onRender || (() => { });
    }

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
                () => this.initGoogleAuth(),
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
                            console.error(response);
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
        if (this.accessToken) {
            google.accounts.oauth2.revoke(
                this.accessToken,
                () => {
                    this.accessToken = null;

                    localStorage.removeItem(
                        'google_access_token'
                    );

                    localStorage.removeItem(
                        this.spreadsheetStorageKey
                    );

                    this.spreadsheetIdSalvo =
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
    }

    async obterOuCriarPlanilhaDrive() {
        const nomePlanilha =
            this.nomePlanilhaGoogle;

        const query =
            `name='${nomePlanilha.replace(/'/g, "\\'")}' ` +
            `and mimeType='application/vnd.google-apps.spreadsheet' ` +
            `and trashed=false`;

        const respostaBusca =
            await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${this.accessToken}`
                    }
                }
            );

        if (!respostaBusca.ok) {
            throw new Error(
                'Falha ao procurar a planilha no Google Drive.'
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

            return this.spreadsheetIdSalvo;
        }

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
                'Falha ao criar a planilha no Google Sheets.'
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

        await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetIdSalvo}/values/Página1!A1:E1?valueInputOption=USER_ENTERED`,
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

        return this.spreadsheetIdSalvo;
    }

    async enviarLancamentos(linhas) {
        if (!this.accessToken) {
            throw new Error(
                'Usuário não está conectado ao Google.'
            );
        }

        if (!this.spreadsheetIdSalvo) {
            await this.obterOuCriarPlanilhaDrive();
        }

        const resposta =
            await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetIdSalvo}/values/Página1!A:E:append?valueInputOption=USER_ENTERED`,
                {
                    method: 'POST',

                    headers: {
                        Authorization:
                            `Bearer ${this.accessToken}`,

                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        values: linhas
                    })
                }
            );

        if (!resposta.ok) {
            throw new Error(
                `Falha ao gravar dados na planilha. Status: ${resposta.status}`
            );
        }

        return await resposta.json();
    }

    async lerLancamentos() {
        if (!this.accessToken) {
            throw new Error(
                'Usuário não está conectado ao Google.'
            );
        }

        if (!this.spreadsheetIdSalvo) {
            await this.obterOuCriarPlanilhaDrive();
        }

        const resposta =
            await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetIdSalvo}/values/Página1!A:E`,
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
                `Falha ao ler dados da planilha. Status: ${resposta.status}`
            );
        }

        const dados =
            await resposta.json();

        return dados.values || [];
    }    
}