export class StorageService {
    constructor() {
        this.dbName = 'TraveteDB';
        this.storeName = 'semanas';
        this.dbVersion = 1;
    }

    async abrirDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                return reject(window.localStorage);
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
                        this.storeName,
                        {
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

                const semanas =
                    JSON.parse(
                        db.getItem(
                            'historico_semanas'
                        ) || '[]'
                    );

                semanas.push(semana);

                db.setItem(
                    'historico_semanas',
                    JSON.stringify(semanas)
                );

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

                    request.onsuccess =
                        () => resolve(true);

                    request.onerror =
                        () => reject(
                            request.error
                        );
                }
            );

        } catch (e) {

            console.error(
                'Erro ao salvar no storage:',
                e
            );

        }
    }

    async obterTodasSemanas() {
        try {

            const db =
                await this.abrirDB();

            if (db instanceof Storage) {

                return JSON.parse(
                    db.getItem(
                        'historico_semanas'
                    ) || '[]'
                );

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
                    JSON.parse(
                        db.getItem(
                            'historico_semanas'
                        ) || '[]'
                    );


                const novasSemanas =
                    semanas.filter(
                        semana =>
                            semana.id !== id
                    );


                db.setItem(
                    'historico_semanas',
                    JSON.stringify(
                        novasSemanas
                    )
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


                    request.onsuccess =
                        () => resolve(true);


                    request.onerror =
                        () =>
                            reject(
                                request.error
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

            const semanas =
                JSON.parse(
                    db.getItem(
                        'historico_semanas'
                    ) || '[]'
                );


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


            semana.pecasTotal =
                semana.registros.reduce(
                    (
                        total,
                        registro
                    ) =>
                        total +
                        Number(
                            registro.pecas || 0
                        ),
                    0
                );


            semana.valorTotal =
                semana.registros.reduce(
                    (
                        total,
                        registro
                    ) =>
                        total +
                        Number(
                            registro.valorTotal || 0
                        ),
                    0
                );


            const novasSemanas =
                semanas.filter(
                    item =>
                        item.id !== idSemana
                );


            novasSemanas.push(
                semana
            );


            db.setItem(
                'historico_semanas',
                JSON.stringify(
                    novasSemanas
                )
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


                        semana.pecasTotal =
                            semana.registros.reduce(
                                (
                                    total,
                                    registro
                                ) =>
                                    total +
                                    Number(
                                        registro.pecas || 0
                                    ),
                                0
                            );


                        semana.valorTotal =
                            semana.registros.reduce(
                                (
                                    total,
                                    registro
                                ) =>
                                    total +
                                    Number(
                                        registro.valorTotal || 0
                                    ),
                                0
                            );


                        const salvar =
                            store.put(
                                semana
                            );


                        salvar.onsuccess =
                            () =>
                                resolve(true);


                        salvar.onerror =
                            () =>
                                reject(
                                    salvar.error
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

                db.removeItem(
                    'historico_semanas'
                );

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


                    request.onsuccess =
                        () => resolve(true);


                    request.onerror =
                        () =>
                            reject(
                                request.error
                            );

                }
            );

        } catch (e) {

            console.error(
                'Erro ao limpar storage:',
                e
            );

        }
    }
}