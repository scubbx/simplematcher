function initJQueryUi(){
  $("#accordion").accordion({autoHeight:false});
  $(".tabs").tabs();
  //$( "#radio" ).buttonset();
  $("button").button();
  $(".radios").buttonset();
  $("#processmonitor_process_bar").progressbar({value: 0});
  $("#processmonitor_process_bar").hide();

  $("#dialog-upload").dialog({  autoOpen: false,
                                  modal: true,
                                  width: 600,
                                  height: 250,
                                  buttons: {
                                    "Upload & Create Database": function() {
                                      // the jQuery method allows no access to ".files[0]"
                                      uploadFileToDb( document.getElementById("fileToUpload").files[0] );
                                      $( this ).dialog( "close" );
                                    },
                                    Cancel: function() {
                                      $( this ).dialog( "close" );
                                    }
                                  }
  });

  $("#dialog-category").dialog({  autoOpen: false,
                                  modal: true,
                                  width: 600,
                                  height: 400,
                                  buttons: {
                                    "Create new View": function() {
                                      uploadCategoryToDb( $("#viewnameToUpload").val(), $("#newCreatedView").val() )
                                      $( this ).dialog( "close" );
                                    },
                                  Cancel: function() {
                                      $( this ).dialog( "close" );
                                    }
                                  }
  });
  
  $("#dialog-boundary").dialog({  autoOpen: false,
                                  modal: true,
                                  width: 600,
                                  height: 400,
                                  buttons: {
                                    "Create new Search Boundary": function() {
                                      addNewBoundary( $("#newBoundaryName").val(), $("#newBoundaryLineString").val() )
                                      refreshSearchPolygons();
                                      $( this ).dialog( "close" );
                                    },
                                    Cancel: function() {
                                      $( this ).dialog( "close" );
                                    }
                                  }
  });

};


function refreshSearchPolygons(){
  $db_osm.view(appname+"/searchpolygons", {
      success: function(data){
        //console.log("searchPolygons are: ");
        //console.log(data);
        var outHtml = "<div id='radio_searchpolygons'>";
        // the "create from comparative dataset function is deactivated for now
        //var outHtml = "<div id='radio_searchpolygons'><input name='radio_sp' type='radio' id='sp_inputdataset' checked='checked' onclick='selectMatchingArea()' ><label for='sp_inputdataset'>Create from Comparative Dataset</label>";
        for(var i=0;i<data.rows.length;i++){
          var gjson = data.rows[i].value;
          var inputstring = "<input name='radio_sp' type='radio' id='sp_"+gjson.properties.name+"' >";
          var labelstring = "<label for='sp_"+gjson.properties.name+"' id='spl_"+gjson._id+"' onclick='selectMatchingArea( this.id.substring(4) )' onmouseout='clearLayer(previewLayer)' onmouseover='displayGjsonFromDb( this.id.substring(4) )' >"+gjson.properties.name+"</label>";
          var xinputstring = "<button id='xsp_"+gjson._id+"' onclick='removeBoundary( this.id.substring(4) );'>"+ "x" +"</button>";
          outHtml += inputstring+labelstring+"&nbsp;&nbsp;"+xinputstring+"</br>";
        };
        $("#matchareaselect").html(outHtml);
        $( "#radio_searchpolygons" ).buttonset();
      },
      error: function(status,statusText,errorText){
        alert(status+": "+errorText);
        $("#matchareaselect").html("--- no areas found ---");
      },
      reduce: false
  });
};



function refreshViews(){
  $db_osm.allApps({eachApp: function(appName, appPath, ddoc){
    var spatialViews;
    if(appName==appname){
      spatialViews = ddoc.spatial;
      var outHtml = "<div id='radio_views'>";
      for(var viewName in spatialViews){
        var inputstring = "<input name='radio_v' type='radio' id='v_"+viewName+"' onclick='selectCategory(this.id.substring(2))' >";
        var labelstring = "<label for='v_"+viewName+"' id='vl_"+viewName+"' onclick='' onmouseout='' onmouseover='' >"+viewName+"</label>";
        // don't create a delete button for the "administrative" view
        if(viewName != "administrative"){
          var xinputstring = "<button id='x_"+viewName+"' onclick='removeCategory( this.id.substring(2) );'>"+ "x" +"</button>";
        }else{
          var xinputstring = "";
        };
        outHtml += inputstring+labelstring+"&nbsp&nbsp&nbsp"+xinputstring+"<br/>";
      };
      outHtml += "</div>";
      $("#viewselect").html(outHtml);
      $( "#radio_views" ).buttonset();
      
      // add the preview-qtips
      for(var viewName in spatialViews){
        $("#vl_"+viewName).qtip({
          content: spatialViews[viewName]
        });
      };
    };
  }});
};

function refreshDatasets(){
  $.couch.allDbs({success: function(databases){
      var outHtml = "<div id='radio_comp'>";
      for(var i=0;i<databases.length;i++){
        var singledb = databases[i];
        // check if current database is a comparative one
        if(singledb.substring(0,5) == "comp_"){
          var inputstring = "<input name='radio_d' type='radio' id='"+singledb+"' onclick='selectDb( this.id );' >";
          var labelstring = "<label for='"+singledb+"' onmouseout='' onmouseover='' >"+singledb.substring(5)+"</label>";
          var xinputstring = "<button id='x_"+singledb+"' onclick='removeDb(this.id.substring(2));'>"+ "x" +"</button>";
          outHtml += inputstring+labelstring+"&nbsp&nbsp&nbsp"+xinputstring+"<br/>";
        };
      };
      
      outHtml += "</div>";
      $("#compselect").html(outHtml);
      $( "#radio_comp" ).buttonset();
    }
  });
};



function refreshExport(){
  console.log(mod_legal.allowDataCopy(legalsettings));
  if (mod_legal.allowDataCopy(legalsettings)){
    var linkbgcolor = "white";
  }else{
    var linkbgcolor = "red";
  };
  var outhtml = "";
  outhtml += '<a href="http://127.0.0.1:5984/resultsdb/_design/'+appname+'/_list/all/simple?key=%22miss%22">CSV Download of missed OSM POIs</a></br>';
  outhtml += '<a href="http://127.0.0.1:5984/resultsdb/_design/'+appname+'/_list/all/simple?key=%22hit%22">CSV Download of matched OSM POIs</a></br>';
  outhtml += '<a style="background-color:'+linkbgcolor+';" href="http://127.0.0.1:5984/resultsdb/_design/'+appname+'/_list/all/simple?key=%22hitc%22">CSV Download of matched Comparative POIs</a></br>';
  
  $("#export-links").html(outhtml);
  $("#export-links").show();
};


function refreshLegal(){
  if(legalsettings.privateMode){
    var colorprivate = "lightgreen";
  }else{
    var colorprivate = "lightgrey";
  };
  if(mod_legal.allowMapCopy(legalsettings)){
    var colormap = "lightgreen";
  }else{
    var colormap = "red";
  };
  if(mod_legal.allowDataCopy(legalsettings)){
    var colorresults = "lightgreen";
  }else{
    var colorresults = "red";
  };
  if(mod_legal.allowDiagramCopy(legalsettings)){
    var colorstats = "lightgreen";
  }else{
    var colorstats = "red";
  };
  
  var legalhtmlprivate = "Private Mode: <b><font style='background-color:"+colorprivate+";'>"+legalsettings.privateMode+"</font></b></br>";
  var legalhtmlmap = "Reuse the current map view: <b><font style='background-color:"+colormap+";'>"+mod_legal.allowMapCopy(legalsettings)+"</font></b></br>";
  var legalhtmlresults = "Reuse non OSM Results (CSV export):  <b><font style='background-color:"+colorresults+";'>"+mod_legal.allowDataCopy(legalsettings)+"</font></b></br>Reuse OSM Results (CSV export): <b><font style='background-color:lightgreen;'>true</font></b></br>";
  var legalhtmlstats = "Reuse the statistics:  <b><font style='background-color:"+colorstats+";'>"+mod_legal.allowDiagramCopy(legalsettings)+"</font></b></br>";
  if(legalsettings.privateMode){
    $("#legalinfo").html(legalhtmlprivate+"Everything is allowed.");
  }else{
    $("#legalinfo").html(legalhtmlprivate+legalhtmlmap+legalhtmlresults+legalhtmlstats);
  };
}




function createDiagrams(data){
  $("#stat_text").html("");
  
  $("#stat_mainpie").sparkline( [data.miss.length,data.hit.length] , {
    type: 'pie',
    width: '300',
    height: '300',
    sliceColors: ['#56aaff','#ff5656']
  });
  $("#stat_mainpie_c").sparkline( [(settings.compcount-data.hit.length),data.hit.length] , {
    type: 'pie',
    width: '300',
    height: '300',
    sliceColors: ['#56aaff','#ff5656']
  });
  
  // build the aggregated users list
  var usercollection = {};
  for (var i=0;i<data.hit.length;i++){
    var username = data.hit[i].properties.user;
    if(usercollection[username]){
      if(usercollection[username].hit){
        usercollection[username].hit += 1;
      }else{
        usercollection[username].hit = 1;
      };
    } else {
      usercollection[username] = {};
      usercollection[username].hit = 1;
    };
  };

  for (var i=0;i<data.miss.length;i++){
    var username = data.miss[i].properties.user;
    if(usercollection[username]){
      if(usercollection[username].miss){
        usercollection[username].miss += 1;
      }else{
        usercollection[username].miss = 1;
      };
    } else {
      usercollection[username] = {};
      usercollection[username].miss = 1;
    };
  };
  
  var baruserdata = [];
  for(user in usercollection){
    if(!usercollection[user].hit){usercollection[user].hit = 0};
    if(!usercollection[user].miss){usercollection[user].miss = 0};
    baruserdata.push([(usercollection[user].miss*-1),usercollection[user].hit])
  };
  // the tabs-tab is taken because the stats-tab has no width yet
  var barwidth = ($("#tabs-tab").width()*0.9) / (baruserdata.length+1);
  $("#stat_user").sparkline( baruserdata, {
    type: 'bar',
    height: '50',
    barWidth: barwidth,
    zeroAxis: true,
    barColor: '#ff0000'
  });
  
  $("#stats-view").show();
};



function updateInfobar(){
  if((settings.compdb) && (settings.compview) && (settings.matchingArea.length > 0) && (settings.searchradius)){
    oke = true;
    $("#infobar").css('background','lightgreen');
    updateCompPreview();
    //settings.compcount = mod_database.getDocCountInDb(settings.compdb,"simple");
  } else {
    $("#infobar").css('background','#fee');
  };
  $("#infobar").html("Dataset: <b>"+settings.compdb+"</b> &nbsp;&nbsp;&nbsp; Categories: <b>"+settings.compview+"</b> &nbsp;&nbsp;&nbsp; Area: <b>"+settings.matchingAreaName+"</b> &nbsp;&nbsp;&nbsp; Radius: <b>"+settings.searchradius+"</b>");
};

