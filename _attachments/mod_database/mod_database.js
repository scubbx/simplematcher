/* This file is part of the master-thesis
 * "A Web-Based System for Comparative Analysis of OpenStreetMap
 * Data by the use of CouchDB" by Markus Mayr.
 * 
 * This module is about handling operations of databases like creating
 * new comparative ones.
 * 
 * 
 * MODULE INTERFACE:
 * - createDatabase 
 * - requestPoints
 * - getDocCountInDb
 * 
 *  */

var mod_database = (function() {
  return{
    // create an new database and fill it with the content of gjsonData
    createDatabase : function(dbname,gjsonData){
      // this will only work if there is no authentication necessary
      
      // create a new database
      $.couch.db(dbname).create({
        error: function(status,statusText,errorText) { alert(status+": "+statusText+" - "+errorText); },
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
              refreshDatasets();   // this function is not defined in mod_database, but in the web application !
            },
            error: function(status,statusText,errorText) { alert(status+": "+statusText+" - "+errorText); }
          }); //bulkSave
        } //create - success
      }); //$.couch.db(dbname).create
    }, //createDatabase
    
    // gets all entries inside a given geometry search area from a database
    requestPoints: function(dbname,viewname,bboxquery){
      var results;
      var query = "http://"+location.host+"/"+dbname+"/_design/"+appname+"/_spatial/"+viewname;
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
    
    /*
    getDocCountInDb: function(dbname,spatialviewname){
      var query = "http://"+location.host+"/"+dbname+"/_spatial/"+spatialviewname+"?count=true";
      var request = createAJAX();
      request.open("GET", query,false);
      request.send(null);
      var results = request.responseText;
      delete request;
      return(results.count);
    } //getDocCountInDb
    */

  }; //return

  // creates an AJAX object
  function createAJAX() {
    return new XMLHttpRequest();
  };
  
  // creates a design document containing lists and views for further access by the web application
  function createSpatialViewsLists($db){
    // define the spatial views
    var spatialviews = {};
    spatialviews.simple = "function(doc){if(doc.geometry){emit(doc.geometry,doc);};};";
    spatialviews.hit = "function(doc){if(doc.layer){if(doc.layer=='hit'){emit(doc.geometry,doc);};};};";
    spatialviews.hitc = "function(doc){if(doc.layer){if(doc.layer=='hitc'){emit(doc.geometry,doc);};};};";
    spatialviews.miss = "function(doc){if(doc.layer){if(doc.layer=='miss'){emit(doc.geometry,doc);};};};";
    
    // define the lists
    var lists = {}; 
    // define the list function and convert it to a string to upload it as part of the design document to the database
    lists.all = function(head,req){
      start({'headers': {'content-type': 'text/comma-separated-values','Content-Disposition':'filename="'+req.query.key+'.csv"'} });
      if(req.query.key=="miss"){
        send("x,y,id,typ\n");
      }else{
        send("x,y,id,partnerid,distance,typ\n");
      };
      while (row = getRow() ){
        if(row.value.geometry.type == 'LineString'){
          var coor = row.value.geometry.coordinates[0];
        }else if(row.value.geometry.type == 'Polygon'){
          var coor = row.value.geometry.coordinates[0][0];
        }else if(row.value.geometry.type == 'Point'){
          var coor = row.value.geometry.coordinates;
        };
        if(req.query.key=="miss"){
          send(coor[0].toFixed(8)+","+coor[1].toFixed(8)+",'"+row.value._id+"','"+row.value.layer+"'\n");
        }else{
          send(coor[0].toFixed(8)+","+coor[1].toFixed(8)+",'"+row.value._id+"','"+row.value.partnerId+"',"+row.value.checkdistance.toFixed(8)+",'"+row.value.layer+"'\n");
        };
      };
    };
    lists.all = lists.all.toString();
    
    // define the views
    var views = {};
    views.simple = {};
    views.simple.map = "function(doc){emit(doc.layer, doc);}";
    
    // compile the final design document containing the above views, lists and spatial views
    var newdoc = {"_id":"_design/"+appname,"spatial":spatialviews,"lists":lists,"views":views,language:"javascript"};
    // save the new design document
    $db.saveDoc(newdoc, {
      success: function(data){
        console.log(data);
      },
      error: function(status,statusText,errorText){
        alert(status+": "+statusText+" - "+errorText);
      }
    });
  }; //createSpatialViewsLists
  
})();
