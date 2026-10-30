const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};
export const preferredBasemap=()=>read('presence-basemap')==='satellite'?'satellite':'map';
export function mapSettingsControl({onBasemapChange,onThemeChange,canSatellite=true}){
 let node,appearance,basemap,observer;
 const sync=()=>{if(appearance)appearance.value=document.documentElement.classList.contains('dark')?'dark':'light';};
 const storage=e=>{if(e.key==='appearance'){
   const dark=read('appearance')==='dark'||read('appearance')===null&&matchMedia('(prefers-color-scheme: dark)').matches;
   document.documentElement.classList.toggle('dark',dark);sync();onThemeChange?.();
  }else if(e.key==='presence-basemap'){basemap.value=preferredBasemap();onBasemapChange(basemap.value);}};
 return {onAdd(){
  node=document.createElement('div');node.className='maplibregl-ctrl tt-map-settings';
  function select(label,options){const select=document.createElement('select');select.setAttribute('aria-label',label);select.title=label;for(const [value,text] of options)select.append(Object.assign(document.createElement('option'),{value,textContent:text}));node.append(select);return select;}
  basemap=select('背景地図',[['map','通常地図'],...(canSatellite?[['satellite','衛星写真']]:[])]);basemap.value=canSatellite?preferredBasemap():'map';basemap.onchange=()=>{try{localStorage.setItem('presence-basemap',basemap.value);}catch{}onBasemapChange(basemap.value);};
  appearance=select('配色',[['light','ライト'],['dark','ダーク']]);sync();appearance.onchange=()=>{try{localStorage.setItem('appearance',appearance.value);}catch{}document.documentElement.classList.toggle('dark',appearance.value==='dark');onThemeChange?.();};
  observer=new MutationObserver(sync);observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});window.addEventListener('storage',storage);return node;
 },onRemove(){observer?.disconnect();window.removeEventListener('storage',storage);node?.remove();}};
}
