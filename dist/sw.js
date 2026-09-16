const CACHE_NAME = 'travete-v6';
const APP_VERSION = '1.0.1';

const assets = [
    './',
    './index.html',
    './manifest.json',
    './src/js/StorageService.js',
    './src/js/Producao.js',
    './src/js/app.js',
    './icon-192.png',
    './icon-512.png'
];

/**
 * =========================================================
 * INSTALAÇÃO
 * =========================================================
 *
 * IMPORTANTE:
 * Não usamos self.skipWaiting() automaticamente aqui.
 *
 * Isso permite que o novo Service Worker fique em
 * "waiting" até o usuário escolher "Atualizar agora".
 */
self.addEventListener('install', (event) => {

    event.waitUntil(

        caches
            .open(CACHE_NAME)

            .then((cache) => {

                return cache.addAll(assets);

            })

    );
});


/**
 * =========================================================
 * ATIVAÇÃO
 * =========================================================
 *
 * Remove versões antigas do cache.
 */
self.addEventListener('activate', (event) => {

    event.waitUntil(

        caches
            .keys()

            .then((cacheNames) => {

                return Promise.all(

                    cacheNames
                        .filter((cacheName) => {

                            return (
                                cacheName.startsWith('travete-') &&
                                cacheName !== CACHE_NAME
                            );

                        })

                        .map((cacheName) => {

                            return caches.delete(
                                cacheName
                            );

                        })

                );

            })

            .then(() => {

                /*
                 * Depois que este Service Worker estiver
                 * oficialmente ativo, ele pode assumir
                 * as páginas abertas.
                 */
                return self.clients.claim();

            })

    );
});


/**
 * =========================================================
 * MENSAGENS RECEBIDAS DO APP
 * =========================================================
 */
self.addEventListener('message', (event) => {

    if (!event.data) {
        return;
    }


    /**
     * O app pode solicitar a versão
     * deste Service Worker.
     */
    if (
        event.data.type === 'GET_VERSION'
    ) {

        const resposta = {
            type: 'SW_VERSION',
            version: APP_VERSION
        };


        /*
         * Se o navegador disponibilizar
         * MessagePort, respondemos por ele.
         */
        if (
            event.ports &&
            event.ports[0]
        ) {

            event.ports[0].postMessage(
                resposta
            );

        }

        /*
         * Também enviamos para a página
         * que fez a solicitação.
         */
        else if (
            event.source &&
            typeof event.source.postMessage ===
                'function'
        ) {

            event.source.postMessage(
                resposta
            );

        }

        return;
    }


    /**
     * O usuário confirmou:
     *
     * "Atualizar agora"
     *
     * Então o novo Service Worker
     * pode assumir o controle.
     */
    if (
        event.data.type === 'SKIP_WAITING'
    ) {

        self.skipWaiting();

        return;
    }

});


/**
 * =========================================================
 * REQUISIÇÕES
 * =========================================================
 *
 * Estratégia:
 *
 * 1. Arquivos do próprio aplicativo:
 *    Cache primeiro.
 *
 * 2. Se não estiver no cache:
 *    tenta a internet.
 *
 * 3. Se estiver offline:
 *    tenta retornar o index.html.
 *
 * Requisições externas, como Google APIs,
 * não são colocadas no cache.
 */
self.addEventListener('fetch', (event) => {

    /*
     * Só processamos GET.
     */
    if (
        event.request.method !== 'GET'
    ) {

        return;
    }


    const url =
        new URL(
            event.request.url
        );


    /*
     * Só aplica o cache especial
     * às requisições do próprio aplicativo.
     */
    const mesmaOrigem =
        url.origin === self.location.origin;


    if (!mesmaOrigem) {

        /*
         * Google, APIs externas etc.
         * seguem normalmente pela rede.
         */
        return;
    }


    event.respondWith(

        caches
            .match(event.request)

            .then((cachedResponse) => {

                /*
                 * Encontrou no cache.
                 */
                if (cachedResponse) {

                    return cachedResponse;
                }


                /*
                 * Não encontrou.
                 * Tenta buscar na internet.
                 */
                return fetch(event.request)

                    .then((networkResponse) => {

                        /*
                         * Só guarda respostas
                         * válidas no cache.
                         */
                        if (
                            networkResponse &&
                            networkResponse.status === 200
                        ) {

                            const responseClone =
                                networkResponse.clone();


                            caches
                                .open(CACHE_NAME)

                                .then((cache) => {

                                    cache.put(
                                        event.request,
                                        responseClone
                                    );

                                })

                                .catch((erro) => {

                                    console.warn(
                                        'Não foi possível atualizar o cache:',
                                        erro
                                    );

                                });

                        }


                        return networkResponse;

                    })

                    .catch(() => {

                        /*
                         * Offline:
                         * tenta abrir o aplicativo.
                         */
                        return caches.match(
                            './index.html'
                        );

                    });

            })

    );

});
