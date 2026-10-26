const CACHE_NAME = 'travete-v7';
const APP_VERSION = '1.0.2';

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

                return self.clients.claim();

            })

    );

});


/**
 * =========================================================
 * MENSAGENS
 * =========================================================
 */
self.addEventListener('message', (event) => {

    if (!event.data) {
        return;
    }


    /**
     * Retorna a versão do Service Worker.
     */
    if (event.data.type === 'GET_VERSION') {

        const resposta = {
            type: 'SW_VERSION',
            version: APP_VERSION
        };


        if (
            event.ports &&
            event.ports[0]
        ) {

            event.ports[0].postMessage(
                resposta
            );

        } else if (
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
     * Permite que o novo Service Worker
     * assuma imediatamente o controle.
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
 * Para arquivos do próprio aplicativo:
 *
 * 1. Tenta a rede primeiro.
 * 2. Se funcionar, atualiza o cache.
 * 3. Se estiver offline, usa o cache.
 *
 * Isso evita que index.html e app.js antigos
 * fiquem presos no cache.
 */
self.addEventListener('fetch', (event) => {

    if (
        event.request.method !== 'GET'
    ) {

        return;
    }


    const url =
        new URL(
            event.request.url
        );


    const mesmaOrigem =
        url.origin === self.location.origin;


    if (!mesmaOrigem) {

        return;
    }


    event.respondWith(

        fetch(event.request)

            .then((networkResponse) => {

                /*
                 * Se a resposta for válida,
                 * atualiza o cache.
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
                 * Sem internet:
                 * utiliza o cache.
                 */
                return caches.match(
                    event.request
                );

            })

    );

});