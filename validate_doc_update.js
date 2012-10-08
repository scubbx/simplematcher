function(newDocument, currentDocument, userContext){
  if(newDocument.type == 'SearchPolygon'){
    // a SearchPolygon type has to be a GeoJson with a valid polygon geometry
    if(!newDocument.geometry.coordinates[0][2]){
      throw({ forbidden:'The SearchPolygon must have a GeoJSON polygon geometry' });
    };
  };
  if(newDocument.type == 'Feature'){
    // for now only allow Points and LineStrings when getting GeoJSON documents
    if(newDocument.type == 'Feature'){
      if(newDocument.geometry.type != 'Point' && newDocument.geometry.type != 'LineString'){
        throw({ forbidden:'The current implementation can only operate on Points and LineStrings'});
      };
    };
  };
};
