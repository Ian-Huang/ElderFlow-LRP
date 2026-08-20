self.addEventListener('sync', (event) => {
  if (event.tag !== 'lrp-sync-now') {
    return;
  }

  event.waitUntil(
    self.clients
      .matchAll({ includeUncontrolled: true, type: 'window' })
      .then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'LRP_BG_SYNC' });
        }
      })
      .catch(() => undefined)
  );
});
