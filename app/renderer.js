(() => {
  // renderer.js: host one Folia runtime without raising its background above the conversation.
  const config=__FOLIA_CONFIG__;
  if(window.__FOLIA_CODEX__)return;
  const origin=config.embedded?location.origin:new URL(config.url).origin;
  let ready=false,panelOpen=false,backgroundVisible=true,fullscreen=false;
  const style=document.createElement('style');style.id='folia-codex-style';style.textContent=__FOLIA_CSS__;document.head.append(style);
  document.documentElement.dataset.foliaCodex='background';
  const objectUrls=[];
  function makeFrame(id,name,html){const f=document.createElement('iframe');f.id=id;f.name=name;const url=URL.createObjectURL(new Blob([html],{type:'text/html'}));objectUrls.push(url);f.src=url;return f}
  const html='<!doctype html><html lang="zh-CN" style="height:100%"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;height:100%;overflow:hidden"><div id="root" style="position:relative;width:100%;height:100%"></div></body></html>';
  const runtimeHtml=html.replace('</body>','<div id="folia-background-root"></div><div id="folia-visual-root"></div></body>');
  const frame=makeFrame('folia-codex-frame','folia-codex-runtime',runtimeHtml);frame.title='Folia 动态背景';frame.allow='autoplay';document.body.prepend(frame);
  const subtitleFrame=makeFrame('folia-subtitle-frame','folia-subtitle-components',html.replace('</head>','<style>html,body{background:transparent!important}#root{height:100%;pointer-events:none}</style></head>'));subtitleFrame.title='Folia 字幕与和声';document.body.append(subtitleFrame);
  const widgets=(__FOLIA_WIDGETS__)({makeFrame,html,onClose:()=>setMode('background')});
  const lyricLayout=(__FOLIA_LYRIC_LAYOUT__)({frame});
  const back=document.createElement('button');back.id='folia-return-chat';back.type='button';back.textContent='返回聊天';back.hidden=true;back.onclick=()=>frame.contentWindow.postMessage({type:'folia-codex-action',action:'exit-fullscreen'},origin);document.body.append(back);
  function setFullscreen(value){fullscreen=!!value;document.documentElement.toggleAttribute('data-folia-player',fullscreen);for(const f of [frame,subtitleFrame])f.contentDocument.documentElement.toggleAttribute('data-folia-full-player',fullscreen);back.hidden=!fullscreen;widgets.fullscreen?.(fullscreen)}
  function setMode(mode){panelOpen=mode==='player';widgets.setOverlay(panelOpen,'曲库');if(ready)frame.contentWindow.postMessage({type:'folia-codex-action',action:panelOpen?'browse':'close'},origin)}
  function setBackgroundVisible(value){backgroundVisible=Boolean(value);for(const id of ['folia-background-root','folia-visual-root']){const el=frame.contentDocument.querySelector('#'+id);if(el)el.style.visibility=backgroundVisible?'visible':'hidden'}}
  function palette(theme){
    for(const [key,color] of Object.entries({base:theme.backgroundColor,ink:theme.primaryColor,muted:theme.secondaryColor,accent:theme.accentColor})){if(typeof color==='string'&&CSS.supports('color',color))document.documentElement.style.setProperty('--folia-'+key,color)}
  }
  function receive(event){if(event.source!==frame.contentWindow||event.origin!==origin)return;const data=event.data;
    if(data?.type==='folia-codex-ready'){ready=true;widgets.syncLayout();lyricLayout.apply(true);restorePlayback()}
    if(data?.type==='folia-codex-overlay'){panelOpen=data.open;widgets.setOverlay(panelOpen,data.label)}
    if(data?.type==='folia-widget-size')widgets.size(data.name,data.height);
    if(data?.type==='folia-codex-theme')palette(data.theme);
    if(data?.type==='folia-codex-track')widgets.track(data);
    if(data?.type==='folia-show-panel')widgets.showPanel();
    if(data?.type==='folia-collapse-panel')widgets.collapsePanel();
    if(data?.type==='folia-layout-edit')lyricLayout.setEditing(true);
    if(data?.type==='folia-codex-fullscreen')setFullscreen(data.open);
    if(data?.type==='folia-playback-restored')delete window.__FOLIA_CODEX_RESUME__;
  }
  function restorePlayback(){const saved=window.__FOLIA_CODEX_RESUME__;if(!saved)return;const deadline=Date.now()+60000;const attempt=()=>{if(!window.__FOLIA_CODEX_RESUME__)return;frame.contentWindow.postMessage({type:'folia-codex-action',action:'restore-playback',saved},origin);if(Date.now()<deadline)setTimeout(attempt,250)};attempt()}
  function destroy(){window.__FOLIA_CODEX_DISABLED__=true;widgets.destroy();lyricLayout.destroy();back.remove();subtitleFrame.remove();document.documentElement.removeAttribute('data-folia-player');frame.remove();style.remove();objectUrls.forEach(url=>URL.revokeObjectURL(url));window.removeEventListener('message',receive);delete document.documentElement.dataset.foliaCodex;for(const key of ['base','ink','muted','accent'])document.documentElement.style.removeProperty('--folia-'+key);delete window.__FOLIA_CODEX__}
  window.addEventListener('message',receive);
  window.__FOLIA_CODEX__={version:15,frame,visual:frame,widgets,lyricLayout,setMode,setBackgroundVisible,destroy,get ready(){return ready},get fullscreen(){return fullscreen},get mode(){return panelOpen?'player':'background'},get backgroundVisible(){return backgroundVisible},get visualRoot(){return frame.contentDocument?.querySelector('#folia-visual-root')},get backgroundRoot(){return frame.contentDocument?.querySelector('#folia-background-root')},get subtitleRoot(){return subtitleFrame.contentDocument?.querySelector('#root')},get panelRoot(){return widgets.panelRoot},get barSpectrumRoot(){return widgets.barFrame.contentDocument?.querySelector('#folia-bar-spectrum')},get barRoot(){return widgets.barRoot},get overlayRoot(){return widgets.overlayRoot}};
})();
