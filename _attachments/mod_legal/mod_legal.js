/* This file is part of the master-thesis
 * "A Web-Based System for Comparative Analysis of OpenStreetMap
 * Data by the use of CouchDB" by Markus Mayr.
 * 
 * This module gives recommendations on what is allowed with certain
 * results. The input has to be some settings describing the data and
 * their circumstances.
 * 
 * REQUIREMENTS:
 * - settings.privateMode
 * - settings.comparativeOdblCompatibe
 * - settings.comparativeInMap
 * - settings.comparativeInData
 * - settings.comparativeInDiagram
 * 
 * MODULE INTERFACE:
 * - allowMapCopy()
 * - allowDataCopy()
 * - allowDiagramCopy()
 * 
 *  */

var mod_legal = (function() {
  return{
    // using the map resulting from the analysis
    allowMapCopy : function(settings){
      if(settings.privateMode){ return(true) };
      if(settings.comparativeInMap){
        if(settings.comparativeOdblCompatible){
          return(true);
        }else{ return(false); };
      }else{ return(true); };
    }, //allowMapCopy
    
    // using the data-results of the analysis
    allowDataCopy : function(settings){
      if(settings.privateMode){ return(true)};
      if(settings.comparativeInData){
        if(settings.comparativeOdblCompatible){
          return(true);
        }else{ return(false); };
      }else{ return(true); };
    }, //allowResultDistribution
    
    // using visual statistics resulting from the analysis
    allowDiagramCopy : function(settings){
      if(settings.privateMode){ return(true)};
      if(settings.comparativeInDiagram){
        if(settings.comparativeOdblCompatible){
          return(true);
        }else{ return(false);};
      }else{ return(true); };
    }, //allowStatCopy
  }; //return
})();
