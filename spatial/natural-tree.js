function(doc) {
    if(doc.type && doc.geometry && doc.properties) {
        if(doc.type == 'Feature' && doc.properties.tags){
            if( (doc.geometry.type == "Point" || doc.geometry.type == "LineString") && doc.properties.tags.natural){
                var checkval = doc.properties.tags.natural;
                if( checkval == "tree" || checkval == "Tree" ){
                    emit(doc.geometry, doc);
}}}}}
