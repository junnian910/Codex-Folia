// src/utils/codexEmbed.ts
// Keep the original app's dialogs in the interactive window, separate from its visual stage.
const lyricOffset={x:0,y:0};
export function setCodexLyricOffset(x:number,y:number){lyricOffset.x=x;lyricOffset.y=y;}
export function readCodexLyricOffset(){return lyricOffset;}
export function getAppPortalBody(): HTMLElement {
    if (window.name === 'folia-codex-runtime' && parent !== window) {
        const host = (parent as Window & { __FOLIA_CODEX__?: { overlayRoot?: HTMLElement } }).__FOLIA_CODEX__;
        if (host?.overlayRoot) return host.overlayRoot.ownerDocument.body;
    }
    return document.body;
}
