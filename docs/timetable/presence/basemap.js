// OSM Bright (BSD-3-Clause), distributed with its license under vendor/osm-bright.
let stylePromise;
export async function brightBasemap(key,theme){
  stylePromise??=fetch(new URL('./vendor/osm-bright/style.json?v=20261030',import.meta.url)).then(async response=>{if(!response.ok)throw new Error('Basemap unavailable');return response.json();}).catch(error=>{stylePromise=null;throw error;});
  const style=structuredClone(await stylePromise),dark=theme==='dark';
  style.sources.openmaptiles.url='https://api.maptiler.com/tiles/v3-openmaptiles/tiles.json?key='+encodeURIComponent(key);
  style.sources.openmaptiles.attribution='© <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer">MapTiler</a> | © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>';
  style.glyphs='https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key='+encodeURIComponent(key);
  style.metadata={...style.metadata,'cp:basemap':'osm-bright'};
  for(const layer of style.layers){
    const paint=layer.paint||{},id=layer.id;
    if(layer.type==='background')paint['background-color']=dark?'#17212b':'#F9F9ED';
    if(layer.type==='fill'){
      if(/water/.test(id))paint['fill-color']=dark?'#23445d':'#abcee1';
      else if(/building/.test(id))paint['fill-color']=dark?'#334453':'#b7beb5';
      else if(/park|wood|grass/.test(id))paint['fill-color']=dark?'#263d32':'#c3dda5';
      else if(dark&&paint['fill-color'])paint['fill-color']='#28343e';
    }
    if(layer.type==='line'&&paint['line-color']){
      if(dark)paint['line-color']=/water/.test(id)?'#507189':/casing|boundary/.test(id)?'#1c2a35':'#56636b';
      else if(/highway|road|tunnel|bridge/.test(id))paint['line-color']=/casing/.test(id)?'#dedfce':'#fff';
    }
    if(layer.type==='symbol'&&dark){if(paint['text-color'])paint['text-color']=/water/.test(id)?'#9bc4de':'#d3dedc';if(paint['text-halo-color'])paint['text-halo-color']='#17212b';}
    layer.paint=paint;
  }
  return style;
}

const satelliteStyles=new Map();
export async function presenceBasemap(key,theme,kind='map'){
  if(kind!=='satellite')return brightBasemap(key,theme);
  if(!satelliteStyles.has(key))satelliteStyles.set(key,fetch('https://api.maptiler.com/maps/satellite/style.json?key='+encodeURIComponent(key)).then(async response=>{if(!response.ok)throw new Error('Satellite unavailable');return response.json();}).catch(error=>{satelliteStyles.delete(key);throw error;}));
  const style=structuredClone(await satelliteStyles.get(key));
  style.metadata={...style.metadata,'cp:basemap':'satellite'};
  return style;
}
