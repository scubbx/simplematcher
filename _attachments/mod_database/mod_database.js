/* This file is part of the master-thesis
 * "xxx".
 * 
 * This module is about handling operations of databases like creating
 * new comparative ones.
 * 
 * REQUIREMENTS:
 * - 
 * 
 * MODULE INTERFACE:
 * - createDatabase 
 * 
 *  */

var mod_database = (function() {
  return{
    // create an new database and fill it with the content of gjsonData
    createDatabase : function(dbname,gjsonData){
      // create the database - this will only work if there is no authentication
      // necessary
      $.couch.db(dbname).create({
        error: function(status) { alert(status); return(0); },
        success: function(data) {
          var $db = $.couch.db(dbname);
          console.log(gjsonData);
          // make sure the data is an array of GeoJSON features
          if(gjsonData.type == "FeatureCollection"){
            console.log("got FeatureCollection");
            var gjsonArray = gjsonData.features;
          } else if(gjsonData.type == "Feature"){
            console.log("got Feature");
            var gjsonArray = [gjsonData];
          } else {
            console.log("got: "+gjsonData.type);
            alert("Unsupported GeoJSON type: "+gjsonData.type);
            return(0);
          };
          
          // fill this database with content
          $db.bulkSave({docs:gjsonArray}, {
            success: function(data){
              //alert("uploaded "+data.length+" features");
              createSpatialViewsLists($db);
            },
            error: function(status) {
              alert(status);
            }
          }); //bulkSave
        } //create - success
      }); //$.couch.db(dbname).create
    }, //createDatabase
    
    requestPoints: function(dbname,viewname,bboxquery){
      var results;
      var query = "http://"+location.host+"/"+dbname+"/_design/"+appname+"/_spatial/"+viewname;
      console.log(query);
      var request = createAJAX();
      request.open("GET", query+"?geometry="+bboxquery, false);
      request.send(null);
      var results = request.responseText;
      delete request;
      results = JSON.parse(results).rows;
      var cleanresults = [];
      for(var i=0;i<results.length;i++){
        cleanresults.push(results[i].value);
      };
      return(cleanresults);
      
    }, //requestPoints
    
    getDocCountInDb: function(dbname,spatialviewname){
      var query = "http://"+location.host+"/"+dbname+"/_spatial/"+spatialviewname+"?count=true";
      var request = createAJAX();
      request.open("GET", query,false);
      request.send(null);
      var results = request.responseText;
      delete request;
      return(results.count);
    } //getDocCountInDb


  }; //return

  // creates an AJAX object
  function createAJAX() {
    return new XMLHttpRequest();
  };
  
  function createSpatialViewsLists($db){
    var spatialviews = {};
    spatialviews.simple = "function(doc){if(doc.geometry){emit(doc.geometry,doc);};};";
    spatialviews.hit = "function(doc){if(doc.layer){if(doc.layer=='hit'){emit(doc.geometry,doc);};};};";
    spatialviews.hitc = "function(doc){if(doc.layer){if(doc.layer=='hitc'){emit(doc.geometry,doc);};};};";
    spatialviews.miss = "function(doc){if(doc.layer){if(doc.layer=='miss'){emit(doc.geometry,doc);};};};";
    
    var lists = {}; 
    lists.all = function(head,req){
      start({'headers': {'content-type': 'text/comma-separated-values','Content-Disposition':'filename="'+req.query.key+'.csv"'} });
      send("x,y,id,distance,typ\n");
      while (row = getRow() ){
        if(row.value.geometry.type == 'LineString'){
          var coor = row.value.geometry.coordinates[0];
        }else if(row.value.geometry.type == 'Polygon'){
          var coor = row.value.geometry.coordinates[0][0];
        }else if(row.value.geometry.type == 'Point'){
          var coor = row.value.geometry.coordinates;
        };
        send(coor[0]+","+coor[1]+",'"+row.value._id+"',"+row.value.checkdistance+",'"+row.value.layer+"'\n");
      };
    };
    lists.all = lists.all.toString();
    
    var views = {};
    views.simple = {};
    views.simple.map = "function(doc){emit(doc.layer, doc);}";
  
    var newdoc = {"_id":"_design/"+appname,"spatial":spatialviews,"lists":lists,"views":views};
    $db.saveDoc(newdoc, {
      success: function(data){
        console.log(data);
      },
      error: function(status){
        alert(status);
      }
    });
  };
  
})();
