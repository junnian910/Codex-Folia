(options) => {
  // widgets.js: original controls and application pages share one runtime, with independent windows.
  const {makeFrame,html,onClose}=options;
  const create=(tag,id,parent=document.body)=>{const el=document.createElement(tag);el.id=id;parent.append(el);return el};
  const panel=create('section','folia-panel-widget');panel.className='folia-widget';
  const content=create('div','folia-panel-content',panel);
  const panelFrame=makeFrame('folia-panel-frame','folia-panel-components',html);content.append(panelFrame);
  const mini=create('button','folia-song-card',panel);mini.type='button';mini.setAttribute('aria-label','展开当前歌曲控制面板');
  const cover=create('img','folia-mini-cover',mini);cover.alt='';
  const meta=create('span','folia-mini-meta',mini),title=create('strong','folia-mini-title',meta),artist=create('small','folia-mini-artist',meta);title.textContent='尚未播放';artist.textContent='点击打开播放器';
  const bar=create('section','folia-bar-widget');bar.className='folia-widget';
  const barFrame=makeFrame('folia-bar-frame','folia-bar-components',html.replace('</body>','<div id="folia-bar-spectrum" style="position:absolute;bottom:0;left:20px;right:20px;height:14px;pointer-events:none;z-index:3"></div></body>'));bar.append(barFrame);
  const app=create('section','folia-app-window');app.className='folia-widget';app.hidden=true;app.setAttribute('aria-label','Folia 功能窗口');
  const header=create('header','folia-app-header',app),caption=create('span','folia-app-caption',header);caption.textContent='Folia · 曲库';
  const close=create('button','folia-app-close',header);close.type='button';close.textContent='×';close.setAttribute('aria-label','关闭 Folia 功能窗口');close.onclick=onClose;
  const overlayFrame=makeFrame('folia-overlay-frame','folia-app-components',html);app.append(overlayFrame);
  let panelHidden=localStorage.getItem('folia-panel-collapsed')==='true',panelHeight=680,pinned=true,fullPlayer=false,anchor,editorObserver,barObserver;
  const positions={};for(const name of ['panel','bar','window']){try{positions[name]=JSON.parse(localStorage.getItem('folia-widget-'+name)||'null')}catch{}}
  pinned=!positions.bar;
  let monetPosition;try{monetPosition=JSON.parse(localStorage.getItem('folia-monet-fixed-layout-v1')||'null')}catch{}
  function applyPanel(){
    content.hidden=panelHidden;mini.hidden=!panelHidden;
    panel.style.width=panelHidden?'280px':'344px';
    const height=Math.min(panelHeight,Math.max(180,innerHeight-96));
    panelFrame.style.height=height+'px';content.style.height=height+'px';
    clamp(panel,positions.panel);
  }
  function setPanelHidden(value){panelHidden=value;localStorage.setItem('folia-panel-collapsed',String(value));applyPanel()}
  mini.onclick=()=>setPanelHidden(false);
  function put(el,key,value){if(el.style[key]!==value)el.style[key]=value}
  function clamp(el,p){if(!p)return;const r=el.getBoundingClientRect(),free=el===app;put(el,'left',Math.max(free?48-r.width:8,Math.min(p.x,innerWidth-(free?48:r.width+8)))+'px');put(el,'top',Math.max(free?48-r.height:40,Math.min(p.y,innerHeight-(free?48:r.height+8)))+'px');put(el,'right','auto');put(el,'bottom','auto')}
  const directDrag=(__FOLIA_DRAG__),dragCleanups=[];
  function canDragWindow(event){const body=event.target.closest?.('[data-codex-dialog]>div,[data-ponder-page-scope="settings-page"]>div,[data-ponder-page-scope="help-page"]>div');if(!body)return false;const r=body.getBoundingClientRect();return event.clientY>=r.top&&event.clientY<=r.top+32}
  function draggable(element,surface,name,frame){dragCleanups.push(directDrag({element,surface,frame,captureOnDown:name==='window',canStart:event=>name!=='window'||!frame||(app.dataset.kind!=='page'&&canDragWindow(event)),onMove(p){if(name==='bar')pinned=false;positions[name]=p;clamp(element,p);if(name==='panel')refresh()},onEnd(){const r=element.getBoundingClientRect();positions[name]={x:r.x,y:r.y};localStorage.setItem('folia-widget-'+name,JSON.stringify(positions[name]))}}))}
  draggable(app,header,'window');draggable(panel,mini,'panel');
  for(const [f,element,name] of [[panelFrame,panel,'panel'],[barFrame,bar,'bar'],[overlayFrame,app,'window']])f.addEventListener('load',()=>draggable(element,f.contentDocument.documentElement,name,f));
  const install=(f,css)=>f.addEventListener('load',()=>{const st=f.contentDocument.createElement('style');st.textContent=css;f.contentDocument.head.append(st)});
  for(const f of [panelFrame,barFrame,overlayFrame])install(f,'#root,#root>div{--text-primary:var(--codex-control-ink,#eee)!important}button[style*="color:"]:not([data-codex-play-toggle]):not(:disabled){color:var(--codex-control-ink,#eee)!important}button[class*="opacity-"]:not(:disabled){opacity:.85}button svg{color:inherit}');
  install(panelFrame,'html,body{margin:0!important;background:transparent!important;overflow:auto!important}#root{height:auto!important;width:100%!important}#root>div{position:relative!important;inset:auto!important;transform:none!important;translate:none!important;width:100%!important;gap:0!important;align-items:stretch!important}#root>div>div{padding:0 8px!important;width:100%!important;box-sizing:border-box}[data-testid="unified-panel-surface"]{max-height:none!important;width:100%!important;margin:0!important;box-shadow:none!important;cursor:grab}[data-ponder-panel-artwork]{cursor:grab!important}img{-webkit-user-drag:none}html[data-folia-dragging] *{cursor:grabbing!important;user-select:none!important}');
  install(barFrame,'html,body{margin:0!important;background:transparent!important;overflow:hidden!important}#root{height:auto!important;width:100%!important}#root>div{position:relative!important;inset:auto!important;transform:none!important;translate:none!important;max-width:none!important;width:100%!important;padding:6px 10px!important;box-sizing:border-box}');
  install(overlayFrame,'html,body{margin:0!important;background:transparent!important;height:100%;overflow:hidden}[data-codex-window-drag]{cursor:grab;touch-action:none;user-select:none}html[data-folia-dragging] *{cursor:grabbing!important;user-select:none!important}[data-codex-dialog]{padding:0!important;background:transparent!important;backdrop-filter:none!important}[data-codex-dialog]>div{width:100%!important;max-width:none!important;max-height:100%!important;overflow-y:auto!important;box-shadow:none!important}html[data-folia-window="dialog"] #root>div{background:transparent!important}html[data-folia-window="dialog"] [data-library-stage],html[data-folia-window="dialog"] [data-library-home]{visibility:hidden!important}html[data-folia-window="settings"] #root>div{background:transparent!important}html[data-folia-window="settings"] [data-ponder-page-scope="settings-page"],html[data-folia-window="settings"] [data-ponder-page-scope="help-page"]{padding:0!important;background:transparent!important}html[data-folia-window="settings"] [data-ponder-page-scope="settings-page"]>div,html[data-folia-window="settings"] [data-ponder-page-scope="help-page"]>div{width:100%!important;max-width:none!important;height:100%!important;max-height:none!important;margin:0!important;box-shadow:none!important}');
  overlayFrame.addEventListener('load',()=>{
    const d=overlayFrame.contentDocument;
    const mark=()=>{for(const body of d.querySelectorAll('[data-codex-dialog]>div,[data-ponder-page-scope="settings-page"]>div,[data-ponder-page-scope="help-page"]>div')){if(body.querySelector(':scope>[data-codex-window-drag]'))continue;const strip=d.createElement('div');strip.dataset.codexWindowDrag='true';strip.title='拖动窗口';strip.style.cssText='position:absolute;left:0;right:0;top:0;height:30px;z-index:5;cursor:grab;touch-action:none;pointer-events:none';body.append(strip)}};
    const mo=new MutationObserver(mark);mo.observe(d.body,{childList:true,subtree:true});mark();dragCleanups.push(()=>mo.disconnect());
  });
  barFrame.addEventListener('load',()=>{barObserver=new ResizeObserver(()=>{const child=barFrame.contentDocument.querySelector('#root>div');if(!child)return;const height=Math.max(88,Math.ceil(child.getBoundingClientRect().height)+2);if(barFrame.style.height!==height+'px'){barFrame.style.height=height+'px';refresh()}});barObserver.observe(barFrame.contentDocument.querySelector('#root'))});
  function anchorBar(){
    if(fullPlayer){bar.hidden=false;put(bar,'width',Math.min(720,innerWidth-40)+'px');put(bar,'left',Math.max(20,(innerWidth-bar.offsetWidth)/2)+'px');put(bar,'top',innerHeight-bar.offsetHeight-24+'px');return}
    // Sending temporarily makes the editor read-only; that must not change the visualizer layout.
    const editor=[...document.querySelectorAll('[data-codex-composer]')].find(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0);
    const composer=editor?.closest('[class*="_ComposerLayoutRoot_"]')||(anchor?.isConnected&&anchor.getBoundingClientRect().height>0?anchor:null);
    if(composer!==anchor){editorObserver?.disconnect();anchor=composer;if(anchor){editorObserver=new ResizeObserver(anchorBar);let p=anchor;for(let n=0;p&&n<4;n++,p=p.parentElement)editorObserver.observe(p)}}
    const stage=document.querySelector('#folia-codex-frame')?.contentDocument?.documentElement;
    const foreground=document.querySelector('#folia-subtitle-frame')?.contentDocument?.documentElement;
    // This is an embedded chat surface even while Codex replaces its composer tree.
    stage?.setAttribute('data-folia-chat-layout','');foreground?.setAttribute('data-folia-chat-layout','');
    if(composer&&stage){
      // Monet stays at its captured viewport coordinates when either Codex sidebar changes.
      if(!monetPosition){const chat=composer.getBoundingClientRect(),side=document.querySelector('aside.app-shell-left-panel')?.getBoundingClientRect().right||0;const textLeft=Math.max(24,side+20),coverLeft=chat.right+28;monetPosition={viewport:innerWidth,textLeft,textWidth:Math.max(100,Math.min(520,chat.left-textLeft-28)),coverLeft,coverWidth:Math.min(440,Math.max(160,innerWidth-24-coverLeft))};localStorage.setItem('folia-monet-fixed-layout-v1',JSON.stringify(monetPosition))}
      const ratio=innerWidth/monetPosition.viewport,textLeft=monetPosition.textLeft*ratio,textWidth=monetPosition.textWidth*ratio;
      // Capture the conversation edge once. Neither a sidebar nor the movable song card owns this cover.
      if(!Number.isFinite(monetPosition.textRight)){monetPosition.textRight=composer.getBoundingClientRect().right/ratio;localStorage.setItem('folia-monet-fixed-layout-v1',JSON.stringify(monetPosition))}
      const coverWidth=monetPosition.coverWidth*ratio,coverLeft=(monetPosition.textRight*ratio+innerWidth-coverWidth)/2;
      for(const [key,val] of Object.entries({'text-left':textLeft+'px','text-width':textWidth+'px','cover-left':coverLeft+'px','cover-width':coverWidth+'px','cover-visibility':coverWidth>=160?'visible':'hidden'}))stage.style.setProperty('--codex-monet-'+key,val);
    }
    if(!pinned)clamp(bar,positions.bar);
    else if(composer){bar.hidden=false;const r=composer.getBoundingClientRect(),width=Math.min(720,r.width);put(bar,'width',width+'px');put(bar,'left',r.x+(r.width-width)/2+'px');put(bar,'top',Math.max(44,r.top-bar.offsetHeight-8)+'px')}
    if(composer&&foreground){
      let top=composer.getBoundingClientRect().top;
      const r=bar.getBoundingClientRect(),half=Math.min(448,(innerWidth-32)/2);
      if(!bar.hidden&&r.right>innerWidth/2-half&&r.left<innerWidth/2+half)top=Math.min(top,r.top);
      foreground.style.setProperty('--codex-subtitle-safe-bottom',Math.max(24,innerHeight-top+20)+'px');
    }
  }
  let scheduled=false;function refresh(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;anchorBar();applyPanel();clamp(app,positions.window)})}
  const observer=new MutationObserver(records=>{if(!anchor?.isConnected||records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches?.('[data-codex-composer]')||n.querySelector?.('[data-codex-composer]')))))refresh()});observer.observe(document.querySelector('#root'),{childList:true,subtree:true});window.addEventListener('resize',refresh);window.addEventListener('scroll',refresh,true);
  applyPanel();anchorBar();refresh();
  return {panelFrame,barFrame,overlayFrame,get panelRoot(){return panelFrame.contentDocument?.querySelector('#root')},get barRoot(){return barFrame.contentDocument?.querySelector('#root')},get overlayRoot(){return overlayFrame.contentDocument?.querySelector('#root')},fullscreen(value){fullPlayer=value;refresh()},setOverlay(open,label='曲库'){app.hidden=!open;const kind=label==='设置'?'settings':['音效','主题编辑','添加到歌单'].includes(label)?'dialog':'page';if(app.dataset.label!==label){const sizes={'设置':[900,820],'音效':[720,760],'主题编辑':[600,820],'添加到歌单':[480,650]};const [w,h]=sizes[label]||[1040,820];app.style.width=Math.min(w,innerWidth-48)+'px';app.style.height=Math.min(h,innerHeight-100)+'px';app.dataset.label=label}app.dataset.kind=kind;overlayFrame.contentDocument.documentElement.dataset.foliaWindow=kind;caption.textContent='Folia · '+label;if(open){const r=app.getBoundingClientRect();if(r.right>innerWidth||r.bottom>innerHeight)clamp(app,{x:r.x,y:r.y})}},syncLayout(){refresh()},collapsePanel(){setPanelHidden(true)},showPanel(){setPanelHidden(false)},togglePanel(){setPanelHidden(!panelHidden)},track(track){title.textContent=track.title;artist.textContent=track.artist||'点击打开播放器';mini.title=track.title+(track.artist?' · '+track.artist:'');if(track.cover)cover.src=track.cover;else cover.removeAttribute('src')},size(name,height){if(name==='panel'&&height>20&&panelHeight!==height+8){panelHeight=height+8;applyPanel()}},destroy(){observer.disconnect();editorObserver?.disconnect();barObserver?.disconnect();dragCleanups.forEach(cleanup=>cleanup());window.removeEventListener('resize',refresh);window.removeEventListener('scroll',refresh,true);panel.remove();bar.remove();app.remove()}};
}
