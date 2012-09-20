function(doc) {
    if(doc.type && doc.geometry && doc.properties) {
        if(doc.type == 'Feature' && doc.properties.tags){
            if( (doc.geometry.type == "Point" || doc.geometry.type == "LineString") && doc.properties.tags.amenity){
                var checkval = doc.properties.tags.amenity;
                if( checkval == "restaurant" || checkval == "fast_food" ){
                    emit(doc.geometry, doc);
}}}}}
