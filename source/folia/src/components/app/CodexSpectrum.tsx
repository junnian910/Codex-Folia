import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import AudioOverlay from '../visualizer/monet/AudioOverlay';
import type { VisualizerSharedProps } from '../visualizer/definition';
import type { VisualizerMode } from '../../types';

// src/components/app/CodexSpectrum.tsx
// Reuse Monet's audio renderer with the same live audio bands for both surfaces.
export default function CodexSpectrum({ model }: { model: VisualizerSharedProps & { mode?: VisualizerMode } }) {
    const host = (parent as Window & { __FOLIA_CODEX__?: { subtitleRoot?: HTMLElement; barRoot?: HTMLElement; barSpectrumRoot?: HTMLElement } }).__FOLIA_CODEX__;
    useEffect(() => {
        if (!host?.barRoot || !host.barSpectrumRoot) return;
        const slot=host.barSpectrumRoot;
        const attach=()=>{const pill=host.barRoot?.querySelector('[data-ponder="player-bar"]');if(pill&&slot.parentElement!==pill){pill.append(slot);slot.style.cssText='position:absolute;bottom:2px;left:65px;right:65px;height:22px;pointer-events:none;opacity:.3;z-index:0'}};
        attach();const observer=new MutationObserver(attach);observer.observe(host.barRoot,{childList:true,subtree:true});
        return()=>observer.disconnect();
    },[host]);
    if (!host) return null;
    const shared = { audioPower: model.audioPower, audioBands: model.audioBands, theme: model.theme, mode: 'bar' as const, staticMode: !!model.staticMode };
    const enabled = ['monet', 'classic', 'cadenza', 'partita', 'claddagh'].includes(model.mode ?? '');
    return <>
        {enabled && host.subtitleRoot && createPortal(
            <div data-codex-screen-spectrum style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: (model.mode === 'monet' ? 88 : 52) * 2 / 3, pointerEvents: 'none', opacity: .8 }}>
                <AudioOverlay {...shared} dense fullWidthResponse={model.mode === 'monet'} />
            </div>, host.subtitleRoot,
        )}
        {host.barSpectrumRoot && createPortal(<AudioOverlay {...shared} />, host.barSpectrumRoot)}
    </>;
}
