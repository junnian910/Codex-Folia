import { LayoutTemplate, Minus } from 'lucide-react';

// src/components/panelTab/CodexPanelActions.tsx
// Embedded-only actions stay in the native panel footer.
export default function CodexPanelActions({ isDaylight }: { isDaylight: boolean }) {
    if (window.name !== 'folia-codex-runtime') return null;
    const buttonClass = `flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${isDaylight ? 'hover:bg-black/10' : 'hover:bg-white/10'}`;
    return (
        <div data-codex-panel-actions className="ml-auto flex shrink-0 items-center gap-1">
            <button type="button" className={buttonClass} title="桌面布局" aria-label="桌面布局"
                onClick={() => parent.postMessage({ type: 'folia-layout-edit' }, '*')}>
                <LayoutTemplate size={15} />
            </button>
            <button type="button" className={buttonClass} title="收起播放器" aria-label="收起播放器"
                onClick={() => parent.postMessage({ type: 'folia-collapse-panel' }, '*')}>
                <Minus size={15} />
            </button>
        </div>
    );
}
