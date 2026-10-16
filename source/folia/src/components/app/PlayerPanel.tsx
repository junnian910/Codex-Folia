import React from 'react';
import { createPortal } from 'react-dom';
import UnifiedPanel from '../UnifiedPanel';
import type { PlayerPanelViewModel } from './player-panel/buildPlayerPanelModel';
import { countRender } from '../../dev/renderCount';

// App-level entry for the player side panel backed by a view model.
type PlayerPanelProps = {
    model: PlayerPanelViewModel;
    portalTarget?: HTMLElement | null;
};

const PlayerPanel: React.FC<PlayerPanelProps> = ({ model, portalTarget }) => {
    countRender('PlayerPanel');
    return portalTarget ? createPortal(<UnifiedPanel {...model.panelProps} playback={{...model.panelProps.playback,isOpen:true,hideToggleButton:true,showOpenPanelCloseButton:false}} />,portalTarget) : <UnifiedPanel {...model.panelProps} />;
};

// Memoised: see the note in Home.tsx. `playerPanelModel` is the only prop, so this holds exactly
// as long as that memo does.
export default React.memo(PlayerPanel);
