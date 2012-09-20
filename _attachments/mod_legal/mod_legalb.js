/* This file is part of the master-thesis
 * "xxx".
 * 
 * This module gives recommendations on what is allowed with certain
 * results. The input has to be some properties describing the data and
 * their circumstances.
 * 
 * REQUIREMENTS:
 * - settings.privateMode
 * - settings.comparativeDbOdblCompatibe
 * - settings.comparativeInResult
 * 
 * MODULE INTERFACE:
 * - allowMapCopy()
 * - allowResultDistribution()
 * - allowStatCopy()
 * 
 *  */

var mod_legal = (function() {
  return{
    // using the map resulting from the analysis
    allowMapCopy : function(settings){
      if(settings.privateMode){
        return(true);
      };
      if(settings.comparativeDbOdblCompatible){
        return(true);
      };
      return(false);
    }, //allowMapCopy
    
    // using the data-results of the analysis
    allowResultDistribution : function(settings){
      if(settings.privateMode){
        return(true);
      };
      if (settings.comparativeInResult){
        if(settings.comparativeDbOdblCompatible){
          return(true);
        } else {
          return(false);
        };
      } else {
        return(true);
      };
    }, //allowResultDistribution
    
    // using visual statistics resulting from the analysis
    allowStatCopy : function(settings){
      if(settings.privateMode){
        return(true);
      } else {
        if(settings.comparativeDbOdblCompatible){
          return(true);
        }else{
          return(false);
        };
      };
    }, //allowStatCopy
  }; //return
})();
