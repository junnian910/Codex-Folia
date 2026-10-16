import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

// src/components/app/CodexVisualizerSurface.tsx
// Retains the original live visualizer and its React context while controls use a separate viewport.
export default function CodexVisualizerSurface({ target, children }: { target: HTMLElement | null; children: ReactNode }) {
    return target ? createPortal(children, target) : children;
}
