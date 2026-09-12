export class StorageService {
    constructor(dbName = 'TraveteDB', storeName = 'semanas') {
        this.dbName = dbName;
        this.storeName = storeName;
    }

    async _abrirBanco() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
        });
    }

    async salvarSemana(semanaObj) {
        const db = await this._abrirBanco();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(semanaObj);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async obterTodasSemanas() {
        const db = await this._abrirBanco();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deletarSemana(id) {
        const db = await this._abrirBanco();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Método para pegar todos os dados do banco para backup
    async exportarDados() {
        const semanas = await this.obterTodasSemanas();
        const tempLancamentos = JSON.parse(localStorage.getItem('temp_lancamentos')) || [];
        
        const backupObj = {
            versao: 1,
            dataBackup: new Date().toISOString(),
            temp_lancamentos: tempLancamentos,
            historicoSemanas: semanas
        };
        
        return JSON.stringify(backupObj, null, 2);
    }

    // Método para restaurar dados de um backup
    async importarDados(jsonData) {
        try {
            const dados = JSON.parse(jsonData);
            if (!dados.historicoSemanas) {
                throw new Error('Arquivo de backup inválido.');
            }

            // Salva os lançamentos temporários no localStorage
            if (dados.temp_lancamentos) {
                localStorage.setItem('temp_lancamentos', JSON.stringify(dados.temp_lancamentos));
            }

            // Insere cada semana salva no IndexedDB usando o método existente
            for (const semana of dados.historicoSemanas) {
                await this.salvarSemana(semana);
            }
            return true;
        } catch (e) {
            console.error('Erro ao importar backup:', e);
            return false;
        }
    }
}
