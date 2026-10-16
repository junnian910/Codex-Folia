// src/services/codexAudioCache.ts
// Embedded audio uses the component's E-drive cache without impersonating Electron.
export const usesCodexAudioCache = () => typeof window !== 'undefined' && window.name === 'folia-codex-runtime';
const endpoint = '/api/audio-cache';
export async function downloadCodexAudio(key: string, url: string, limitBytes: number, force=false): Promise<void> {
    const response=await fetch(`${endpoint}/download`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,url,limitBytes,force})});
    if(!response.ok)throw new Error('后台缓存歌曲失败');
}
export async function readCodexAudio(key: string): Promise<Blob | null> {
    const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('读取歌曲缓存失败');
    return response.blob();
}
export async function hasCodexAudio(key: string): Promise<boolean> {
    return (await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, { method: 'HEAD' })).ok;
}
export async function saveCodexAudio(key: string, blob: Blob, limitBytes: number): Promise<void> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const chunks: string[] = [];
    for (let i = 0; i < bytes.length; i += 16384) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 16384)));
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, mime: blob.type || 'audio/mpeg', limitBytes, data: btoa(chunks.join('')) }) });
    if (!response.ok) throw new Error('写入歌曲缓存失败');
}
export async function getCodexAudioCacheStats(): Promise<{ size: number; count: number; directory: string }> {
    const response = await fetch(`${endpoint}/stats`);
    if (!response.ok) throw new Error('读取缓存统计失败');
    return response.json();
}
export async function clearCodexAudioCache(): Promise<void> {
    const response = await fetch(endpoint, { method: 'DELETE' });
    if (!response.ok) throw new Error('清理歌曲缓存失败');
}
