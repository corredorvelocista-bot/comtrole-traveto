/**
 * Integração Google Planilhas do Anotei.
 * Cada conta do Anotei recebe uma planilha própria no Google Drive do usuário Google conectado.
 * A planilha é identificada pelo ID da conta Anotei no título, para ser reencontrada em outros dispositivos
 * quando o usuário conectar a mesma conta Google.
 */
export class GoogleService {
  constructor(config = {}) {
    this.ambienteLocal = config.ambienteLocal === true;
    this.CLIENT_ID = this.ambienteLocal
      ? '751192071126-02fgofvlqbofcks42kb93jd8te7ktq24.apps.googleusercontent.com'
      : '751192071126-02l99756dcqr65orhm2iqs5hajnjr54i.apps.googleusercontent.com';
    this.SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
    this.usuarioAnoteiId = null;
    this.spreadsheetStorageKey = null;
    this.nomePlanilhaGoogle = 'Anotei';
    this.spreadsheetIdSalvo = null;
    this.accessToken = localStorage.getItem('google_access_token') || null;
    this.tokenClient = null;
    this.onLoginStatusChange = config.onLoginStatusChange || (() => {});
    this.onRender = config.onRender || (() => {});
  }

  configurarUsuario(usuarioId) {
    if (!usuarioId) throw new Error('Não foi possível identificar a conta atual do Anotei.');
    this.usuarioAnoteiId = String(usuarioId);
    this.spreadsheetStorageKey = `google_spreadsheet_id_${this.usuarioAnoteiId}`;
    this.nomePlanilhaGoogle = `Anotei - ${this.usuarioAnoteiId}`;
    this.spreadsheetIdSalvo = localStorage.getItem(this.spreadsheetStorageKey) || null;
  }

  initGoogleAuth() {
    if (!globalThis.google?.accounts?.oauth2) {
      const elemento = document.getElementById('google-status');
      if (elemento) elemento.textContent = 'Não foi possível carregar o login do Google. Verifique sua conexão e recarregue a página.';
      return;
    }
    this.tokenClient = globalThis.google.accounts.oauth2.initTokenClient({
      client_id: this.CLIENT_ID,
      scope: this.SCOPES,
      callback: response => {
        if (response.error || !response.access_token) {
          this.accessToken = null;
          this.onLoginStatusChange(false, null);
          const message = response.error_description || response.error || 'autenticação cancelada';
          const status = document.getElementById('google-status');
          if (status) status.textContent = `Não foi possível conectar ao Google: ${message}.`;
          return;
        }
        this.accessToken = response.access_token;
        localStorage.setItem('google_access_token', this.accessToken);
        this.onLoginStatusChange(true, this.accessToken);
        this.onRender();
      }
    });
    this.onLoginStatusChange(Boolean(this.accessToken), this.accessToken);
  }

  fazerLoginGoogle() {
    if (!this.tokenClient) throw new Error('O login do Google ainda não está pronto. Recarregue a página e tente novamente.');
    this.tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  fazerLogoutGoogle() {
    if (this.accessToken && globalThis.google?.accounts?.oauth2) {
      globalThis.google.accounts.oauth2.revoke(this.accessToken, () => {});
    }
    this.accessToken = null;
    localStorage.removeItem('google_access_token');
    this.onLoginStatusChange(false, null);
  }

  exigirConfiguracao() {
    if (!this.usuarioAnoteiId || !this.spreadsheetStorageKey) throw new Error('A conta do Anotei ainda não foi identificada. Entre no Anotei e atualize esta página.');
    if (!this.accessToken) throw new Error('Conecte sua conta Google primeiro.');
  }

  async requisicaoGoogle(url, options = {}) {
    this.exigirConfiguracao();
    const response = await fetch(url, {
      ...options,
      headers: { Authorization: `Bearer ${this.accessToken}`, ...(options.headers || {}) }
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      if (response.status === 401 || response.status === 403) {
        this.accessToken = null;
        localStorage.removeItem('google_access_token');
        this.onLoginStatusChange(false, null);
      }
      throw new Error(`Google Planilhas retornou HTTP ${response.status}${detail ? `: ${detail.slice(0, 220)}` : ''}`);
    }
    return response.status === 204 ? null : response.json();
  }

  async obterOuCriarPlanilha() {
    this.exigirConfiguracao();
    if (this.spreadsheetIdSalvo) {
      try {
        await this.requisicaoGoogle(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetIdSalvo}?fields=spreadsheetId,sheets.properties`);
        await this.garantirAbas();
        return this.spreadsheetIdSalvo;
      } catch (error) {
        if (!/HTTP 404|HTTP 403/.test(error.message)) throw error;
        this.spreadsheetIdSalvo = null;
        localStorage.removeItem(this.spreadsheetStorageKey);
      }
    }

    const query = `name='${this.nomePlanilhaGoogle.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
    const found = await this.requisicaoGoogle(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=100`);
    if (found.files?.length) {
      this.spreadsheetIdSalvo = found.files[0].id;
      localStorage.setItem(this.spreadsheetStorageKey, this.spreadsheetIdSalvo);
      await this.garantirAbas();
      return this.spreadsheetIdSalvo;
    }

    const created = await this.requisicaoGoogle('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: { title: this.nomePlanilhaGoogle },
        sheets: [
          { properties: { title: 'Produção', gridProperties: { frozenRowCount: 1 } } },
          { properties: { title: 'Despesas', gridProperties: { frozenRowCount: 1 } } }
        ]
      })
    });
    this.spreadsheetIdSalvo = created.spreadsheetId;
    localStorage.setItem(this.spreadsheetStorageKey, this.spreadsheetIdSalvo);
    await this.gravarCabecalhos();
    return this.spreadsheetIdSalvo;
  }

  async garantirAbas() {
    const info = await this.requisicaoGoogle(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetIdSalvo}?fields=sheets.properties`);
    const titles = (info.sheets || []).map(sheet => sheet.properties?.title);
    const requests = [];
    if (!titles.includes('Produção')) {
      const first = info.sheets?.[0]?.properties?.sheetId;
      if (first != null && titles.length === 1) {
        requests.push({ updateSheetProperties: { properties: { sheetId: first, title: 'Produção', gridProperties: { frozenRowCount: 1 } }, fields: 'title,gridProperties.frozenRowCount' } });
      } else requests.push({ addSheet: { properties: { title: 'Produção', gridProperties: { frozenRowCount: 1 } } } });
    }
    if (!titles.includes('Despesas')) requests.push({ addSheet: { properties: { title: 'Despesas', gridProperties: { frozenRowCount: 1 } } } });
    if (requests.length) await this.requisicaoGoogle(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetIdSalvo}:batchUpdate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requests })
    });
    await this.gravarCabecalhos();
  }

  async gravarCabecalhos() {
    const values = [
      { range: "'Produção'!A1:E1", values: [['Data', 'Descrição', 'Quantidade', 'Valor unitário', 'Valor calculado']] },
      { range: "'Despesas'!A1:E1", values: [['Data', 'Descrição', 'Valor', 'Situação', 'Categoria']] }
    ];
    await this.requisicaoGoogle(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetIdSalvo}/values:batchUpdate?valueInputOption=USER_ENTERED`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: values })
    });
  }

  async sincronizarTudo(lancamentos, despesas) {
    this.exigirConfiguracao();
    if (!Array.isArray(lancamentos) || !Array.isArray(despesas)) throw new TypeError('Os dados de produção e despesas precisam estar em listas válidas.');
    await this.obterOuCriarPlanilha();

    const productionRows = lancamentos.map(item => {
      const payload = item.source_payload && typeof item.source_payload === 'object' ? item.source_payload : item;
      const quantidade = Number(item.pecas ?? payload.pecas ?? payload.quantidade ?? 0) || 0;
      const unitario = Number(item.valor_unitario ?? payload.valorUnitario ?? payload.valor_unitario ?? 0.21) || 0;
      const total = Number(item.valor_total ?? payload.valorTotal ?? payload.valor_total ?? quantidade * unitario) || 0;
      return [item.data_producao ?? item.data_texto ?? payload.dataISO ?? payload.data ?? '', item.texto_bruto ?? item.texto_original ?? payload.descricao ?? payload.textoBruto ?? payload.textoOriginal ?? '', quantidade, unitario, total];
    });
    const expenseRows = despesas.map(item => {
      const payload = item.source_payload && typeof item.source_payload === 'object' ? item.source_payload : item;
      const estado = item.situacao ?? item.status_pagamento ?? item.status ?? payload.situacao ?? payload.statusPagamento ?? payload.status ?? (payload.pago === true ? 'paga' : 'pendente');
      const situacao = ['paga', 'pago', 'paid', 'quitada'].includes(String(estado).toLowerCase()) ? 'Pago' : 'Pendente';
      return [item.data_despesa ?? item.data_texto ?? payload.data ?? payload.data_despesa ?? '', item.descricao ?? payload.descricao ?? '', Number(item.valor ?? payload.valor ?? 0) || 0, situacao, item.categoria ?? payload.categoria ?? ''];
    });
    const allRanges = ["'Produção'!A2:E", "'Despesas'!A2:E"];
    await this.requisicaoGoogle(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetIdSalvo}/values:batchClear`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ranges: allRanges })
    });
    const data = [];
    if (productionRows.length) data.push({ range: "'Produção'!A2:E", values: productionRows });
    if (expenseRows.length) data.push({ range: "'Despesas'!A2:E", values: expenseRows });
    if (data.length) await this.requisicaoGoogle(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetIdSalvo}/values:batchUpdate?valueInputOption=USER_ENTERED`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data })
    });
    await this.gravarCabecalhos();
    return { spreadsheetId: this.spreadsheetIdSalvo, producao: productionRows.length, despesas: expenseRows.length };
  }

  obterUrlPlanilha() {
    if (!this.spreadsheetIdSalvo) return null;
    return `https://docs.google.com/spreadsheets/d/${this.spreadsheetIdSalvo}/edit`;
  }
}
