(options) => {
  // direct-drag.js: translate iframe pointer coordinates into the host window without covering controls.
  const {element,surface,frame,onMove,onEnd,canStart}=options;
  const doc=surface.ownerDocument;
  const interactive='button,a,input,textarea,select,label,summary,[contenteditable="true"],[role="button"],[role="slider"],[role="switch"],[role="tab"],[role="option"],[role="menuitem"],[aria-haspopup],[data-no-drag],[draggable="true"],[data-grid3d-index],.bravais-tile,.lattice-field,[data-wheel-scroll-region]';
  let gesture=null,blockClick=false;
  function point(event){const r=frame?.getBoundingClientRect();return {x:event.clientX+(r?.x||0),y:event.clientY+(r?.y||0)}}
  function down(event){
    blockClick=false;
    if(event.button!==0||event.isPrimary===false)return;
    if(canStart&&!canStart(event))return;
    const target=event.target.closest?.(interactive);
    if(target&&target!==surface)return;
    const p=point(event),r=element.getBoundingClientRect();
    // Native scrollbars stay usable. Forms, tabs and buttons are excluded above.
    if(frame&&event.clientX>=doc.documentElement.clientWidth)return;
    gesture={pointerId:event.pointerId,x:p.x,y:p.y,left:r.x,top:r.y,moved:false};
    if(options.captureOnDown)surface.setPointerCapture(event.pointerId);
    if(event.target.tagName==='IMG')event.preventDefault();
  }
  function move(event){
    if(!gesture||gesture.pointerId!==event.pointerId)return;
    const p=point(event),dx=p.x-gesture.x,dy=p.y-gesture.y;
    if(!gesture.moved&&Math.hypot(dx,dy)<6)return;
    if(!gesture.moved){gesture.moved=true;surface.setPointerCapture(event.pointerId)}
    event.preventDefault();event.stopPropagation();doc.getSelection()?.removeAllRanges();
    element.dataset.foliaDragging='true';doc.documentElement.dataset.foliaDragging='true';
    onMove({x:gesture.left+dx,y:gesture.top+dy});
  }
  function finish(event){
    if(!gesture||gesture.pointerId!==event.pointerId)return;
    if(gesture.moved){blockClick=true;onEnd()}
    if(surface.hasPointerCapture(event.pointerId))surface.releasePointerCapture(event.pointerId);
    gesture=null;delete element.dataset.foliaDragging;delete doc.documentElement.dataset.foliaDragging;
  }
  function click(event){if(blockClick){blockClick=false;event.preventDefault();event.stopImmediatePropagation()}}
  function nativeDrag(event){if(gesture)event.preventDefault()}
  surface.addEventListener('pointerdown',down,true);
  surface.addEventListener('pointermove',move,true);
  surface.addEventListener('pointerup',finish,true);
  surface.addEventListener('pointercancel',finish,true);
  surface.addEventListener('click',click,true);
  surface.addEventListener('dragstart',nativeDrag,true);
  return ()=>{
    surface.removeEventListener('pointerdown',down,true);surface.removeEventListener('pointermove',move,true);
    surface.removeEventListener('pointerup',finish,true);surface.removeEventListener('pointercancel',finish,true);
    surface.removeEventListener('click',click,true);surface.removeEventListener('dragstart',nativeDrag,true);
    delete element.dataset.foliaDragging;delete doc.documentElement.dataset.foliaDragging;
  };
}
