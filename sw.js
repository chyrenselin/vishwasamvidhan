// ============================================================================
// Vishwa Samvidhan - Service Worker - v1.0
// Inspired by advanced caching strategies
// ============================================================================

const CACHE_NAME_STATIC = 'vishwa-samvidhan-static-v1.0'; // For app shell and core static assets
const CACHE_NAME_DYNAMIC = 'vishwa-samvidhan-dynamic-v1.0'; // For dynamic content and API responses (if any)
const CACHE_NAME_FONTS = 'vishwa-samvidhan-fonts-v1.0';   // For Google Fonts

const CORE_ASSETS_TO_CACHE = [
  './', // Represents index.html at the root
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'assets/Vishwa-Samvidhan-Anthem.mp3',
  'assets/glogo.png', // Assuming it's used and local
  // Add other critical local images or SVGs here
  // 'assets/images/og-vishwa-samvidhan-nebula.jpg', // Example
];

const FONT_HOSTS = [
    'fonts.googleapis.com',
    'fonts.gstatic.com'
];

const MAX_DYNAMIC_CACHE_SIZE = 50; // Max number of items in the dynamic cache

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Limits the size of a dynamic cache.
 * @param {string} cacheName The name of the cache to trim.
 * @param {number} maxSize The maximum number of items allowed in the cache.
 */
const trimCache = async (cacheName, maxSize) => {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxSize) {
      console.log(`[SW] Trimming cache '${cacheName}' from ${keys.length} to ${maxSize} items.`);
      await Promise.all(keys.slice(0, keys.length - maxSize).map(key => cache.delete(key)));
    }
  } catch (error) {
    console.error(`[SW] Error trimming cache '${cacheName}':`, error);
  }
};

// ============================================================================
// Service Worker Lifecycle Events
// ============================================================================

self.addEventListener('install', (event) => {
  console.log(`[SW] Installing v${CACHE_NAME_STATIC}`);
  event.waitUntil(
    caches.open(CACHE_NAME_STATIC)
      .then((cache) => {
        console.log('[SW] Caching core static assets:', CORE_ASSETS_TO_CACHE);
        return Promise.all(
          CORE_ASSETS_TO_CACHE.map(url =>
            cache.add(url).catch(err => console.warn(`[SW] Failed to cache '${url}' during install:`, err))
          )
        );
      })
      .then(() => {
        console.log('[SW] Core static assets cached successfully.');
        return self.skipWaiting(); // Activate new SW immediately
      })
      .catch((error) => {
        console.error('[SW] Core static assets caching failed during install:', error);
        // Optionally, don't call skipWaiting() here to let the old SW continue
        // if core assets fail, though this might prevent updates if always failing.
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating. Old caches will be cleared (if name changed).`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_NAME_STATIC &&
            cacheName !== CACHE_NAME_DYNAMIC &&
            cacheName !== CACHE_NAME_FONTS &&
            cacheName.startsWith('vishwa-samvidhan-') // Be specific to avoid deleting unrelated caches
          ) {
            console.log(`[SW] Clearing old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
        console.log('[SW] Old caches cleared.');
        return self.clients.claim(); // Take control of all open clients
    })
    .catch(error => {
        console.error('[SW] Error during activation (clearing old caches or claiming clients):', error);
    })
  );
});

// ============================================================================
// Fetch Event Handler with Caching Strategies
// ============================================================================

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests and requests to different origins unless specifically handled
  if (request.method !== 'GET') {
    return;
  }

  // 1. Strategy: Google Fonts - Cache then Network, with stale-while-revalidate for CSS
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(CACHE_NAME_FONTS).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const networkFetch = fetch(request).then(networkResponse => {
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(error => {
            console.warn(`[SW] Network fetch failed for font resource: ${request.url}`, error);
            // If cached, the cachedResponse will be returned below. If not, it's a genuine network error.
        });

        // For font CSS (googleapis.com), use stale-while-revalidate
        if (url.hostname === 'fonts.googleapis.com' && cachedResponse) {
            // console.log(`[SW] Font CSS: Stale-while-revalidate for ${request.url}`);
            // Return cached response immediately if available, and update cache in background
            // This requires the networkFetch promise to be handled but not awaited here directly.
            // The `networkFetch` promise ensures the cache gets updated.
            return cachedResponse;
        }
        // For actual font files (gstatic.com) or if font CSS not in cache: network first, fallback to cache
        // Or, if cachedResponse is available, return it and update in background (cache-first-then-network for fonts themselves too)
        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  // 2. Strategy: Google Translate - Network Only (these change frequently and are not suitable for aggressive caching)
  if (url.hostname.includes('translate.googleapis.com') || url.hostname.includes('translate.google.com')) {
    // console.log(`[SW] Network-only for Google Translate: ${request.url}`);
    event.respondWith(
        fetch(request).catch(error => {
            console.warn(`[SW] Network fetch failed for Google Translate: ${request.url}`, error);
            // No offline fallback needed for translate functionality usually
        })
    );
    return;
  }

  // 3. Strategy: Core Static Assets (App Shell) - Cache First, then Network
  // Check if the request URL is one of our core assets or the root path
  const isCoreAsset = CORE_ASSETS_TO_CACHE.includes(url.pathname.substring(1)) || // remove leading / for matching
                      (url.pathname === '/' || url.pathname === '/index.html');

  if (isCoreAsset || (request.destination && ['document', 'style', 'script', 'image', 'font', 'audio'].includes(request.destination))) {
      const cacheToUse = isCoreAsset ? CACHE_NAME_STATIC : CACHE_NAME_DYNAMIC;
      event.respondWith(
          caches.match(request).then(cachedResponse => {
              if (cachedResponse) {
                  // console.log(`[SW] Serving from cache (${cacheToUse}): ${request.url}`);
                  return cachedResponse;
              }

              // console.log(`[SW] Not in cache. Fetching from network (for ${cacheToUse}): ${request.url}`);
              return fetch(request).then(networkResponse => {
                  if (!networkResponse || !networkResponse.ok) {
                      // If network fails or returns bad status, and not cached, throw error or return placeholder
                      console.warn(`[SW] Network fetch failed for ${request.url}, Status: ${networkResponse ? networkResponse.status : 'N/A'}`);
                      // For HTML documents, you might want a specific offline page
                      if (request.destination === 'document') {
                          // return caches.match('/offline.html'); // You'd need to create and cache an offline.html
                      }
                      return networkResponse; // Or throw an error to let browser handle
                  }

                  // If successful, cache it (only if from our origin for dynamic cache, or if it's a core asset)
                  if (url.origin === self.location.origin || isCoreAsset) {
                      const responseToCache = networkResponse.clone();
                      caches.open(cacheToUse).then(cache => {
                          cache.put(request, responseToCache);
                          if (cacheToUse === CACHE_NAME_DYNAMIC) {
                              trimCache(CACHE_NAME_DYNAMIC, MAX_DYNAMIC_CACHE_SIZE);
                          }
                      });
                  }
                  return networkResponse;
              }).catch(error => {
                  console.error(`[SW] Fetching failed for ${request.url}:`, error);
                  // Fallback for critical assets or specific error page
                  if (request.destination === 'document') {
                      // return caches.match('/offline.html');
                  }
                  // Propagate the error so the browser handles it (e.g., shows its offline page)
                  throw error;
              });
          })
      );
      return;
  }


  // 4. Default: Network Only for everything else (or handle as appropriate)
  // This handles requests not matched by previous strategies.
  // console.log(`[SW] Defaulting to network for: ${request.url}`);
  event.respondWith(fetch(request));
});


// Optional: Add listeners for other events like 'message' for communication with clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message. Calling self.skipWaiting().');
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CLEAR_CACHES') {
    console.log('[SW] Received CLEAR_CACHES message. Clearing all known caches.');
    event.waitUntil(
      Promise.all([
        caches.delete(CACHE_NAME_STATIC),
        caches.delete(CACHE_NAME_DYNAMIC),
        caches.delete(CACHE_NAME_FONTS)
      ]).then(() => {
        console.log('[SW] All specified caches cleared via message.');
        // Optionally, notify clients
        self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage({ type: 'CACHES_CLEARED_ACK' }));
        });
      })
    );
  }
});

// Optional: Background Sync (requires user permission and is more for specific tasks)
// self.addEventListener('sync', (event) => {
//   if (event.tag === 'my-background-sync-tag') {
//     event.waitUntil(doSomeBackgroundWork());
//   }
// });

// const doSomeBackgroundWork = () => {
//   console.log('[SW] Performing background sync task.');
//   // Example: return fetch('/api/sync-data', {method: 'POST', body: ... });
// };

console.log('[SW] Service Worker script loaded and evaluated.');
