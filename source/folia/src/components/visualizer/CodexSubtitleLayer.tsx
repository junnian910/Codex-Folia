import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// src/components/visualizer/CodexSubtitleLayer.tsx
// Keep the original subtitle renderers above Codex while sharing their timing and settings.
export const CodexSubtitlePortalContext = createContext(false);
export default function CodexSubtitleLayer({ kind, children }: { kind: 'subtitle' | 'harmony'; children: ReactNode }) {
    const enabled = useContext(CodexSubtitlePortalContext);
    const root = enabled && window.name === 'folia-codex-runtime'
        ? (parent as Window & { __FOLIA_CODEX__?: { subtitleRoot?: HTMLElement } }).__FOLIA_CODEX__?.subtitleRoot
        : null;
    if (!root) return children;
    return createPortal(
        <div data-codex-subtitle-layer={kind} style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            transform: `translate(var(--codex-${kind}-x, 0px), var(--codex-${kind}-y, 0px)) scale(var(--codex-${kind}-scale, 1))`,
            transformOrigin: kind === 'subtitle' ? 'center bottom' : 'center top',
        }}>{children}</div>, root,
    );
}
