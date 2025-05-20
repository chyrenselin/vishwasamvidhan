// ============================================================================
// Vishwa Samvidhan - Service Worker - v3.4
// Updated with Stale While Revalidate strategy for better updates.
// Ensure you update the CACHE_NAME below whenever you deploy new code!
// ============================================================================

const CACHE_NAME = 'vishwa-samvidhan-cache-v3.4'; // <-- !!! UPDATE THIS STRING !!! Increment this whenever you change ANYTHING you want cached (HTML, CSS, JS, images etc.)

// List of core files to cache during installation. This is primarily for
// ensuring basic offline access from the very first load of the new SW.
// The Stale While Revalidate strategy will handle updates thereafter.
const CORE_ASSETS_TO_CACHE = [
  './', // Represents index.html at the root
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'assets/Vishwa-Samvidhan-Anthem.mp3',
  'assets/glogo.png', // Assuming it's used and local
  'assets/images/og-vishwa-samvidhan-nebula.jpg', // Include OG image if used
  // Add other critical local images or SVGs here that are part of the app shell
];

// List of hosts for third-party resources where we want specific caching behaviors.
const FONT_HOSTS = [
    'fonts.googleapis.com', // Google Fonts CSS
    'fonts.gstatic.com'     // Google Font files
];
const TRANSLATE_HOSTS = [
    'translate.google.com', // Google Translate core scripts/resources
    'translate.googleapis.com' // Google Translate API/elements scripts
];
// Add other third-party analytics or external script hosts if needed
const ANALYTICS_HOSTS = [
    'google-analytics.com',
    'googletagmanager.com'
];


// ============================================================================
// Helper Functions (if any)
// ============================================================================
// No specific helpers needed for the main strategies below, trimCache example removed for simplicity.

// ============================================================================
// Service Worker Lifecycle Events
// ============================================================================

self.addEventListener('install', (event) => {
  console.log(`[SW v${CACHE_NAME}] Install event: Caching core assets.`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Use cache.addAll to cache critical assets during install
        // Errors in addAll won't prevent SW activation, but the failed resources won't be in the cache
        console.log('[SW] Adding core assets to cache:', CORE_ASSETS_TO_CACHE);
        return cache.addAll(CORE_ASSETS_TO_CACHE.map(url => {
          // Ensure fully qualified URL for URLsToCache that might be relative (optional, addAll handles relative)
          // const requestUrl = url.startsWith('./') ? new URL(url, self.location.href).href : url;
          // return new Request(requestUrl); // Create a Request object to handle potential quirks

           // Basic fetch check within addAll promises for better error visibility during install
           return fetch(new Request(url))
               .then(response => {
                   if (!response.ok) {
                       console.warn(`[SW] Failed to cache '${url}' (${response.status}) during install.`);
                       // We can return response, but if it's not OK, it might cause problems later
                       // Alternatively, return a dummy or just log/ignore the failure within the promise chain
                       return response; // Will cache the non-ok response, maybe undesirable
                       // Instead of throwing or returning non-ok, maybe just log?
                       // throw new Error(`Failed to fetch ${url}: ${response.status}`); // This will cause addAll to fail for ALL URLs
                       // Returning a resolved promise with the non-ok response is standard for addAll partial failure visibility.
                   }
                   console.log(`[SW] Successfully cached '${url}' during install.`);
                   return response;
               })
               .catch(err => {
                   console.error(`[SW] Network error caching '${url}' during install:`, err);
                   // Return a new Response with status 500 to allow addAll to continue,
                   // indicating this resource failed to cache without breaking the whole process.
                   return new Response(null, { status: 500, statusText: 'Failed to cache by SW' });
               });
           })
         );
      })
      .then(() => {
          console.log(`[SW v${CACHE_NAME}] Core assets caching initiated. skipWaiting() called.`);
          self.skipWaiting(); // Activate the new Service Worker immediately
      })
      .catch((error) => {
        console.error(`[SW v${CACHE_NAME}] Error during install process:`, error);
        // Optionally, don't call self.skipWaiting() here to let the old SW manage things if install fails critically
        // self.skipWaiting(); // Still call skipWaiting to ensure new SW takes over eventually, even if caching was partial
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log(`[SW v${CACHE_NAME}] Activate event.`);
  // Clear old caches if their names don't match the current CACHE_NAME
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Only delete caches whose name is different from the current one
          // and matches a pattern we expect (e.g., starting with 'vishwa-samvidhan-cache-')
          if (cacheName !== CACHE_NAME && cacheName.startsWith('vishwa-samvidhan-cache-')) {
            console.log(`[SW v${CACHE_NAME}] Clearing old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
        console.log(`[SW v${CACHE_NAME}] Old caches cleared. Clients will now be controlled.`);
        return self.clients.claim(); // Take control of any uncontrolled clients (e.g., after installation)
    })
     .catch(error => {
        console.error(`[SW v${CACHE_NAME}] Error during activation (clearing old caches or claiming clients):`, error);
    })
  );
});

// ============================================================================
// Fetch Event Handler - Implementing Caching Strategies
// ============================================================================

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests
  if (request.method !== 'GET') {
    // console.log(`[SW] Ignoring non-GET request: ${request.method} ${request.url}`);
    return; // Let other requests go to network normally
  }

  // 1. Network Only / Specific Third-Party Handling:
  // Don't cache or serve from cache for dynamic or analytics resources
  const hostname = url.hostname;
  if (TRANSLATE_HOSTS.some(host => hostname.includes(host)) || ANALYTICS_HOSTS.some(host => hostname.includes(host))) {
     // console.log(`[SW] Network-only for ${hostname}: ${request.url}`);
     event.respondWith(fetch(request)); // Go straight to network
     return; // Stop handling this request
  }

   // 2. Google Fonts (Cache, then Network) - Slightly different for CSS vs Fonts
    if (FONT_HOSTS.includes(hostname)) {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                const cachedResponse = await cache.match(request);
                const networkFetch = fetch(request).then(networkResponse => {
                     // Update cache regardless of OK status for Fonts CSS, but only OK for font files?
                     // Simpler: only cache OK responses, but always fetch for potential update.
                    if (networkResponse && networkResponse.ok) {
                         // Use a small timeout for caching operation so it doesn't block the response
                         // Or just let the promise chain handle it
                         cache.put(request, networkResponse.clone()).catch(err => console.warn(`[SW] Failed to cache font '${request.url}':`, err));
                    } else {
                        console.warn(`[SW] Font fetch returned non-OK status (${networkResponse ? networkResponse.status : 'N/A'}) for ${request.url}.`);
                    }
                    return networkResponse;
                }).catch(error => {
                     console.warn(`[SW] Network fetch failed for font '${request.url}':`, error);
                     throw error; // Re-throw to trigger browser offline handling if no cache fallback
                });

                // Return cached immediately for speed if available, but let the fetch promise
                // run in the background to update the cache for next time.
                return cachedResponse || networkFetch; // If no cache, wait for network

            })
        );
        return; // Stop handling this request
    }


  // 3. Stale While Revalidate for Own Origin Assets:
  // For requests to our own domain, try to serve from cache immediately
  // while fetching the latest in the background.
  if (url.origin === self.location.origin) {
    // console.log(`[SW] Applying Stale While Revalidate for: ${request.url}`);
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Fetch the resource from the network in the background
        const networkFetch = fetch(request).then((networkResponse) => {
          // Check if we should cache this response (e.g., status 200, basic type for same-origin)
          // Add checks to prevent caching ranges or other inappropriate responses if needed
          const shouldCache = networkResponse && networkResponse.ok && networkResponse.type === 'basic'; // 'basic' means same-origin request

          if (shouldCache) {
            // Clone the response so it can be consumed by both the browser and the cache
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
               // console.log(`[SW] Cached new version of ${request.url}`);
            }).catch(err => {
                console.warn(`[SW] Failed to save fetched response for ${request.url} to cache:`, err);
            });
          } else if (networkResponse) {
             // console.log(`[SW] Not caching network response for ${request.url} (Status: ${networkResponse.status}, Type: ${networkResponse.type})`);
          } else {
             console.warn(`[SW] Network response for ${request.url} was null.`);
          }

          return networkResponse; // Return the network response
        }).catch((error) => {
          // This catch handles network errors.
          // If there was a cached response, it was returned already.
          // If there was NO cached response, the first .then() above would
          // not have returned cachedResponse, and we would be here with nothing to serve.
           console.error(`[SW] Network fetch failed for ${request.url}:`, error);
          // For assets that absolutely MUST work offline if in cache (like app shell HTML),
          // you might add an explicit fallback here if `cachedResponse` wasn't available above.
          // Given Stale-While-Revalidate, the cachedResponse is checked *before* the fetch promise is returned,
          // so this fetch catch happens *after* we've decided whether to use the cache or wait for network.
          // If cachedResponse was available, this catch just happens in the background.
          // If cachedResponse was NOT available, this catch means the *initial* response failed, and we should re-throw
          // or provide a specific offline fallback. For a simple SWR, re-throwing is common if the resource wasn't cached initially.
           throw error; // Re-throw to let the browser handle the offline state (shows browser's offline page or retries)
        });

        // Return the cached response if available. If not, return the network fetch promise.
        // The `networkFetch` promise will run even if `cachedResponse` is returned.
        return cachedResponse || networkFetch;

      })
    );
    return; // Stop handling this request
  }

  // 4. Default: Network Only for anything not explicitly handled (e.g., other origins not listed)
  // console.log(`[SW] Defaulting to network for unhandled request: ${request.url}`);
  event.respondWith(fetch(request));
});


// Optional: Add listeners for other events like 'message' for communication with clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log(`[SW v${CACHE_NAME}] Received SKIP_WAITING message. Calling self.skipWaiting().`);
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CLEAR_CACHES') {
    console.log(`[SW v${CACHE_NAME}] Received CLEAR_CACHES message. Clearing all known caches.`);
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(cacheNames.map(cacheName => {
           if (cacheName.startsWith('vishwa-samvidhan-cache-')) { // Be careful not to delete unrelated caches
               console.log(`[SW] Clearing cache '${cacheName}' requested by message.`);
              return caches.delete(cacheName);
           }
            return Promise.resolve(); // Don't block on unrelated caches
        }));
      }).then(() => {
        console.log(`[SW v${CACHE_NAME}] All specified caches cleared via message.`);
        // Optionally, notify clients
        self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage({ type: 'CACHES_CLEARED_ACK', cacheName: CACHE_NAME }));
        });
      }).catch(error => {
           console.error(`[SW v${CACHE_NAME}] Error clearing caches via message:`, error);
      })
    );
  }
   // Add other message types here if needed for specific app interactions
});

console.log(`[SW v${CACHE_NAME}] Service Worker script evaluated.`);