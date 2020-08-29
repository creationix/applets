
// Simple worker that caches all requests to use as fallback when offline.
self.addEventListener('fetch', event => {
  event.respondWith((async (request) => {
    const cache = await caches.open('site')
    return fetch(request).then(async response => {
      const clone = response.clone()
      await cache.put(request, response)
      return clone
    }).catch(async err => {
      const match = await cache.match(request)
      if (match) {
        return match
      }
      throw err
    })
  })(event.request))
})
