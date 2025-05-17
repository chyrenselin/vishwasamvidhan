const CACHE_NAME = 'vishwa-samvidhan-v2.7'; // Increment version
// Add paths to other critical local assets
const urlsToCache = [
    './', // Cache the main entry point (often resolves to index.html)
    'index.html',
    'style.css',
    'script.js',
    'manifest.json'
    // Add path to 'assets/glogo.png' if you include it
    // e.g., 'assets/glogo.png' 
];

self.addEventListener('install', event => {
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Vishwa Samvidhan SW: Opened cache');
                return cache.addAll(urlsToCache); 
            })
            .catch(err => {
                 console.error('Vishwa Samvidhan SW: Failed to cache essential assets during install - ', err);
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Vishwa Samvidhan SW: Clearing old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Ensures SW takes control of current page immediately
    );
});

self.addEventListener('fetch', event => {
    // We only care about GET requests for caching
    if (event.request.method !== 'GET') {
        return;
    }
    
    const requestUrl = new URL(event.request.url);

    // Network-first for Google APIs and other external resources to ensure freshness.
    if (requestUrl.hostname.includes('translate.googleapis.com') || 
        requestUrl.hostname.includes('translate.google.com') ||
        requestUrl.hostname.includes('fonts.googleapis.com') || 
        requestUrl.hostname.includes('fonts.gstatic.com')) {  
        event.respondWith(fetch(event.request));
        return;
    }

    // For local assets: Cache-first strategy.
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request.clone()).then(networkResponse => {
                    if (networkResponse && networkResponse.ok && requestUrl.origin === self.location.origin) { 
                        const responseToCache = networkResponse.clone(); 
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                    }
                    return networkResponse;
                }).catch(error => {
                    console.warn('Vishwa Samvidhan SW: Network fetch failed for ', event.request.url, '; Error: ', error);
                    // Optionally, return a generic offline fallback page for HTML requests if not cached
                    // if (event.request.destination === 'document') {
                    //    return caches.match('offline.html'); 
                    // }
                });
            })
    );
});