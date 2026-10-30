import {lagunaSpots} from './spots.js';
const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};

export function validMapArea(area){
  if(!area||typeof area.latitude!=='number'||!Number.isFinite(area.latitude)||Math.abs(area.latitude)>90||typeof area.longitude!=='number'||!Number.isFinite(area.longitude)||Math.abs(area.longitude)>180||!Number.isInteger(area.radius)||area.radius<50||area.radius>5000)return null;
  return {latitude:area.latitude,longitude:area.longitude,radius:area.radius};
}

export function createPresenceMap(host,{L,position,eventSlug,allowedArea,maptilerKey=document.querySelector('meta[name="timetable-maptiler-key"]')?.content.trim()||''}){
  let disposed=false,watch=null,locationRevision=0,userMarker=null,userAccuracy=null,locationTime=0;
  const node=el('div',undefined,'tt-presence-map');node.setAttribute('role','region');node.setAttribute('aria-label','共有中の位置・撮影Spot・自分の現在地');host.append(node);
  const map=L.map(node,{scrollWheelZoom:false,zoomControl:true});
  const area=validMapArea(allowedArea);
  if(area){map.fitBounds(L.latLng(area.latitude,area.longitude).toBounds(area.radius*2),{padding:[16,16],maxZoom:18,animate:false});}
  else map.setView([position.latitude,position.longitude],17);
  const osmAttribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>';
  let baseLayer=null,baseTheme='';
  node.dataset.mapProvider=maptilerKey?'maptiler':'osm';
  function applyTheme(){
    const next=document.documentElement.classList.contains('dark')?'dark':'light';node.dataset.mapTheme=next;
    // Swap only the basemap; preserve Spots, shared position, viewer position and zoom.
    if(baseLayer&&(!maptilerKey||baseTheme===next))return;
    if(baseLayer)map.removeLayer(baseLayer);
    const url=maptilerKey?`https://api.maptiler.com/maps/dataviz-v4-${next}/256/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(maptilerKey)}`:'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    baseLayer=L.tileLayer(url,{className:'tt-presence-base-tiles',maxZoom:19,attribution:(maptilerKey?'&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer">MapTiler</a> | ':'')+osmAttribution}).addTo(map);baseTheme=next;
  }
  const themeObserver=new MutationObserver(applyTheme);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});applyTheme();
  let sharedAccuracy=null;
  function updateAccuracy(next){if(sharedAccuracy)map.removeLayer(sharedAccuracy);sharedAccuracy=next.accuracy?L.circle([next.latitude,next.longitude],{radius:next.accuracy,color:'#00877f',weight:1,fillOpacity:.08,interactive:false}).addTo(map):null;}
  updateAccuracy(position);
  const shared=L.circleMarker([position.latitude,position.longitude],{radius:9,color:'#fff',weight:3,fillColor:'#00877f',fillOpacity:1,className:'tt-presence-shared-marker'}).addTo(map);
  shared.bindTooltip(el('span','公開中の位置'),{direction:'top'});
  const spots=eventSlug?.startsWith('lagcos-')?lagunaSpots:[];
  const markers=[];
  for(const spot of spots){
    const marker=L.circleMarker([spot.latitude,spot.longitude],{radius:5,color:'#fff',weight:2,fillColor:'#ae650e',fillOpacity:1,className:'tt-presence-spot-marker'}).addTo(map);
    const label=el('span',spot.name);
    marker.bindTooltip(label,{permanent:true,direction:'right',offset:[8,0],className:'tt-presence-spot-label'});
    const popup=el('div');popup.append(el('strong',spot.name));
    marker.bindPopup(popup);markers.push({spot,marker});
  }
  // Keep every Spot marker available; show as many labels as fit without overlaps.
  function arrangeLabels(){
    const occupied=[];
    for(const {marker} of [...markers].reverse()){
      const tooltip=marker.getTooltip(),element=tooltip?.getElement();if(!element)continue;
      const p=map.latLngToContainerPoint(marker.getLatLng()),w=element.offsetWidth,h=element.offsetHeight;
      const bounds={left:p.x+12,right:p.x+12+w,top:p.y-h/2-3,bottom:p.y+h/2+3};
      const visible=bounds.left>=0&&bounds.right<node.clientWidth&&bounds.top>=0&&bounds.bottom<node.clientHeight-24&&!occupied.some(b=>bounds.left<b.right&&bounds.right>b.left&&bounds.top<b.bottom&&bounds.bottom>b.top);
      element.style.visibility=visible?'visible':'hidden';if(visible)occupied.push(bounds);
    }
  }
  map.on('zoomend moveend resize',arrangeLabels);
  const locate=el('button',undefined,'tt-presence-locate');locate.type='button';locate.setAttribute('aria-label','自分の現在地を表示');locate.title='自分の現在地を表示';locate.setAttribute('aria-pressed','false');
  locate.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22"/></svg>';
  const locationControl=L.control({position:'topright'});locationControl.onAdd=()=>{const box=el('div',undefined,'leaflet-bar tt-presence-location-control');box.append(locate);L.DomEvent.disableClickPropagation(box);L.DomEvent.disableScrollPropagation(box);return box;};locationControl.addTo(map);
  const feedback=el('p',undefined,'tt-presence-geolocation-feedback');feedback.hidden=true;feedback.setAttribute('role','status');host.append(feedback);
  function clearLocation(){
    locationRevision++;if(watch!==null){navigator.geolocation?.clearWatch(watch);watch=null;}
    if(userMarker){map.removeLayer(userMarker);userMarker=null;}if(userAccuracy){map.removeLayer(userAccuracy);userAccuracy=null;}
    locationTime=0;locate.setAttribute('aria-pressed','false');locate.removeAttribute('aria-busy');locate.setAttribute('aria-label','自分の現在地を表示');locate.title='自分の現在地を表示';
  }
  function stopLocation(message=''){clearLocation();feedback.textContent=message;feedback.hidden=!message;}
  locate.addEventListener('click',()=>{
    if(watch!==null){stopLocation();return;}
    if(!navigator.geolocation){feedback.textContent='このブラウザは現在地の取得に対応していません。';feedback.hidden=false;return;}
    clearLocation();const revision=locationRevision;let first=true;
    locate.setAttribute('aria-pressed','true');locate.setAttribute('aria-busy','true');locate.setAttribute('aria-label','自分の現在地を消す');locate.title='自分の現在地を消す';feedback.textContent='';feedback.hidden=true;
    watch=navigator.geolocation.watchPosition(result=>{
      if(disposed||revision!==locationRevision)return;
      const {latitude,longitude,accuracy}=result.coords;
      if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180||!Number.isFinite(result.timestamp)||Date.now()-result.timestamp>60000){stopLocation('新しい現在地を取得できませんでした。もう一度お試しください。');return;}
      locationTime=result.timestamp;
      const point=[latitude,longitude];
      if(userMarker)userMarker.setLatLng(point);else userMarker=L.circleMarker(point,{radius:8,color:'#fff',weight:3,fillColor:'#2563eb',fillOpacity:1,className:'tt-presence-self-marker'}).addTo(map).bindTooltip(el('span','自分の現在地'),{permanent:true,direction:'top',className:'tt-presence-self-label'});
      if(userAccuracy){map.removeLayer(userAccuracy);userAccuracy=null;}
      if(Number.isFinite(accuracy)&&accuracy>0)userAccuracy=L.circle(point,{radius:Math.min(accuracy,5000),color:'#2563eb',weight:1,fillOpacity:.07,interactive:false}).addTo(map);
      if(first){map.fitBounds(L.latLngBounds([shared.getLatLng(),point]),{padding:[35,35],maxZoom:17,animate:false});first=false;}
      locate.removeAttribute('aria-busy');feedback.textContent='';feedback.hidden=true;
    },error=>{if(!disposed&&revision===locationRevision)stopLocation(error.code===1?'位置情報の利用が許可されていません。ブラウザの設定から許可できます。':error.code===3?'現在地の取得がタイムアウトしました。もう一度お試しください。':'現在地を取得できませんでした。通信状況や位置情報の設定を確認してください。');},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  });
  function onVisibility(){if(document.hidden)stopLocation();}
  document.addEventListener('visibilitychange',onVisibility);
  const expiry=setInterval(()=>{if(locationTime&&Date.now()-locationTime>60000)stopLocation('自分の現在地の更新が止まったため、表示を消しました。');},1000);
  requestAnimationFrame(()=>{if(!disposed){map.invalidateSize({pan:false});arrangeLabels();}});
  return {stopViewing(){stopLocation();},updatePosition(next){shared.setLatLng([next.latitude,next.longitude]);updateAccuracy(next);},remove(){disposed=true;clearInterval(expiry);clearLocation();themeObserver.disconnect();document.removeEventListener('visibilitychange',onVisibility);map.remove();}};
}
