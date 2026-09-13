export class StorageService {
    constructor() {
        this.dbName = 'TraveteDB';
        this.storeName = 'semanas';
        this.dbVersion = 1;
    }

    async abrirDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                return reject(window.localStorage); // Fallback se IndexedDB não suportado
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

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

    async salvarSemana(semana) {
        try {
            const db = await this.abrirDB();
            if (db instanceof Storage) {
                // Fallback LocalStorage
                const semanas = JSON.parse(db.getItem('historico_semanas') || '[]');
                semanas.push(semana);
                db.setItem('historico_semanas', JSON.stringify(semanas));
                return;
            }

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.put(semana);

                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error('Erro ao salvar no storage:', e);
        }
    }

    async obterTodasSemanas() {
        try {
            const db = await this.abrirDB();
            if (db instanceof Storage) {
                return JSON.parse(db.getItem('historico_semanas') || '[]');
            }

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.getAll();

                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error('Erro ao buscar semanas:', e);
            return [];
        }
    }

    async limparTudo() {
        try {
            const db = await this.abrirDB();
            if (db instanceof Storage) {
                db.removeItem('historico_semanas');
                return;
            }
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.clear();
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error('Erro ao limpar storage:', e);
        }
    }
}
