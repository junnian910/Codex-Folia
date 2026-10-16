import React from 'react';
import VisualizerBackgroundRenderer from '../visualizer/backgrounds/VisualizerBackgroundRenderer';
import type { VisualizerSharedProps } from '../visualizer/definition';
import { getSizedCoverUrl } from '../../utils/coverUrl';
import CodexSpectrum from './CodexSpectrum';

// src/components/app/CodexBackground.tsx
// A permanent background stays full size while the lyric stage is moved or resized.
export default function CodexBackground({ model }: { model: VisualizerSharedProps }) {
    return <div style={{ position: 'absolute', inset: 0, background: model.theme.backgroundColor }}>
        <VisualizerBackgroundRenderer config={model.background} theme={model.theme}
            isDaylight={model.isDaylight ?? false} coverUrl={getSizedCoverUrl(model.coverUrl,1024)}
            audioPower={model.audioPower} audioBands={model.audioBands} seed={model.seed}
            staticMode={!!(model.backgroundStaticMode || model.staticMode)} paused={!!model.paused} />
        <CodexSpectrum model={model} />
    </div>;
}
