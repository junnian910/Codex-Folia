import type { VisualizerSharedProps } from './definition';
import { useVisualizerRuntime } from './runtime';
import { resolveSubtitleFontSizes } from './subtitleFontSizes';
import VisualizerSubtitleOverlay from './VisualizerSubtitleOverlay';

// src/components/visualizer/CodexInlineSubtitle.tsx
// Inline-only modes need a readable foreground translation while Codex occupies the center.
export default function CodexInlineSubtitle(props: VisualizerSharedProps) {
    const { activeLine, recentCompletedLine, nextLines } = useVisualizerRuntime(props);
    return <VisualizerSubtitleOverlay {...props} showText={props.showText ?? true}
        activeLine={activeLine} recentCompletedLine={recentCompletedLine} nextLines={nextLines}
        {...resolveSubtitleFontSizes(props.lyricsFontScale)} embeddedInline />;
}
