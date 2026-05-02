# Browser localStorage notes

- Storage limit: typically 5 MB per origin (scheme+host+port).
- Data is stored as strings; use JSON.stringify/parse for objects.
- Persistent across browser sessions and tab reloads.
- Not sent to server with HTTP requests (unlike cookies).
- Accessible via window.localStorage API.
- Private/incognito mode may have separate storage.
- Clearing site data or browser data removes localStorage.
- Synchronous API; can block UI if large amounts of data.
- Alternative: IndexedDB for larger/storage needs.