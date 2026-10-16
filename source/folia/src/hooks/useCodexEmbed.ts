import { useEffect, useRef, useState } from 'react';
import type { Theme } from '../types';
import { useAppViewStore } from '../stores/useAppViewStore';
import { useSettingsModalStore } from '../stores/useSettingsModalStore';
import { useSearchNavigationStore } from '../stores/useSearchNavigationStore';
import { useThemeQuickEditorStore } from '../stores/useThemeQuickEditorStore';
import { useAudioSettingsStore } from '../stores/useAudioSettingsStore';
import { useAddToPlaylistStore } from '../stores/useAddToPlaylistStore';
import { useThemeSettingsStore } from '../stores/useThemeSettingsStore';
import { selectDisplaySong, selectDisplayCoverUrl, usePlaybackStore } from '../stores/usePlaybackStore';
import { getSongArtistLabel } from '../services/onlineMusic/songMetadata';
import { setCodexLyricOffset } from '../utils/codexEmbed';
import { usePlayerChromeSettingsStore } from '../stores/usePlayerChromeSettingsStore';
import { adjustLightnessForContrast } from '../utils/themeColorMath';
import '../components/app/codexEmbed.css';
import { PlayerState } from '../types';
import { currentTime, lyricCurrentTime } from '../stores/motionSignals';
import { useLyricSettingsStore } from '../stores/useLyricSettingsStore';
import { findLatestActiveLineIndex } from '../utils/appPlaybackHelpers';

// src/hooks/useCodexEmbed.ts
// One runtime owns audio and animation. Original application UI lives in an independent window.
type EmbedHost = { visualRoot: HTMLElement; backgroundRoot: HTMLElement; subtitleRoot: HTMLElement; panelRoot: HTMLElement; barRoot: HTMLElement; overlayRoot: HTMLElement };
export function useCodexEmbed(theme: Theme, navigation: { navigateToPlayer: () => void; navigateToHome: () => void }) {
    const [fontScale,setFontScale]=useState(1);
    const [host] = useState<EmbedHost | null>(() => window.name === 'folia-codex-runtime' && parent !== window
        ? (parent as Window & { __FOLIA_CODEX__?: EmbedHost }).__FOLIA_CODEX__ ?? null : null);
    const actions = useRef(navigation); actions.current = navigation;
    const latestTheme = useRef(theme); latestTheme.current = theme;
    const isDaylight = useThemeSettingsStore(state=>state.isDaylight);
    const song = usePlaybackStore(selectDisplaySong), cover = usePlaybackStore(selectDisplayCoverUrl);
    useEffect(() => {
        if (!host?.visualRoot || !host.overlayRoot) return;
        if(localStorage.getItem('folia_codex_cache_limit_v14')!=='15'){
            useAudioSettingsStore.getState().handleSetMediaCacheLimitGb(15);localStorage.setItem('folia_codex_cache_limit_v14','15');
        }
        if(localStorage.getItem('folia_codex_cache_disabled_v14')!=='true'){
            useAudioSettingsStore.getState().handleToggleMediaCache(false);localStorage.setItem('folia_codex_cache_disabled_v14','true');
        }
        const roots = [host.visualRoot,host.backgroundRoot,host.subtitleRoot,host.panelRoot,host.barRoot,host.overlayRoot];
        const documents = [...new Set(roots.map(root=>root.ownerDocument))].filter(doc=>doc!==document);
        for(const doc of [document,...documents])doc.documentElement.dataset.foliaEmbed='true';
        const copies = new Map<HTMLStyleElement, HTMLStyleElement[]>();
        const localStyle = document.createElement('style');
        const syncStyles = () => {
            document.head.querySelectorAll('style').forEach(source=>{
                if(source===localStyle)return;
                let list=copies.get(source);
                if(!list){list=documents.map(doc=>{const copy=source.cloneNode(true) as HTMLStyleElement;doc.head.append(copy);return copy});copies.set(source,list)}
                else list.forEach(copy=>{if(copy.textContent!==source.textContent)copy.textContent=source.textContent});
            });
            copies.forEach((list,source)=>{if(!source.isConnected){list.forEach(copy=>copy.remove());copies.delete(source)}});
        };
        syncStyles();const styleObserver=new MutationObserver(syncStyles);styleObserver.observe(document.head,{childList:true,characterData:true,subtree:true});
        const shell=host.overlayRoot.firstElementChild as HTMLElement | null;
        const syncVariables=()=>{if(!shell)return;for(const prop of Array.from(shell.style)){if(!prop.startsWith('--'))continue;for(const root of roots)root.style.setProperty(prop,shell.style.getPropertyValue(prop));for(const doc of documents)doc.documentElement.style.setProperty(prop,shell.style.getPropertyValue(prop))}const current=latestTheme.current;for(const doc of documents)doc.documentElement.style.setProperty('--codex-control-ink',adjustLightnessForContrast(current.primaryColor,current.backgroundColor,7))};
        syncVariables();const themeObserver=new MutationObserver(syncVariables);if(shell)themeObserver.observe(shell,{attributes:true,attributeFilter:['style']});
        const sizeObserver=new ResizeObserver(()=>parent.postMessage({type:'folia-widget-size',name:'panel',height:host.panelRoot.scrollHeight},'*'));sizeObserver.observe(host.panelRoot);
        localStyle.textContent='html,body{background:transparent!important}#root{visibility:hidden!important}#folia-background-root{position:fixed;inset:0;z-index:0}#folia-visual-root{position:fixed;inset:0;z-index:1;overflow:hidden}';document.head.append(localStyle);
        localStyle.textContent+='[data-codex-visualizer="lumiere"] [data-codex-lyrics],[data-codex-visualizer="sonnet"] [data-codex-lyrics]{transform:none!important}';
        let previous='';
        const publishOverlay=()=>{
            const modal=useSettingsModalStore.getState(),audio=useAudioSettingsStore.getState();
            const label=audio.isAudioEqualizerOpen?'音效':modal.settingsModalState.isOpen||modal.isSubSettingsViewOpen?'设置':useThemeQuickEditorStore.getState().isOpen?'主题编辑':useAddToPlaylistStore.getState().isOpen?'添加到歌单':useSearchNavigationStore.getState().isSearchOpen?'在线搜索':useAppViewStore.getState().view!=='player'?'曲库':'';
            if(label!==previous){previous=label;parent.postMessage({type:'folia-codex-overlay',open:!!label,label},'*')}
        };
        const unsubscribes=[useSettingsModalStore.subscribe(publishOverlay),useAudioSettingsStore.subscribe(publishOverlay),useAddToPlaylistStore.subscribe(publishOverlay),useSearchNavigationStore.subscribe(publishOverlay),useAppViewStore.subscribe(publishOverlay),useThemeQuickEditorStore.subscribe(publishOverlay)];
        const publishFullscreen=()=>parent.postMessage({type:'folia-codex-fullscreen',open:usePlayerChromeSettingsStore.getState().transparentPlayerBackground},'*');
        unsubscribes.push(usePlayerChromeSettingsStore.subscribe(publishFullscreen));publishFullscreen();
        const receive=(event:MessageEvent)=>{
            if(event.source!==parent)return;
            if(event.data?.type==='folia-lyric-position'){setCodexLyricOffset(event.data.x,event.data.y);window.dispatchEvent(new Event('folia-lyric-layout'));}
            if(event.data?.type==='folia-lyric-font-scale')setFontScale(current=>current===event.data.scale?current:Math.max(.3,Math.min(1.6,Number(event.data.scale)||1)));
            if(event.data?.type==='folia-codex-action'){
                if(event.data.action==='restore-playback'){
                    const state=usePlaybackStore.getState(),saved=event.data.saved;
                    const audio=[...document.querySelectorAll('audio')].find(el=>el.getAttribute('src')===state.audioSrc&&el.readyState>=1&&el.duration>0);
                    if(!audio||!Number.isFinite(saved?.time))return;
                    const time=Math.max(0,Math.min(saved.time,audio.duration-.25));
                    audio.currentTime=time;audio.volume=saved.volume;
                    currentTime.set(time);
                    const lyricTime=time-(state.lyricTimelineOffsetMs+useLyricSettingsStore.getState().globalLyricTimelineOffsetMs)/1000;
                    lyricCurrentTime.set(lyricTime);state.setCurrentLineIndex(state.lyrics?findLatestActiveLineIndex(state.lyrics.lines,lyricTime):-1);
                    if(saved.playing)void audio.play().catch(()=>{});else{audio.pause();state.setPlayerState(PlayerState.PAUSED)}
                    parent.postMessage({type:'folia-playback-restored'},'*');
                }
                if(event.data.action==='browse')actions.current.navigateToHome();
                if(event.data.action==='settings')useSettingsModalStore.getState().openSettings('options');
                if(event.data.action==='exit-fullscreen')usePlayerChromeSettingsStore.getState().handleToggleTransparentPlayerBackground(false);
                if(event.data.action==='close'){
                    useThemeQuickEditorStore.getState().closeEditor();useSettingsModalStore.getState().closeSettings();useSettingsModalStore.getState().setIsSubSettingsViewOpen(false);useAudioSettingsStore.getState().closeAudioEqualizer();useAddToPlaylistStore.getState().close();useSearchNavigationStore.getState().hideSearchOverlay();actions.current.navigateToPlayer();
                }
            }
        };
        const overlayWindow=host.overlayRoot.ownerDocument.defaultView!;
        const forwardEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));};
        overlayWindow.addEventListener('keydown',forwardEscape);
        window.addEventListener('message',receive);actions.current.navigateToPlayer();useAppViewStore.getState().setPanelTab('controls');
        parent.postMessage({type:'folia-codex-ready'},'*');
        return()=>{styleObserver.disconnect();themeObserver.disconnect();sizeObserver.disconnect();unsubscribes.forEach(fn=>fn());copies.forEach(list=>list.forEach(copy=>copy.remove()));localStyle.remove();window.removeEventListener('message',receive);overlayWindow.removeEventListener('keydown',forwardEscape)};
    },[host]);
    useEffect(()=>{if(!host)return;const uiTheme={...theme,primaryColor:adjustLightnessForContrast(theme.primaryColor,theme.backgroundColor,7),secondaryColor:adjustLightnessForContrast(theme.secondaryColor,theme.backgroundColor,4.5),accentColor:adjustLightnessForContrast(theme.accentColor,theme.backgroundColor,3)};for(const root of [host.panelRoot,host.barRoot,host.overlayRoot])root.ownerDocument.documentElement.style.setProperty('--codex-control-ink',uiTheme.primaryColor);parent.postMessage({type:'folia-codex-theme',theme:uiTheme,isDaylight},'*')},[host,theme,isDaylight]);
    useEffect(()=>{if(host)parent.postMessage({type:'folia-codex-track',title:song?.name||'尚未播放',artist:getSongArtistLabel(song),cover},'*')},[host,song,cover]);
    return {enabled:!!host,fontScale,visualRoot:host?.visualRoot??null,backgroundRoot:host?.backgroundRoot??null,panelRoot:host?.panelRoot??null,barRoot:host?.barRoot??null,overlayRoot:host?.overlayRoot??null};
}
