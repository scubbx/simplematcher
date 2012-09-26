function(newDocument, currentDocument, userContext){
  if(newDocument.type == 'SearchPolygon'){
    // a SearchPolygon type has to be a GeoJson with a valid polygon geometry
    if(!newDocument.geometry.coordinates[0][2]){
      throw({ forbidden:'The SearchPolygon must have a GeoJSON polygon geometry' });
    };
  };
};