function(doc) {
    if(doc.type && doc.geometry) {
        if(doc.type == 'SearchPolygon'){
          emit(doc.properties.name, doc);
}}}
