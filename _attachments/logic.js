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
      alert(status+": "+statusText+" - "+errorText);
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
      };
    };
  })(file);
  
  reader.readAsText(file);
  //refreshDatasets();
};

function removeDb(dbname){
  if(confirm("Do you really want to remove the database "+dbname+"?")){
    $.couch.db(dbname).drop();
    refreshDatasets();
  };
};

function selectDb(dbname){
  settings.compdb = dbname;
  updateInfobar();
};

function removeCategory(viewname){
  console.log(viewname);
  $db_osm.allApps({eachApp: function(appName, appPath, ddoc){
    if(appName==appname){
      var spatialviews = ddoc.spatial;
      //console.log(viewname);
      delete spatialviews[viewname];
      ddoc.spatial = spatialviews;
      $db_osm.saveDoc(ddoc, {
        success: function(data){
          refreshViews();
        },
        error: function(status,statusText,errorText){
          alert(status+": "+statusText+" - "+errorText);
        }
      });
    };
  }});
};

function selectCategory(categoryname){
  settings.compview = categoryname;
  updateInfobar();
};

function uploadCategoryToDb(viewname,view){
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
          alert("Selection is initialized - this may take some time");
        },
        error: function(status,statusText,errorText){
          alert(status+": "+statusText+" - "+errorText);
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
      alert(status+": "+statusText+" - "+errorText);
    }
  });
};



function removeBoundary(boundaryId){
  $db_osm.openDoc(boundaryId, {
    success: function(data){
      $db_osm.removeDoc(data, {
        success: function(data){
          //console.log(data);
          refreshSearchPolygons();
        },
        error: function(status,statusText,errorText){
          alert(status+": "+statusText+" - "+errorText);
        }
      });
    },
    error: function(status,statusText,errorText){
      alert(status+": "+statusText+" - "+errorText);
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
  while(i<arrayMatchingArea.length){
    if(i != 0){
      bboxquery += ",";
    };
    bboxquery += arrayMatchingArea[i].toFixed(5);
    bboxquery += "+"
    i++;
    bboxquery += arrayMatchingArea[i].toFixed(5);
    i++;
  };
  bboxquery += ","+arrayMatchingArea[0].toFixed(5)+"+"+arrayMatchingArea[1].toFixed(5);
  bboxquery += "))";
  var checkarray = mod_database.requestPoints($db_osm.name,settings.compview,bboxquery);
  return(checkarray);
};

function startMatch(){
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
  $("#processmonitor_process_bar").show();
  $("#stats-view").hide();
  $("#export-links").hide();
  clearLayer(hitLayer);
  clearLayer(missLayer);
  clearLayer(checkdataLayer);
  clearLayer(otherLayer);
  mod_m_simple.start(gjson, settings);
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
  // delete a possibly already existing resutls-database
  $.couch.db("resultsdb").drop();
  mod_database.createDatabase( "resultsdb", gjson);
  createDiagrams(matchResults);
  refreshExport();
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


