import {createPresenceMap} from './map.js';
import {createMapLibrePresenceMap} from './maplibre-map.js?v=live-bubble-20261030';
// Display model only. The API adapter is kept separate from the app's upload payload.
export const activityLabels = Object.freeze({shooting:'撮影中',moving:'移動中',resting:'休憩中',waiting:'待機中',available:'フリー'});
const time = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : NaN;
const validCoordinate = (n,limit) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n)<=limit;
export function presenceState(event, presence, enabled, now=Date.now()) {
  const start=time(event?.starts_at),end=time(event?.ends_at);
  if (!Number.isFinite(start)||!Number.isFinite(end)||start>=end) return {state:'unavailable',visible:false};
  if (now<start) return {state:'before',visible:false};
  if (now>=end) return {state:'ended',visible:true};
  if (!enabled) return {state:'disabled',visible:false};
  if (!presence || presence.eventId!==event.slug) return {state:'unavailable',visible:false,label:'状況を確認できません'};
  if (presence.sharing!==true) return {state:'stopped',visible:false,label:'共有停止中'};
  const updated=time(presence.updatedAt),expires=time(presence.expiresAt),position=presence.position;
  const measured=time(position?.measuredAt),positionExpiry=time(position?.expiresAt);
  const deadline=Math.min(expires,positionExpiry,measured+15*60000,end);
  if (!Number.isFinite(updated)||updated>now+30000||!Number.isFinite(measured)||measured>now+30000||!Number.isFinite(deadline)||deadline<=now) return {state:'stale',visible:false,label:'更新待ち',updatedAt:presence.updatedAt};
  if (!Object.hasOwn(activityLabels,presence.status)||!validCoordinate(position.latitude,90)||!validCoordinate(position.longitude,180)) return {state:'unavailable',visible:false,label:'状況を確認できません'};
  return {state:'active',visible:true,label:activityLabels[presence.status],activity:presence.status,updatedAt:position.measuredAt,deadline,position:{latitude:position.latitude,longitude:position.longitude,accuracy:typeof position.accuracy==='number'&&Number.isFinite(position.accuracy)&&position.accuracy>=0?Math.min(position.accuracy,5000):null,areaId:typeof position.areaId==='string'?position.areaId.slice(0,100):null,placeName:typeof position.placeName==='string'?position.placeName.slice(0,120):''}};
}
const el = (tag,text,className) => {const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const dateLabel = iso => new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));
export function createPresenceView(container,{clock=Date.now,mapLibrary=globalThis.L,admin=false,maptilerKey,fullMap=false}={}) {
  let event=null,presence=null,enabled=false,map=null,lastKey='',disposed=false,mapEvent=null;
  function clearMap(){if(map){map.remove();map=null;}}
  function updateTime(node,state,now){
    if(!node||!Number.isFinite(time(state.updatedAt)))return;
    node.dateTime=state.updatedAt;
    node.title=dateLabel(state.updatedAt);
    node.textContent=admin?dateLabel(state.updatedAt)+(state.state==='active'?' 位置更新':' 更新'):`${Math.max(0,Math.floor((now-time(state.updatedAt))/60000))}分前`;
  }
  function render(){
    if(disposed)return;
    const now=clock(),state=presenceState(event,presence,enabled,now);
    updateTime(container.querySelector('.tt-presence-updated'),state,now);
    if(state.state==='active')map?.updateSummary?.({label:state.label,activity:state.activity,updatedAt:state.updatedAt,now});
    const key=JSON.stringify(state);if(key===lastKey)return;lastKey=key;
    // Keep the viewer's location and map view across ordinary shared-position updates.
    if(map&&mapEvent===event?.slug&&container.dataset.state==='active'&&state.state==='active'){
      map.updatePosition(state.position);
      const status=container.querySelector('.tt-presence-status');status.textContent=state.label;status.dataset.activity=state.activity;
      container.querySelector('.tt-presence-place').textContent=state.position.placeName||'会場内';
      return;
    }
    clearMap();container.replaceChildren();container.classList.add('tt-presence');container.dataset.state=state.state;
    container.dataset.public=String(!admin);
    container.classList.toggle('tt-presence--ended',!admin&&state.state==='ended');
    container.hidden=!state.visible&&!admin&&!fullMap;
    if(fullMap&&!state.visible){container.append(el('p','現在位置は公開されていません。','tt-presence-empty'));return;}
    if(container.hidden)return;
    if(!admin&&state.state==='ended'){
      const notice=el('p',undefined,'tt-presence-ended-message');notice.setAttribute('role','status');
      const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');
      icon.innerHTML='<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 10.5v6M12 7.5v.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
      notice.append(icon,el('span','このイベントは終了しました。'));container.append(notice);return;
    }
    const header=el('div',undefined,'tt-presence-heading');
    if(admin){header.append(el('h2','現在の状況'));container.append(header);}
    const label=state.label||({disabled:'公開OFF',before:'イベント開始前',ended:'イベント終了'}[state.state])||'状況を確認できません';
    const summary=el('div',undefined,'tt-presence-summary');
    const status=el(admin?'strong':'h2',label,'tt-presence-status');status.dataset.activity=state.activity||state.state;summary.append(status);
    if(state.position)summary.append(el('span',state.position.placeName||'会場内','tt-presence-place'));
    if(state.updatedAt&&Number.isFinite(time(state.updatedAt))){const timestamp=el('time',undefined,'tt-presence-updated');updateTime(timestamp,state,now);(admin?header:summary).append(timestamp);}
    container.append(summary);
    if(state.state==='stale')container.append(el('p','位置情報の有効期限が切れたため、地図の表示を停止しています。','tt-presence-note'));
    if(state.state==='stopped')container.append(el('p','現在、位置情報は共有していません。','tt-presence-note'));
    if(state.state==='unavailable')container.append(el('p','時間をおいて、もう一度確認してください。','tt-presence-note'));
    if(state.state==='before'||state.state==='ended')container.append(el('p','公開ページではイベントの開始から終了まで表示します。','tt-presence-note'));
    if(state.state==='disabled')container.append(el('p','公開ページには現在位置・ステータスを表示しません。','tt-presence-note'));
    if(!state.position)return;
    if(!admin&&!fullMap){
      const link=el('a','地図で見る','tt-presence-map-link');
      link.href='/timetable/map/?event='+encodeURIComponent(event.slug);link.target='_blank';link.rel='noopener';
      summary.append(link);return;
    }
    if(mapLibrary){
      const createMap=typeof mapLibrary.Map?.prototype.setStyle==='function'?createMapLibrePresenceMap:createPresenceMap;
      map=createMap(container,{L:mapLibrary,position:state.position,eventSlug:event.slug,allowedArea:admin?undefined:event.allowed_area,maptilerKey,fullMap,sharedSummary:!admin?{label:state.label,activity:state.activity,updatedAt:state.updatedAt,now}:null});
      mapEvent=event.slug;
    }
  }
  const interval=setInterval(render,1000);
  document.addEventListener('visibilitychange',render);
  return {update(nextEvent,nextPresence,nextEnabled){event=nextEvent;presence=nextPresence;enabled=nextEnabled===true;lastKey='';render();},suspend(){map?.stopViewing();},refresh:render,dispose(){disposed=true;clearInterval(interval);document.removeEventListener('visibilitychange',render);clearMap();container.replaceChildren();}};
}
