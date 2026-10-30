import './public.js?v=live-bubble-20261030';
const board=document.getElementById('availability-board'),container=document.getElementById('availability-presence');
const slug=new URLSearchParams(location.search).get('event')||'lagcos-tw-2026';
const valid=/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)&&slug.length<=64;
if(valid){
  document.getElementById('presence-map-back').href='/timetable/'+encodeURIComponent(slug)+'/';
  try{
    const preview=['localhost','127.0.0.1'].includes(location.hostname)&&board.dataset.presencePreview==='true';
    const endpoint=preview?board.dataset.api:'https://g2.t98.info/timetable/'+encodeURIComponent(slug)+'.json';
    const response=await fetch(endpoint,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error('Event unavailable');
    const data=await response.json();if(data.event?.slug!==slug)throw new Error('Event mismatch');
    document.title=data.event.title+' 現在地の地図';
    board.timetableEvent=data.event;
    board.dispatchEvent(new CustomEvent('timetable:loaded',{detail:{event:data.event}}));
  }catch{container.replaceChildren(Object.assign(document.createElement('p'),{className:'tt-presence-empty',textContent:'地図を読み込めませんでした。'}));}
}else container.replaceChildren(Object.assign(document.createElement('p'),{className:'tt-presence-empty',textContent:'イベントが見つかりません。'}));
