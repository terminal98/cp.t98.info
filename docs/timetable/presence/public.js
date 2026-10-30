import {createPresenceView} from './view.js?v=ttl15-20261030';
const board=document.getElementById('availability-board');
const container=document.getElementById('availability-presence');
if(board&&container){
  const endpoint=board.dataset.presenceApi;
  // Without a presence API, keep live sharing disabled but still show the event-end notice.
  {
    const sample=['localhost','127.0.0.1'].includes(location.hostname)&&board.dataset.presencePreview==='true';
    let sampleTime=Date.parse(board.dataset.presenceNow),samplePerf=performance.now();
    const clock=()=>sample&&Number.isFinite(sampleTime)?sampleTime+performance.now()-samplePerf:Date.now();
    const view=createPresenceView(container,{clock});
    let event=null,timer=null,inFlight=false,revision=0;
    function withinEvent(){return event&&clock()>=Date.parse(event.starts_at)&&clock()<Date.parse(event.ends_at);}
    async function refresh(){
      clearTimeout(timer);
      if(!event||document.hidden)return;
      if(!endpoint){view.update(event,null,false);return;}
      if(!withinEvent()){view.update(event,null,false);timer=setTimeout(refresh,60000);return;}
      if(inFlight)return;
      inFlight=true;const currentRevision=revision;
      try{
        const url=new URL(endpoint.replace('{slug}',encodeURIComponent(event.slug)),location.href);if(sample)url.searchParams.set('event',event.slug);
        const response=await fetch(url,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(8000)});
        if(!response.ok)throw new Error('Presence unavailable');
        const data=await response.json();
        if(currentRevision!==revision)return;
        if(sample&&Number.isFinite(Date.parse(data.previewNow))){sampleTime=Date.parse(data.previewNow);samplePerf=performance.now();}
        if(data.event?.slug===event.slug)event={...event,allowed_area:data.event.allowed_area};
        view.update(event,data.presence,data.enabled===true);
      }catch{if(currentRevision===revision)view.update(event,null,true);}
      finally{inFlight=false;if(currentRevision!==revision)void refresh();else if(!document.hidden)timer=setTimeout(refresh,60000);}
    }
    function setEvent(next){revision++;event=next;view.update(event,null,false);void refresh();}
    board.addEventListener('timetable:loaded',e=>setEvent(e.detail.event));
    if(board.timetableEvent)setEvent(board.timetableEvent);
    document.addEventListener('visibilitychange',()=>{view.refresh();if(document.hidden)clearTimeout(timer);else void refresh();});
    window.addEventListener('pagehide',e=>{revision++;clearTimeout(timer);if(e.persisted)view.update(event,null,false);else view.dispose();});
    window.addEventListener('pageshow',e=>{if(e.persisted){view.refresh();void refresh();}});
  }
}
