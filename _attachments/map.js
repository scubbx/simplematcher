// initialize the map view and initialize the OSM background tiles
function initOpenLayers(){
  // map event listeners
  function mapLayerChanged(event){
    updateLegal("compinmap:"+compLayer.visibility);
  };
  
  map = new OpenLayers.Map("map",{
    eventListeners: {
      "changelayer": mapLayerChanged
    }
  });
  var backlayer = new OpenLayers.Layer.OSM();
  backlayer.setOpacity(0.5);
  map.addLayer(backlayer);
  WGS = new OpenLayers.Projection("EPSG:4326");   // Transform from WGS 1984
  OSMProjection   = new OpenLayers.Projection("EPSG:900913"); // to Spherical Mercator Projection
  geojsonFormat = new OpenLayers.Format.GeoJSON({ 'externalProjection': WGS, 'internalProjection': OSMProjection});
  
  map.addControl(new OpenLayers.Control.LayerSwitcher({'ascending':false}));
  map.setCenter(new OpenLayers.LonLat(16.348, 48.208).transform( WGS, OSMProjection),14);
  
  // define how the layers will be styled
  var hitStyleMap = new OpenLayers.StyleMap({ 'pointRadius': 4, 'fillColor': 'red', 'strokeWidth' : 0.3 });
  var missStyleMap = new OpenLayers.StyleMap({ 'pointRadius': 4, 'fillColor': 'blue', 'strokeWidth' : 0.3 });
  var otherStyleMap = new OpenLayers.StyleMap({ 'pointRadius': 4, 'fillColor': 'yellow', 'fillOpacity': 1, 'strokeColor' : 'black', 'strokeWidth' : 0.3 });
  var checkdataStyleMap = new OpenLayers.StyleMap({ 'pointRadius': 4, 'fillOpacity': 0, 'strokeColor' : 'black', 'strokeWidth' : 0.3 });
  var compStyleMap = new OpenLayers.StyleMap({ 'pointRadius': 4, 'fillColor': 'black', 'fillOpacity': 1, 'strokeColor' : 'black', 'strokeWidth' : 0.3 });
  //var previewStyleMap = new OpenLayers.StyleMap({ 'pointRadius': 4, 'fillColor': 'yellow', 'fillOpacity': 1, 'strokeColor' : 'black', 'strokeWidth' : 0.3 });
  
  // create the different layers
  hitLayer = new OpenLayers.Layer.Vector("Hit",{styleMap: hitStyleMap}); 
  missLayer = new OpenLayers.Layer.Vector("Miss",{styleMap: missStyleMap});
  checkdataLayer = new OpenLayers.Layer.Vector("Detailed Check Data",{styleMap: checkdataStyleMap});
  compLayer = new OpenLayers.Layer.Vector("Comparative Data",{styleMap: compStyleMap}); 
  otherLayer = new OpenLayers.Layer.Vector("Other",{styleMap: otherStyleMap});
  previewLayer = new OpenLayers.Layer.Vector("Preview",{displayInLayerSwitcher:false});
  
  // add the previously created layers to the map
  map.addLayer(hitLayer);
  map.addLayer(missLayer);
  map.addLayer(checkdataLayer);
  map.addLayer(compLayer);
  map.addLayer(otherLayer);
  map.addLayer(previewLayer); // this layer is for previews
};

function clearLayer(layerobject){
  layerobject.removeAllFeatures();
};


// request all data from the comparative dataset in the specified area and show it on the map
function updateCompPreview(){
  var query = "http://"+location.host+"/"+settings.compdb+"/_design/"+appname+"/_spatial/simple";
  // build the query polygon from geoJSON cooridinates
  var spatial = "?geometry=POLYGON((";
  for(var i=0;i<settings.matchingArea.length;i++){
    var point = settings.matchingArea[i];
    spatial += ( point[0].toFixed(5) + "+" );
    spatial += point[1].toFixed(5);
    if( i != (settings.matchingArea.length-1) ) {
      spatial += ",";
    };
  };
  spatial += "))";
  $.getJSON(query+spatial, function(data){
    console.log(data);
    // storing the number of points in the comparative dataset area
    settings.compcount=data.rows.length;
    var featureArray = [];
    for(var i=0;i<data.rows.length;i++){
      featureArray.push(data.rows[i].value);
    };
    clearLayer(compLayer);
    gjsonToMap({type:"FeatureCollection","features":featureArray,layer:"compdata"});
  });
};


function displayGjsonFromDb(id){
  $db_osm.openDoc(id, {
    success: function(data){
      data.type = "Feature";
      data.layer = "preview";
      clearLayer(previewLayer);
      gjsonToMap(data);
    },
    error: function(status){
      alert(status);
    }
  });
};



function gjsonToMap(gjson){
  if (gjson.layer == "hit") {
    hitLayer.addFeatures(geojsonFormat.read(gjson));
  } else if (gjson.layer == "miss"){
    missLayer.addFeatures(geojsonFormat.read(gjson));
  } else if (gjson.layer == "checkdata"){
    checkdataLayer.addFeatures(geojsonFormat.read(gjson));
  } else if (gjson.layer == "compdata"){
    compLayer.addFeatures(geojsonFormat.read(gjson));
  } else if (gjson.layer == "preview"){
    previewLayer.addFeatures(geojsonFormat.read(gjson))
  } else {
    otherLayer.addFeatures(geojsonFormat.read(gjson));
  };
};
