export function visibleVenuePoint(point,zoom,places){
  if(point.level==='area')return zoom<(point.detailZoom??17.5);
  const parent=point.areaId&&places.find(p=>p.id===point.areaId&&p.level==='area');
  return !parent||zoom>=(parent.detailZoom??17.5);
}
