export class StorageService {
    constructor() {
        this.dbName = 'TraveteDB';
        this.storeName = 'semanas';
        this.dbVersion = 1;
    }

    obterLancamentosTemporarios() {

        const dados =
            localStorage.getItem(
                'temp_lancamentos'
            );

        if (!dados) {
            return [];
        }

        try {

            const lancamentos =
                JSON.parse(dados);

            return Array.isArray(lancamentos)
                ? lancamentos
                : [];

        } catch (erro) {

            console.error(
                'Erro ao carregar lançamentos temporários:',
                erro
            );

            return [];
        }
    }

    salvarLancamentosTemporarios(lancamentos) {

        localStorage.setItem(
            'temp_lancamentos',
            JSON.stringify(lancamentos)
        );
    }

    recalcularTotaisSemana(semana) {
        semana.pecasTotal = semana.registros.reduce(
            (total, registro) =>
            total + Number(registro.pecas || 0),
            0
        );

        semana.valorTotal = semana.registros.reduce(
            (total, registro) =>
            total + Number(registro.valorTotal || 0),
            0
        );

        return semana;
    }

    obterSemanasLocalStorage() {
        const dados =
            localStorage.getItem(
                'historico_semanas'
            );

        if (!dados) {
            return [];
        }

        try {
            const semanas =
                JSON.parse(dados);

            return Array.isArray(semanas)
                ? semanas
                : [];
        } catch (erro) {
            console.error(
                'Erro ao carregar histórico local:',
                erro
            );
            return [];
        }
    }

    salvarSemanasLocalStorage(semanas) {
        localStorage.setItem(
            'historico_semanas',
            JSON.stringify(semanas)
        );
    }

    async abrirDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                return resolve(window.localStorage);
            }

            const request = indexedDB.open(
                this.dbName,
                this.dbVersion
            );

            request.onerror = () =>
                reject(request.error);

            request.onsuccess = () =>
                resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db =
                    event.target.result;

                if (
                    !db.objectStoreNames.contains(
                        this.storeName
                    )
                ) {
                    db.createObjectStore(
                        this.storeName, {
                            keyPath: 'id'
                        }
                    );
                }
            };
        });
    }

    async salvarSemana(semana) {
        try {
            const db =
                await this.abrirDB();

            if (db instanceof Storage) {
                const semanas = this.obterSemanasLocalStorage();
                semanas.push(semana);

                this.salvarSemanasLocalStorage(semanas);
                return;
            }

            return new Promise(
                (resolve, reject) => {

                    const transaction =
                        db.transaction(
                            [this.storeName],
                            'readwrite'
                        );

                    const store =
                        transaction.objectStore(
                            this.storeName
                        );

                    const request =
                        store.put(semana);

                    request.onerror =
                        () => reject(
                            request.error
                        );

                    transaction.oncomplete =
                        () => resolve(true);

                    transaction.onerror =
                        () => reject(
                            transaction.error
                        );

                    transaction.onabort =
                        () => reject(
                            transaction.error ||
                            new Error(
                                'Transação do IndexedDB abortada.'
                            )
                        );
                }
            );

        } catch (e) {

            console.error(
                'Erro ao salvar no storage:',
                e
            );

            throw e;

        }
    }

    async substituirTodasSemanas(semanas) {

        if (!Array.isArray(semanas)) {
            throw new Error(
                'Lista de semanas inválida.'
            );
        }

        try {

            const db =
                await this.abrirDB();

            if (db instanceof Storage) {

                this.salvarSemanasLocalStorage(
                    semanas
                );

                return true;
            }

            return new Promise(
                (resolve, reject) => {

                    const transaction =
                        db.transaction(
                            [this.storeName],
                            'readwrite'
                        );

                    const store =
                        transaction.objectStore(
                            this.storeName
                        );

                    const limpar =
                        store.clear();

                    limpar.onerror =
                        () =>
                        reject(
                            limpar.error
                        );

                    limpar.onsuccess =
                        () => {

                            semanas.forEach(
                                semana => {
                                    store.put(semana);
                                }
                            );

                        };

                    transaction.oncomplete =
                        () => resolve(true);

                    transaction.onerror =
                        () =>
                        reject(
                            transaction.error
                        );

                    transaction.onabort =
                        () =>
                        reject(
                            transaction.error ||
                            new Error(
                                'Transação do IndexedDB abortada.'
                            )
                        );

                }
            );

        } catch (erro) {

            console.error(
                'Erro ao substituir histórico:',
                erro
            );

            throw erro;
        }
    }

    async obterTodasSemanas() {
        try {

            const db =
                await this.abrirDB();

            if (db instanceof Storage) {
                return this.obterSemanasLocalStorage();
            }

            return new Promise(
                (resolve, reject) => {

                    const transaction =
                        db.transaction(
                            [this.storeName],
                            'readonly'
                        );

                    const store =
                        transaction.objectStore(
                            this.storeName
                        );

                    const request =
                        store.getAll();

                    request.onsuccess =
                        () =>
                        resolve(
                            request.result || []
                        );

                    request.onerror =
                        () =>
                        reject(
                            request.error
                        );

                }
            );

        } catch (e) {

            console.error(
                'Erro ao buscar semanas:',
                e
            );

            return [];

        }
    }


    /* EXCLUI UMA SEMANA ESPECÍFICA */

    async excluirSemana(id) {

        try {

            const db =
                await this.abrirDB();


            /* FALLBACK LOCALSTORAGE */

            if (db instanceof Storage) {
                const semanas =
                    this.obterSemanasLocalStorage();

                const novasSemanas =
                    semanas.filter(
                        semana =>
                        semana.id !== id
                    );

                this.salvarSemanasLocalStorage(
                    novasSemanas
                );
                return true;
            }

            /* INDEXEDDB */
            return new Promise(
                (resolve, reject) => {

                    const transaction =
                        db.transaction(
                            [this.storeName],
                            'readwrite'
                        );


                    const store =
                        transaction.objectStore(
                            this.storeName
                        );


                    const request =
                        store.delete(id);


                    transaction.oncomplete =
                        () => resolve(true);


                    request.onerror =
                        () =>
                        reject(
                            request.error
                        );

                    transaction.onerror =
                        () =>
                        reject(
                            transaction.error
                        );

                    transaction.onabort =
                        () =>
                        reject(
                            transaction.error ||
                            new Error(
                                'Transação do IndexedDB abortada.'
                            )
                        );

                }
            );

        } catch (e) {

            console.error(
                'Erro ao excluir semana:',
                e
            );

            return false;

        }
    }


    async excluirLancamento(idSemana, indiceLancamento) {

        try {

            const db =
                await this.abrirDB();


            /* FALLBACK LOCALSTORAGE */

            if (db instanceof Storage) {

                const semanas = this.obterSemanasLocalStorage();

                const semana =
                    semanas.find(
                        item =>
                        item.id === idSemana
                    );


                if (!semana) {
                    return false;
                }


                if (
                    !Array.isArray(
                        semana.registros
                    )
                ) {
                    return false;
                }


                if (
                    indiceLancamento < 0 ||
                    indiceLancamento >=
                    semana.registros.length
                ) {
                    return false;
                }


                semana.registros.splice(
                    indiceLancamento,
                    1
                );

                this.recalcularTotaisSemana(semana);

                const novasSemanas =
                    semanas.filter(
                        item =>
                        item.id !== idSemana
                    );


                novasSemanas.push(semana);

                this.salvarSemanasLocalStorage(novasSemanas);
                return true;
            }


            /* INDEXEDDB */

            return new Promise(
                (resolve, reject) => {

                    const transaction =
                        db.transaction(
                            [this.storeName],
                            'readwrite'
                        );


                    const store =
                        transaction.objectStore(
                            this.storeName
                        );


                    const request =
                        store.get(idSemana);


                    request.onerror =
                        () =>
                        reject(
                            request.error
                        );


                    request.onsuccess =
                        () => {

                            const semana =
                                request.result;


                            if (!semana) {

                                resolve(false);

                                return;
                            }


                            if (
                                !Array.isArray(
                                    semana.registros
                                )
                            ) {

                                resolve(false);

                                return;
                            }


                            if (
                                indiceLancamento < 0 ||
                                indiceLancamento >=
                                semana.registros.length
                            ) {

                                resolve(false);

                                return;
                            }


                            semana.registros.splice(
                                indiceLancamento,
                                1
                            );


                            this.recalcularTotaisSemana(semana);

                            const salvar =
                                store.put(
                                    semana
                                );


                            salvar.onerror =
                                () =>
                                reject(
                                    salvar.error
                                );

                            transaction.oncomplete =
                                () =>
                                resolve(true);

                            transaction.onerror =
                                () =>
                                reject(
                                    transaction.error
                                );

                            transaction.onabort =
                                () =>
                                reject(
                                    transaction.error ||
                                    new Error(
                                        'Transação do IndexedDB abortada.'
                                    )
                                );

                        };

                }
            );

        } catch (e) {

            console.error(
                'Erro ao excluir lançamento:',
                e
            );

            return false;
        }
    }

    async limparTudo() {

        try {

            const db =
                await this.abrirDB();

            if (db instanceof Storage) {
                localStorage.removeItem('historico_semanas');
                return;
            }

            return new Promise(
                (resolve, reject) => {

                    const transaction =
                        db.transaction(
                            [this.storeName],
                            'readwrite'
                        );

                    const store =
                        transaction.objectStore(
                            this.storeName
                        );

                    const request =
                        store.clear();


                    transaction.oncomplete =
                        () => {
                            localStorage.removeItem('historico_semanas');
                            resolve(true);
                        };


                    request.onerror =
                        () =>
                        reject(
                            request.error
                        );

                    transaction.onerror =
                        () =>
                        reject(
                            transaction.error
                        );

                    transaction.onabort =
                        () =>
                        reject(
                            transaction.error ||
                            new Error(
                                'Transação do IndexedDB abortada.'
                            )
                        );

                }
            );

        } catch (e) {

            console.error(
                'Erro ao limpar storage:',
                e
            );

            throw e;
        }
    }
}