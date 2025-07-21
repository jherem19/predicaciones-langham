const CACHE_NAME = 'sermon-assistant-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './index.tsx',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://esm.sh/react@^19.1.0',
  'https://esm.sh/react-dom@^19.1.0/'
];

// Instala el Service Worker y cachea los archivos de la aplicación
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercepta las peticiones y sirve desde la caché si es posible
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si hay una respuesta en la caché, la devuelve
        if (response) {
          return response;
        }
        // Si no, hace la petición a la red
        return fetch(event.request);
      })
  );
});

// Elimina cachés antiguas cuando el Service Worker se activa
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
