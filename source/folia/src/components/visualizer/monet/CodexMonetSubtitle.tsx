import { useContext, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CodexSubtitlePortalContext } from '../CodexSubtitleLayer';

// src/components/visualizer/monet/CodexMonetSubtitle.tsx
// Keep Monet's original inline subtitle position while allowing independent foreground movement.
export default function CodexMonetSubtitle({ height, children }: { height: number; children: ReactNode }) {
    const enabled = useContext(CodexSubtitlePortalContext);
    const anchor = useRef<HTMLDivElement>(null);
    const overlay = useRef<HTMLDivElement>(null);
    const root = enabled && window.name === 'folia-codex-runtime'
        ? (parent as Window & { __FOLIA_CODEX__?: { subtitleRoot?: HTMLElement } }).__FOLIA_CODEX__?.subtitleRoot
        : null;

    useEffect(() => {
        if (!root) return;
        let frame = 0;
        let previous='';
        // Only the active line has subtitle tracks. Follow its existing spring without React updates.
        const follow = () => {
            const source = anchor.current, target = overlay.current;
            if (source && target) {
                const rect = source.getBoundingClientRect();
                const width=source.offsetWidth;
                const tone = getComputedStyle(source.parentElement!);
                const signature=[rect.left,rect.top,rect.width,rect.height,width,tone.opacity,tone.filter].join('|');
                if(signature!==previous){
                previous=signature;
                target.style.left = `${rect.left}px`;
                target.style.top = `${rect.top}px`;
                target.style.width = `${width}px`;
                target.style.setProperty('--monet-subtitle-anchor-scale', String(width ? rect.width / width : 1));
                target.style.opacity = tone.opacity;
                target.style.filter = tone.filter;
                target.style.visibility = rect.width && rect.height ? 'visible' : 'hidden';
                }
            }
            frame = requestAnimationFrame(follow);
        };
        follow();
        return () => cancelAnimationFrame(frame);
    }, [root]);

    if (!root) return children;
    return <>
        <div ref={anchor} aria-hidden="true" style={{ height, pointerEvents: 'none' }} />
        {createPortal(<div ref={overlay} data-codex-subtitle-layer="subtitle" data-codex-monet-subtitle
            style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', transformOrigin: 'left top',
                transform: 'translate(var(--codex-monet-subtitle-x, 0px), var(--codex-monet-subtitle-y, 0px)) scale(var(--monet-subtitle-anchor-scale, 1)) scale(var(--codex-monet-subtitle-scale, 1))' }}>
            <div>{children}</div>
        </div>, root)}
    </>;
}
