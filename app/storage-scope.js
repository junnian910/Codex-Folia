(() => {
  if (window.__FOLIA_STORAGE_SCOPED__) return;
  window.__FOLIA_STORAGE_SCOPED__ = true;
  // The Codex internal page shares an origin. Keep Folia's web settings in its own namespace.
  const storage = window.localStorage;
  const prefix = 'folia-in-codex:';
  const keys = () => Object.keys(storage).filter(key => key.startsWith(prefix));
  const scoped = {
    get length() { return keys().length; },
    key(index) { return keys()[index]?.slice(prefix.length) ?? null; },
    getItem(key) { return storage.getItem(prefix + String(key)); },
    setItem(key, value) { storage.setItem(prefix + String(key), String(value)); },
    removeItem(key) { storage.removeItem(prefix + String(key)); },
    clear() { for (const key of keys()) storage.removeItem(key); },
  };
  Object.defineProperty(window, 'localStorage', { value: scoped, configurable: true });
  // Folia navigates with hashes; blob documents cannot use its normal pathname prefix.
  if (location.protocol === 'blob:' || location.protocol === 'about:') {
    const base = location.href.split('#')[0];
    for (const method of ['pushState', 'replaceState']) {
      const original = history[method].bind(history);
      history[method] = (state, unused, url) => {
        if (url == null) return original(state, unused);
        const text = String(url);
        const hashIndex = text.indexOf('#');
        return original(state, unused, base + (hashIndex >= 0 ? text.slice(hashIndex) : ''));
      };
    }
  }
})();
