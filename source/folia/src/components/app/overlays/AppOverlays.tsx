import React from 'react';
import { createPortal } from 'react-dom';
import FloatingPlayerControls from '../../FloatingPlayerControls';
import SearchWorkspace from '../search/SearchWorkspace';
import DevDebugOverlay from '../../DevDebugOverlay';
import MemoryMonitorWindow from '../../debug/MemoryMonitorWindow';
import NowPlayingToast from './NowPlayingToast';
import type { AppOverlaysModel } from './buildAppOverlaysModel';
import { countRender } from '../../../dev/renderCount';
import { useLatticeControlsStore } from '../../../stores/useLatticeControlsStore';
import { useAppViewStore } from '../../../stores/useAppViewStore';

// Centralized app-level overlay renderer so App.tsx does not mount leaf overlays directly.
type AppOverlaysProps = {
    model: AppOverlaysModel;
    floatingTarget?: HTMLElement | null;
};

const AppOverlays: React.FC<AppOverlaysProps> = ({ model, floatingTarget }) => {
    countRender('AppOverlays');
    const isCurrentSongPosterVisible = useLatticeControlsStore(state => state.isCurrentSongPosterVisible);
    const {
        searchOverlay,
        debugOverlay,
        memoryMonitor,
        floatingControls,
        nowPlayingToast,
    } = model;

    return (
        <>
            {searchOverlay && <SearchWorkspace {...searchOverlay} />}

            {debugOverlay && <DevDebugOverlay {...debugOverlay} />}

            {memoryMonitor && <MemoryMonitorWindow {...memoryMonitor} />}

            {floatingControls
                && (floatingControls.currentView !== 'lattice' || !isCurrentSongPosterVisible)
                && (floatingTarget ? createPortal(<FloatingPlayerControls {...floatingControls} isHidden={false} hideControlBar={false} slotPrimary="loop" slotSecondary="queue" slotContext={{...floatingControls.slotContext,canInvokeCommandById:id=>id==='queue'||floatingControls.slotContext.canInvokeCommandById(id),invokeCommandById:id=>{if(id==='queue'){useAppViewStore.getState().setPanelTab('queue');parent.postMessage({type:'folia-show-panel'},'*')}else floatingControls.slotContext.invokeCommandById(id)}}} forceExpanded onNavigateToPlayer={()=>parent.postMessage({type:'folia-show-panel'},'*')} />, floatingTarget) : <FloatingPlayerControls {...floatingControls} />)}

            {nowPlayingToast && <NowPlayingToast {...nowPlayingToast} />}
        </>
    );
};

export default React.memo(AppOverlays);
