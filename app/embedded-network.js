(() => {
  const original = window.fetch.bind(window);
  const pending = new Map();
  let next = 0;
  globalThis.__foliaResolveRpc = (id, reply) => {
    const item = pending.get(id);
    if (!item) return;
    pending.delete(id); clearTimeout(item.timer);
    if (reply.error) { item.reject(new TypeError(reply.error)); return; }
    const bytes = Uint8Array.fromBase64(reply.body);
    item.resolve(new Response([204,205,304].includes(reply.status) ? null : bytes, { status: reply.status, headers: reply.headers }));
  };
  window.fetch = async (input, init = {}) => {
    const value = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!value.startsWith('/folia/') && !value.startsWith('/api/') && !/^https?:\/\//i.test(value)) return original(input, init);
    const id = ++next;
    const method = init.method || (input instanceof Request ? input.method : 'GET');
    const headers = Object.fromEntries(new Headers(init.headers || (input instanceof Request ? input.headers : undefined)));
    let body = init.body ?? (input instanceof Request && !['GET','HEAD'].includes(method) ? await input.clone().text() : undefined);
    if (body !== undefined && typeof body !== 'string' && !(body instanceof URLSearchParams)) throw new TypeError('此接口需要文本请求体。');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new TypeError('Folia 请求超时。')); }, value.includes('generate-theme') ? 130000 : 40000);
      pending.set(id, { resolve, reject, timer });
      globalThis.__foliaRpc(JSON.stringify({ id, url: value, method, headers, body: body === undefined ? undefined : String(body) }));
    });
  };
})();
