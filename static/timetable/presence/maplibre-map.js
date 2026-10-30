import {visibleVenuePoint} from './place-visibility.js?v=overview-20261030';
import {presenceBasemap} from './basemap.js?v=map-options-20261030';
import {mapSettingsControl,preferredBasemap} from './map-settings.js?v=map-options-20261030';
import {venueGroups} from './venue-areas.js?v=points-20261030';
import {validMapArea} from './map.js';
const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const collection=features=>({type:'FeatureCollection',features});
export function accuracyPolygon(position){
  if(!position||!Number.isFinite(position.accuracy)||position.accuracy<=0)return collection([]);
  const rad=Math.PI/180,lat=position.latitude*rad,lon=position.longitude*rad,d=Math.min(position.accuracy,5000)/6371008.8,ring=[];
  for(let i=0;i<64;i++){
    const bearing=i*2*Math.PI/64;
    const nextLat=Math.asin(Math.sin(lat)*Math.cos(d)+Math.cos(lat)*Math.sin(d)*Math.cos(bearing));
    const nextLon=lon+Math.atan2(Math.sin(bearing)*Math.sin(d)*Math.cos(lat),Math.cos(d)-Math.sin(lat)*Math.sin(nextLat));
    ring.push([nextLon/rad,nextLat/rad]);
  }
  ring.push(ring[0]);return collection([{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[ring]}}]);
}
export function createMapLibrePresenceMap(host,{L:GL,position,eventSlug,allowedArea,maptilerKey=document.querySelector('meta[name="timetable-maptiler-key"]')?.content.trim()||'',fullMap=false,sharedSummary=null}){
  let disposed=false,sharedPosition=position,selfPosition=null,userMarker=null,watch=null,locationRevision=0,locationTime=0,styleReady=false,theme='',basemap=preferredBasemap(),fallback=!maptilerKey;
  const node=el('div',undefined,'tt-presence-map');node.dataset.mapRenderer='maplibre';node.setAttribute('role','region');node.setAttribute('aria-label','共有中の位置・場所・施設・自分の現在地');host.append(node);
  const currentTheme=()=>document.documentElement.classList.contains('dark')?'dark':'light';
  function style(next){
    node.dataset.mapTheme=next;node.dataset.mapProvider=fallback?'osm':'maptiler';
    if(!fallback)return {version:8,sources:{},layers:[{id:'loading',type:'background',paint:{'background-color':next==='dark'?'#17212b':'#F9F9ED'}}]};
    return {version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'}},layers:[{id:'osm',type:'raster',source:'osm',paint:next==='dark'?{'raster-brightness-max':.45,'raster-saturation':-.65}:{}}]};
  }
  theme=currentTheme();
  const map=new GL.Map({container:node,style:style(theme),center:[position.longitude,position.latitude],zoom:17,maxZoom:21,attributionControl:true,maplibreLogo:true,
    locale:{'NavigationControl.ZoomIn':'拡大','NavigationControl.ZoomOut':'縮小','AttributionControl.ToggleAttribution':'出典を表示'}});
  if(!fullMap)map.scrollZoom.disable();map.dragRotate.disable();map.touchZoomRotate.disableRotation();map.addControl(new GL.NavigationControl({showCompass:false}),'top-left');
  const area=validMapArea(allowedArea);
  if(area){const dy=area.radius/111320,dx=dy/Math.max(.01,Math.cos(area.latitude*Math.PI/180));map.fitBounds([[area.longitude-dx,Math.max(-85,area.latitude-dy)],[area.longitude+dx,Math.min(85,area.latitude+dy)]],{padding:18,maxZoom:18,duration:0});}
  const sharedDot=el('div',undefined,'tt-presence-shared-dot');sharedDot.setAttribute('aria-label','公開中の位置');sharedDot.title='公開中の位置';
  sharedDot.setAttribute('role','img');
  const bubble=fullMap&&sharedSummary?el('span',undefined,'tt-presence-live-bubble'):null;
  const bubbleStatus=bubble?el('strong',undefined,'tt-presence-live-status'):null;
  const bubbleTime=bubble?el('time',undefined,'tt-presence-live-time'):null;
  if(bubble){bubble.setAttribute('aria-hidden','true');bubble.append(bubbleStatus,bubbleTime);sharedDot.append(bubble);}
  function positionBubble(){
    if(!bubble)return;const point=map.project([sharedPosition.longitude,sharedPosition.latitude]);
    bubble.hidden=point.x<0||point.x>node.clientWidth||point.y<0||point.y>node.clientHeight;
    bubble.dataset.placement=point.y<126?'below':'above';
    const half=bubble.offsetWidth/2,shift=Math.max(12+half-point.x,Math.min(0,node.clientWidth-12-half-point.x));
    bubble.style.setProperty('--bubble-shift',shift+'px');
  }
  function updateSummary(next){
    if(!bubble||!next)return;
    bubbleStatus.textContent=next.label;bubbleStatus.dataset.activity=next.activity;
    const timestamp=Date.parse(next.updatedAt),now=Number.isFinite(next.now)?next.now:Date.now();
    bubbleTime.hidden=!Number.isFinite(timestamp);
    if(!bubbleTime.hidden){bubbleTime.dateTime=next.updatedAt;bubbleTime.textContent=Math.max(0,Math.floor((now-timestamp)/60000))+'分前';}
    sharedDot.setAttribute('aria-label','公開中の位置：'+next.label+(bubbleTime.hidden?'':' '+bubbleTime.textContent));
    positionBubble();
  }
  const shared=new GL.Marker({element:sharedDot}).setLngLat([position.longitude,position.latitude]).addTo(map);
  updateSummary(sharedSummary);
  map.on('move resize',positionBubble);
  map.on('style.load',()=>{if(disposed)return;if(!fallback&&!['osm-bright','satellite'].includes(map.getStyle().metadata?.['cp:basemap']))return;styleReady=true;node.dataset.mapReady='true';});
  // A rejected map-service key must not hide the actual shared marker and controls.
  map.on('error',event=>{
    if(!fallback&&([401,403,429].includes(event.error?.status)||/invalid.?key|unauthorized|forbidden/i.test(event.error?.message||''))){fallback=true;styleReady=false;map.setStyle(style(theme));}
  });
  let styleRevision=0;
  async function applyBasemap(){
    const revision=++styleRevision;styleReady=false;node.dataset.mapReady='false';
    if(fallback){map.setStyle(style(theme));return;}
    node.dataset.mapTheme=theme;node.dataset.mapProvider='maptiler';node.dataset.mapBasemap=basemap;
    try{const next=await presenceBasemap(maptilerKey,theme,basemap);if(!disposed&&revision===styleRevision)map.setStyle(next);}
    catch{if(!disposed&&revision===styleRevision){fallback=true;map.setStyle(style(theme));}}
  }
  map.addControl(mapSettingsControl({canSatellite:!!maptilerKey,onBasemapChange:value=>{basemap=value;void applyBasemap();}}),'top-right');
  void applyBasemap();
  const themeObserver=new MutationObserver(()=>{const next=currentTheme();if(disposed||next===theme)return;theme=next;void applyBasemap();});
  themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  const venue=eventSlug?.startsWith('lagcos-');
  const markers=[];
  if(venue){
    const labels=venueGroups;
    for(const spot of labels){
      const dot=el('div',undefined,'tt-venue-label-anchor');
      const label=el('span',spot.name,'tt-venue-label');dot.append(label);
      dot.dataset.areaId=spot.id;dot.dataset.kind=spot.kind||'shooting';dot.dataset.level=spot.level||'place';dot.title=spot.name;dot.setAttribute('aria-label',spot.name);
      const marker=new GL.Marker({element:dot}).setLngLat(spot.label).addTo(map);
      markers.push({spot,marker,label,dot});
    }
  }
  function arrangeLabels(){
    if(disposed)return;const occupied=[],zoom=map.getZoom();
    for(const {spot,label,dot} of markers){
      dot.hidden=!visibleVenuePoint(spot,zoom,venueGroups);if(dot.hidden)continue;
      const p=map.project(spot.label),w=label.offsetWidth,h=label.offsetHeight;
      const b={left:p.x+9,right:p.x+w+17,top:p.y-h/2-3,bottom:p.y+h/2+3};
      const visible=b.left>=0&&b.right<node.clientWidth&&b.top>=80&&b.bottom<node.clientHeight-24&&!occupied.some(a=>b.left<a.right&&b.right>a.left&&b.top<a.bottom&&b.bottom>a.top);
      label.style.visibility=visible?'visible':'hidden';
      dot.dataset.active=String(sharedPosition.areaId===spot.id||sharedPosition.areaId==='group:'+spot.name);
      if(visible)occupied.push(b);
    }
    node.dataset.zoom=zoom.toFixed(2);
  }
  map.on('move',arrangeLabels);map.on('resize',arrangeLabels);map.on('idle',arrangeLabels);
  const locate=el('button',undefined,'tt-presence-locate');locate.type='button';locate.setAttribute('aria-label','自分の現在地を表示');locate.title='自分の現在地を表示';locate.setAttribute('aria-pressed','false');
  locate.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22"/></svg>';
  map.addControl({onAdd(){const box=el('div',undefined,'maplibregl-ctrl maplibregl-ctrl-group');box.append(locate);return box;},onRemove(){locate.parentElement?.remove();}},'top-right');
  const feedback=el('p',undefined,'tt-presence-geolocation-feedback');feedback.hidden=true;feedback.setAttribute('role','status');host.append(feedback);
  function clearLocation(){
    locationRevision++;if(watch!==null){navigator.geolocation?.clearWatch(watch);watch=null;}
    if(userMarker){userMarker.remove();userMarker=null;}selfPosition=null;locationTime=0;
    locate.setAttribute('aria-pressed','false');locate.removeAttribute('aria-busy');locate.setAttribute('aria-label','自分の現在地を表示');locate.title='自分の現在地を表示';
  }
  function stopLocation(message=''){clearLocation();feedback.textContent=message;feedback.hidden=!message;}
  locate.addEventListener('click',()=>{
    if(watch!==null){stopLocation();return;}
    if(!navigator.geolocation){stopLocation('このブラウザは現在地の取得に対応していません。');return;}
    clearLocation();const revision=locationRevision;let first=true;
    locate.setAttribute('aria-pressed','true');locate.setAttribute('aria-busy','true');locate.setAttribute('aria-label','自分の現在地を消す');locate.title='自分の現在地を消す';feedback.hidden=true;
    watch=navigator.geolocation.watchPosition(result=>{
      if(disposed||revision!==locationRevision)return;const {latitude,longitude,accuracy:precision}=result.coords;
      if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180||!Number.isFinite(result.timestamp)||Date.now()-result.timestamp>60000){stopLocation('新しい現在地を取得できませんでした。もう一度お試しください。');return;}
      selfPosition={latitude,longitude,accuracy:Number.isFinite(precision)&&precision>=0?Math.min(precision,5000):0};locationTime=result.timestamp;
      if(userMarker)userMarker.setLngLat([longitude,latitude]);
      else{const dot=el('div',undefined,'tt-presence-self-dot');dot.append(el('span','自分の現在地','tt-presence-self-label'));userMarker=new GL.Marker({element:dot}).setLngLat([longitude,latitude]).addTo(map);}

      if(first){const bounds=new GL.LngLatBounds([sharedPosition.longitude,sharedPosition.latitude],[sharedPosition.longitude,sharedPosition.latitude]);bounds.extend([longitude,latitude]);map.fitBounds(bounds,{padding:35,maxZoom:17,duration:0});first=false;}
      locate.removeAttribute('aria-busy');feedback.hidden=true;
    },error=>{if(!disposed&&revision===locationRevision)stopLocation(error.code===1?'位置情報の利用が許可されていません。ブラウザの設定から許可できます。':error.code===3?'現在地の取得がタイムアウトしました。もう一度お試しください。':'現在地を取得できませんでした。');},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  });
  const onVisibility=()=>{if(document.hidden)stopLocation();};document.addEventListener('visibilitychange',onVisibility);
  const expiry=setInterval(()=>{if(locationTime&&Date.now()-locationTime>60000)stopLocation('自分の現在地の更新が止まったため、表示を消しました。');},1000);
  requestAnimationFrame(()=>{if(!disposed){map.resize();arrangeLabels();}});
  return {stopViewing(){stopLocation();},updateSummary,updatePosition(next){sharedPosition=next;shared.setLngLat([next.longitude,next.latitude]);positionBubble();arrangeLabels();},remove(){clearLocation();disposed=true;clearInterval(expiry);themeObserver.disconnect();document.removeEventListener('visibilitychange',onVisibility);map.remove();}};
}
