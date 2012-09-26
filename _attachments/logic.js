// global variables (settings)
var settings = {};
settings.searchradius = 0.000225;
settings.radiussearch = true;
settings.compdb = undefined;
settings.MatchingArea = undefined;
settings.compview = undefined;
settings.compcount = 0;

var legalsettings = {};
legalsettings.privateMode = true;
legalsettings.comparativeOdblCompatible = false;
legalsettings.comparativeInData = true;
legalsettings.comparativeInMap = true;
legalsettings.comparativeInDiagram = false;

var datas = {};
var matchRunning = false;
var appname = "simplematcher";
//var databasename = "simplematcher";
var databasename = getDbNameFromLocation();
var map;

$(function() {
  $db_osm = $.couch.db(databasename);
  initJQueryUi();
  initOpenLayers();
  settings.matchingArea = [];
  
  refreshDatasets();
  refreshViews();
  refreshSearchPolygons();
  refreshLegal();
  
  updateInfobar();
  $("#stats-view").hide();
  
});


function getEmptyGeoJSON(gjsontype){
  return({type:"Feature",properties:{},geometry:{type:gjsontype,coordinates:[]}});
};

// this function only works as long as location.pathname contains the name of the database
function getDbNameFromLocation(){
  var databasename = location.pathname.split("/")[1];
  return(databasename);
};

function selectMatchingArea(elementId){
  $db_osm.openDoc(elementId, {
    success: function(data){
      settings.matchingArea = data.geometry.coordinates[0];
      settings.matchingAreaName = data.properties.name;
      //console.log("selected: "+data.properties.name);
      updateInfobar();
    },
    error: function(status,statusText,errorText){
      alert(status+": "+errorText);
    }
  });
};



function uploadFileToDb(file){
  /* THIS CODE DOES NOT WORK WITH CHROMIUM
  if(file.type != "application/json"){
    alert("This file is not a JSON document");
    return(0);
  }; */
  
  var reader = new FileReader();
  reader.onload = (function(theFile) {
    return function(e){
      var upGjson = e.target.result;
      var newDbName = $("#dbnameToUpload").val();
      console.log(newDbName);
      if(newDbName != undefined){
        mod_database.createDatabase("comp_"+newDbName,JSON.parse(upGjson));
        refreshDatasets();
      };
    };
  })(file);
  
  reader.readAsText(file);
};

function removeDb(dbname){
  if(confirm("Do you really want to remove the database "+dbname+"?")){
    $.couch.db(dbname).drop();
    refreshDatasets();
  };
};

function selectDb(dbname){
  settings.compdb = dbname;
  //console.log("selected: " + settings.compdb);
  updateInfobar();
};

function removeCategory(viewname){
  console.log(viewname);
  $db_osm.allApps({eachApp: function(appName, appPath, ddoc){
    if(appName==appname){
      var spatialviews = ddoc.spatial;
      console.log(viewname);
      delete spatialviews[viewname];
      ddoc.spatial = spatialviews;
      $db_osm.saveDoc(ddoc, {
        success: function(data){
          refreshViews();
        },
        error: function(status,statusText,errorText){
          alert(status+": "+errorText);
        }
      });
    };
  }});
};

function selectCategory(categoryname){
  settings.compview = categoryname;
  //console.log("selected: " + settings.compview);
  updateInfobar();
};

function uploadCategoryToDb(viewname,view){
  //console.log(viewname);
  $db_osm.allApps({eachApp: function(appName, appPath, ddoc){
    if(appName==appname){
      var spatialviews = ddoc.spatial;
      spatialviews[viewname] = view;
      console.log(spatialviews);
      ddoc.spatial = spatialviews;
      console.log(ddoc);
      // saving the modified design document
      $db_osm.saveDoc(ddoc, {
        success: function(data){
          refreshViews();
          //alert("Selection is initialized - this may take some minutes");
        },
        error: function(status,statusText,errorText){
          alert(status+": "+errorText);
        }
      });
    };
  }});
};


function addNewBoundary(boundaryName, boundaryLineString){
  var ddoc = getEmptyGeoJSON("Polygon");
  ddoc.type = "SearchPolygon";
  ddoc.properties.name = boundaryName;
  ddoc.geometry.coordinates = eval(boundaryLineString);
  $db_osm.saveDoc(ddoc, {
    success: function(data){
      refreshSearchPolygons();
      //alert("saved");
      console.log(data);
    },
    error: function(status,statusText,errorText){
      alert(status+": "+errorText);
    }
  });
};



function removeBoundary( boundaryId){
  $db_osm.openDoc(boundaryId, {
    success: function(data){
      $db_osm.removeDoc(data, {
        success: function(data){
          console.log(data);
          refreshSearchPolygons();
        },
        error: function(status,statusText,errorText){
          alert(status+": "+errorText);
        }
      });
    }
  });
};
    
function updateRadius(radius){
  settings.searchradius = radius;
  updateInfobar();
};

function updateStatus(data){
  $('#processmonitor_title').html(data.title);
  if(data.status.length > 3) {
      $('#processmonitor_process').html(data.status);
      $("#processmonitor_process_bar").progressbar({value: 0});
      $("#processmonitor_process_bar").hide();
  }else{
      $('#processmonitor_process').html(data.status + "%");
      $("#processmonitor_process_bar").progressbar({value: data.status});
      $("#processmonitor_process_bar").show();
  };
};

function prepareCheckarray(){
  var i=0;
  var bboxquery = "POLYGON((";
  var arrayMatchingArea = eval("["+settings.matchingArea+"]");
  //console.log(arrayMatchingArea);
  while(i<arrayMatchingArea.length){
    if(i != 0){
      bboxquery += ",";
    };
    bboxquery += arrayMatchingArea[i].toFixed(5);
    bboxquery += "+"
    i++;
    bboxquery += arrayMatchingArea[i].toFixed(5);
    i++;
    //console.log(i);
  };
  bboxquery += ","+arrayMatchingArea[0].toFixed(5)+"+"+arrayMatchingArea[1].toFixed(5);
  bboxquery += "))";
  //console.log(bboxquery);
  var checkarray = mod_database.requestPoints($db_osm.name,settings.compview,bboxquery);
  return(checkarray);
};

function startMatch(){
  //console.log(matchRunning);
  if(matchRunning == true){
    alert("Match is already running.");
    return(0);
  } else {
      if(settings.compdb && settings.compview && settings.matchingArea){
        matchRunning = true;
      } else {
        alert("Define the missing parameters first.");
        return(0);
      };
  };
  var checkarray = prepareCheckarray();
  var gjson = {"type":"FeatureCollection","features":checkarray};
  settings.connectionstring = "http://"+location.host+"/"+settings.compdb+"/_design/"+appname+"/_spatial/simple";
  //console.log(settings);
  $("#processmonitor_process_bar").show();
  
  $("#stats-view").hide();
  $("#export-links").hide();
  
  clearLayer(hitLayer);
  clearLayer(missLayer);
  clearLayer(checkdataLayer);
  clearLayer(otherLayer);
  mod_m_simple.start(gjson, settings);
};

function incrementRev(rev){
  for(var i=0;i<rev.length;i++){
    if(rev[i] == "-"){
      var found = i;
      break;
    };
  };
  var num = rev.substring(0,i);
  var hash = rev.substring(i+1);
  var newrev = (parseInt(num)+1) + "-" + hash;
  return(newrev);
};

function checkFinished(matchResults){
  console.log(matchResults);
  updateStatus({title : "Matching of "+settings.matchingAreaName+" finished.", status : "Matched <b>"+matchResults.hit.length+"</b> from possible <b>"+(matchResults.hit.length+matchResults.miss.length)+" OSM points</b> / <b>"+settings.compcount+" Comp. Points</b>."});
  matchRunning = false;
  // only include the comparative data when legally possible
  if (mod_legal.allowDataCopy(legalsettings)){
    var gjson = {type:"FeatureCollection",features: matchResults.hit.concat(matchResults.miss).concat(matchResults.hitc) };
  }else{
    var gjson = {type:"FeatureCollection",features: matchResults.hit.concat(matchResults.miss) };
  };
  $.couch.db("resultsdb").drop();
  mod_database.createDatabase( "resultsdb", gjson);
  createDiagrams(matchResults);
  refreshExport();
};




function averageMinimumDistance(pointArray){
  var columni = 0;
  var columnarray = [];
  // for every row
  for(columni;columni<pointArray.length;columni++){
    console.log("Column: "+columni);
    var element = pointArray[columni];
    var rowi = 0;
    var columnsum = 0;
    for(rowi;rowi<pointArray.length;rowi++){
      // don't use the element with itself
      if(rowi != columni){
        var currentdistance = calcDistance(pointArray[columni],pointArray[rowi]);
        columnsum += currentdistance;
      };
    };
    columnarray.push(columnsum/pointArray.length);
  };

  var amd = 0;
  for(var i=0;i<columnarray.length;i++){
    amd += columnarray[i];
    amd = amd / pointArray.length;
  };
  return(amd);
};



function updateLegal(data){
  if(data=="private:no"){
    legalsettings.privateMode = false;
  };
  if(data=="private:yes"){
    legalsettings.privateMode = true;
  };
  if(data=="comp-odbl:yes"){
    legalsettings.comparativeOdblCompatible = true;
  };
  if(data=="comp-odbl:no"){
    legalsettings.comparativeOdblCompatible = false;
  };
  if(data == "compinmap:true"){
    legalsettings.comparativeInMap = true;
  };
  if(data == "compinmap:false"){
    legalsettings.comparativeInMap = false;
  };
  refreshLegal();
};




// calculates plain distance between two pairs of coordinates
function calcDistance(p1,p2){
  // convert to radiants
  lon1 = p1[0] * Math.PI / 180;
  lat1 = p1[1] * Math.PI / 180;
  lon2 = p2[0] * Math.PI / 180;
  lat2 = p2[1] * Math.PI / 180;
  
  var x = (lon2-lon1) * Math.cos((lat1+lat2)/2);
  var y = (lat2-lat1);
  // var R = 6371000; // Radius of the earth in m
  // var d = Math.sqrt(x*x + y*y) * R; // necessary if distance wanted in m
  var d = Math.sqrt(x*x + y*y)
  
  // convert radiants back to degrees
  d = d * 180 / Math.PI;
  return(d);
};




