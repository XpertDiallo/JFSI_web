"use client";
import {useEffect,useId,useRef,useState,type CSSProperties,type KeyboardEvent,type PointerEvent,type ReactNode} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {swipeDirection,type PageDirection,type SwipePoint} from '../lib/reader-navigation';

const interactive = 'input,textarea,select,button,a,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="slider"],[role="spinbutton"]';

export function PageTurnSurface({children,label,ready,zoomed,previous,next,turn}: {
  children: ReactNode; label: string; ready: boolean; zoomed: boolean;
  previous: boolean; next: boolean; turn: (direction: PageDirection) => void;
}) {
  const hintId=useId();
  const points=useRef(new Set<number>()), start=useRef<SwipePoint|null>(null);
  const [browserZoomed,setBrowserZoomed]=useState(false);
  useEffect(()=>{
    const viewport=window.visualViewport;
    const update=()=>setBrowserZoomed((viewport?.scale||1)>1.05);
    update(); viewport?.addEventListener('resize',update);
    return()=>viewport?.removeEventListener('resize',update);
  },[]);
  const canSwipe=ready&&!zoomed&&!browserZoomed;
  useEffect(()=>{start.current=null},[canSwipe]);
  function navigate(direction: PageDirection) {
    if (ready&&(direction===-1?previous:next)) turn(direction);
  }
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!ready||e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||
      (e.target instanceof Element&&e.target.closest(interactive))||
      !window.getSelection()?.isCollapsed) return;
    const direction=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0;
    if (direction) {e.preventDefault();navigate(direction)}
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.target instanceof Element&&e.target.closest(interactive)) return;
    e.currentTarget.focus({preventScroll:true});
    if(e.pointerType!=='touch') return;
    points.current.add(e.pointerId);
    start.current=canSwipe&&points.current.size===1&&e.isPrimary
      ?{x:e.clientX,y:e.clientY,time:e.timeStamp}:null;
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const point=start.current;
    const onlyPointer=points.current.size===1&&points.current.has(e.pointerId);
    points.current.delete(e.pointerId); start.current=null;
    if (point&&onlyPointer&&canSwipe) {
      const direction=swipeDirection(point,{x:e.clientX,y:e.clientY,time:e.timeStamp});
      if(direction) navigate(direction);
    }
  }
  function cancel(e: PointerEvent<HTMLDivElement>) {
    points.current.delete(e.pointerId); start.current=null;
  }
  return <>
    <p className="reader-gesture-hint" id={hintId}>Balayez la page vers la gauche ou la droite, ou sélectionnez-la puis utilisez les touches ← et →.{(zoomed||browserZoomed)&&' En zoom, faites glisser pour vous déplacer ; utilisez les flèches pour changer de page.'}</p>
    <div className="reader-page-shell">
      <div className="reader-page-surface" role="group" aria-label={label} aria-describedby={hintId}
        tabIndex={0} onKeyDown={onKeyDown} onPointerDown={onPointerDown}
        onPointerUp={onPointerUp} onPointerCancel={cancel} onLostPointerCapture={cancel}
        style={{touchAction:canSwipe?'pan-y pinch-zoom':'auto'} as CSSProperties}>
        {children}
      </div>
      <button className="reader-page-arrow previous" type="button" aria-label="Tourner vers la page précédente" disabled={!ready||!previous} onClick={()=>navigate(-1)}><ChevronLeft aria-hidden="true"/></button>
      <button className="reader-page-arrow next" type="button" aria-label="Tourner vers la page suivante" disabled={!ready||!next} onClick={()=>navigate(1)}><ChevronRight aria-hidden="true"/></button>
    </div>
  </>;
}
