(options) => {
  // lyric-layout.js: adjust the native lyrics, subtitles and harmony independently.
  const {frame}=options,defaults={lyrics:{x:0,y:0,scale:.7},subtitle:{x:0,y:0,scale:1},monetSubtitle:{x:0,y:0,scale:1},harmony:{x:0,y:0,scale:1}};
  const layouts=structuredClone(defaults);
  try{Object.assign(layouts.lyrics,JSON.parse(localStorage.getItem('folia-lyric-layout-v7')||'{}'));const saved=JSON.parse(localStorage.getItem('folia-subtitle-layout-v9')||'{}');for(const kind of ['subtitle','harmony'])Object.assign(layouts[kind],saved[kind])}catch{}
  // Monet follows the active line; the shared bottom subtitle has a different origin.
  try{Object.assign(layouts.monetSubtitle,JSON.parse(localStorage.getItem('folia-monet-subtitle-layout-v15')||'{}'))}catch{}
  const layoutKey=()=>target==='subtitle'&&frame.contentDocument?.querySelector('[data-codex-visualizer="monet"]')?'monetSubtitle':target;
  const currentLayout=()=>layouts[layoutKey()];
  let target='lyrics',editing=false,start,lastFontScale;
  const layer=document.createElement('div');layer.id='folia-lyric-positioner';layer.hidden=true;
  const outline=document.createElement('div');outline.id='folia-lyric-outline';layer.append(outline);
  for(const edge of ['n','ne','e','se','s','sw','w','nw']){const handle=document.createElement('span');handle.dataset.resize=edge;handle.title='拖动调整'+(edge.length===2?'宽高':edge==='e'||edge==='w'?'宽度':'高度');outline.append(handle)}
  const controls=document.createElement('div');controls.id='folia-layout-controls';controls.hidden=true;controls.setAttribute('role','group');controls.setAttribute('aria-label','歌词位置与缩放');
  const label=document.createElement('span');label.textContent='拖动位置 · 边框调宽高 · 双击框外退出';
  const select=document.createElement('select');select.setAttribute('aria-label','调整对象');
  for(const [value,text] of Object.entries({lyrics:'主歌词',subtitle:'字幕',harmony:'和声字幕'})){const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o)}
  select.onchange=()=>{target=select.value;start=null;apply()};
  const value=document.createElement('output');value.style.minWidth='42px';value.setAttribute('aria-live','polite');
  const range=document.createElement('input');range.type='range';range.min='30';range.max='160';range.step='1';range.setAttribute('aria-label','字号比例');
  function button(text,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=action;return b}
  controls.append(select,label,button('−',()=>zoom(currentLayout().scale-.05)),range,button('+',()=>zoom(currentLayout().scale+.05)),value,button('归中',()=>{const key=layoutKey();Object.assign(layouts[key],{x:defaults[key].x,y:defaults[key].y});apply()}),button('复原',()=>{const key=layoutKey();layouts[key]={...defaults[key]};apply(true)}),button('完成',()=>setEditing(false)));
  function apply(force=false,persist=true){
    for(const item of Object.values(layouts)){item.scale=Math.max(.3,Math.min(1.6,Number(item.scale)||1));item.x=Math.max(-innerWidth*.8,Math.min(Number(item.x)||0,innerWidth*.8));item.y=Math.max(-innerHeight*.8,Math.min(Number(item.y)||0,innerHeight*.8))}
    const d=frame.contentDocument,root=d?.querySelector('#folia-visual-root'),layout=layouts.lyrics;
    if(root){
      root.style.inset='0';root.style.width='100%';root.style.height='100%';root.style.transform='none';
      d.documentElement.style.setProperty('--codex-lyric-x',layout.x+'px');d.documentElement.style.setProperty('--codex-lyric-y',layout.y+'px');
      for(const dim of ['width','height']){if(layout[dim])d.documentElement.style.setProperty('--codex-lyric-'+dim,layout[dim]+'px');else d.documentElement.style.removeProperty('--codex-lyric-'+dim)}
      d.documentElement.toggleAttribute('data-folia-lyric-sized',!!(layout.width||layout.height));
      d.documentElement.toggleAttribute('data-folia-lyric-height',!!layout.height);
      frame.contentWindow.postMessage({type:'folia-lyric-position',x:layout.x,y:layout.y},location.origin);
      if(force||layout.scale!==lastFontScale){frame.contentWindow.postMessage({type:'folia-lyric-font-scale',scale:layout.scale},location.origin);lastFontScale=layout.scale}
    }
    const foreground=document.querySelector('#folia-subtitle-frame')?.contentDocument?.documentElement;
    for(const [key,kind] of [['subtitle','subtitle'],['monetSubtitle','monet-subtitle'],['harmony','harmony']]){for(const prop of ['x','y','scale'])foreground?.style.setProperty('--codex-'+kind+'-'+prop,layouts[key][prop]+(prop==='scale'?'':'px'));for(const dim of ['width','height']){if(layouts[key][dim])foreground?.style.setProperty('--codex-'+kind+'-'+dim,layouts[key][dim]+'px');else foreground?.style.removeProperty('--codex-'+kind+'-'+dim)}}
    const item=currentLayout();
    const actual=target==='lyrics'?d?.querySelector('[data-codex-monet-text]'):foreground?.querySelector('[data-codex-subtitle-layer="'+target+'"]>div');
    const r=actual?.getBoundingClientRect();
    outline.style.left=(r?.width?r.x:innerWidth*.175+item.x)+'px';outline.style.top=(r?.height?r.y:(target==='harmony'?76:target==='subtitle'?innerHeight-100:innerHeight*.25)+item.y)+'px';outline.style.width=(r?.width||innerWidth*.65)+'px';outline.style.height=(r?.height||(target==='lyrics'?innerHeight*.5:100))+'px';
    range.value=Math.round(item.scale*100);value.textContent=range.value+'%';
    if(persist){localStorage.setItem('folia-lyric-layout-v7',JSON.stringify(layout));localStorage.setItem('folia-subtitle-layout-v9',JSON.stringify({subtitle:layouts.subtitle,harmony:layouts.harmony}));localStorage.setItem('folia-monet-subtitle-layout-v15',JSON.stringify(layouts.monetSubtitle))}
  }
  function zoom(next){currentLayout().scale=next;apply()}
  function setEditing(next){editing=next;layer.hidden=!next;controls.hidden=!next;document.documentElement.toggleAttribute('data-folia-editing',next);window.getSelection()?.removeAllRanges();apply()}
  range.oninput=()=>zoom(Number(range.value)/100);
  layer.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();window.getSelection()?.removeAllRanges();const r=outline.getBoundingClientRect(),item=currentLayout();start={pointerX:e.clientX,pointerY:e.clientY,x:item.x,y:item.y,width:r.width,height:r.height,edge:e.target.dataset.resize};layer.setPointerCapture(e.pointerId)});
  layer.addEventListener('pointermove',e=>{if(!start)return;e.preventDefault();const dx=e.clientX-start.pointerX,dy=e.clientY-start.pointerY,item=currentLayout(),edge=start.edge;if(!edge){item.x=start.x+dx;item.y=start.y+dy}else{if(/[ew]/.test(edge)){const width=Math.max(160,Math.min(innerWidth*2,start.width+(edge.includes('w')?-dx:dx)));item.width=width;if(edge.includes('w'))item.x=start.x+start.width-width}if(/[ns]/.test(edge)){const height=Math.max(100,Math.min(innerHeight*2,start.height+(edge.includes('n')?-dy:dy)));item.height=height;if(edge.includes('n'))item.y=start.y+start.height-height}}apply(false,false)});
  const finish=()=>{if(start){start=null;apply()}};layer.addEventListener('pointerup',finish);layer.addEventListener('pointercancel',finish);
  layer.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();zoom(currentLayout().scale+(e.deltaY<0?.025:-.025))},{passive:false});
  layer.addEventListener('dblclick',e=>{const r=outline.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){e.preventDefault();setEditing(false)}});
  const escape=e=>{if(e.key==='Escape'&&editing)setEditing(false)},resize=()=>apply();
  window.addEventListener('keydown',escape);window.addEventListener('resize',resize);frame.addEventListener('load',resize);
  document.body.append(layer,controls);apply();
  return {apply,get layout(){return {...layouts.lyrics}},get layouts(){return structuredClone(layouts)},setEditing,destroy(){window.removeEventListener('keydown',escape);window.removeEventListener('resize',resize);frame.removeEventListener('load',resize);document.documentElement.removeAttribute('data-folia-editing');layer.remove();controls.remove()}};
}
