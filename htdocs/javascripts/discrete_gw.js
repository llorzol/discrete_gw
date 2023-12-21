/* NwisWeb Javascript plotting library for jQuery and flot.
 *
 * Main is a JavaScript library to graph NwisWeb groundwater information
 * such as the discrete groundwater measurements for a site(s).
 *
 * version 1.20
 * August 16, 2021
 */

/*
###############################################################################
# Copyright (c) Oregon Water Science Center
# 
# Permission is hereby granted, free of charge, to any person obtaining a
# copy of this software and associated documentation files (the "Software"),
# to deal in the Software without restriction, including without limitation
# the rights to use, copy, modify, merge, publish, distribute, sublicense,
# and/or sell copies of the Software, and to permit persons to whom the
# Software is furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included
# in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
# OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
# THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
# FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
# DEALINGS IN THE SOFTWARE.
###############################################################################
*/

var agency_cd;
var site_id;
var site_no;
var coop_site_no;
var station_nm;
var site_key;

var myGwData;

var aboutFiles     = {
                      "welcome" :              "graph_welcome.txt",
                      "graphFeatures" :        "graphFeatures.txt",
                      "contacts" :             "contacts.txt"
                     };
                
var message = "Incorrectly formatted USGS site number or OWRD well log ID or CDWR well number: ";
message    += "You must use the USGS station numbers, which are a number ";
message    += "from 8 to 15 digits long. ";
message    += "You must use the OWRD well log ID, which has a four-character county abbrevation ";
message    += "along with from 1 to 7 digit well number. ";
message    += "You must use the CDWR well numbers, which are 18-character string well number. ";

// Prepare when the DOM is ready 
//
$(document).ready(function()
 {
   // Nav Bar help tooltips
   //
   setHelpTip("#aboutHelp", "Click this for information about this web site.", "right");
   setHelpTip("#projectHelp", "Click this to display links to other important web pages.", "bottom");
   setHelpTip("#downloadHelp", "Click to download groundwater measurement records.", "bottom");
      
   $("#graphs").hide();
   $("#footer").show();
   $('#enableTooltip').prop('checked',true);
   //console.log("callGwService");

    // Parse
    //-------------------------------------------------
   site_id      = "";
   site_no      = "";
   coop_site_no = "";
   cdwr_id      = "";

   site_id      = jQuery.url.param("site_id");
   site_no      = jQuery.url.param("site_no");
   coop_site_no = jQuery.url.param("coop_site_no");
   cdwr_id      = jQuery.url.param("cdwr_id");
   station_nm   = jQuery.url.param("station_nm");
   //alert("callGwService " + site_no + " " + coop_site_no);

   if(typeof site_no !== "undefined")
     {
      callGwService("site_no", site_no);
      site_key = site_no;
     }

   if(typeof site_id !== "undefined")
     {
      site_id = checkSiteId(site_id)
         console.log("site_id " + site_id);
         if(site_id) { callGwService("site_id", site_id); }
         else { openModal(message); fadeModal(10000); }
     }

   if(typeof coop_site_no !== "undefined")
     {
      callGwService("coop_site_no", coop_site_no);
      site_key = coop_site_no.replace(/\s+/,"_",6);
     }

   if(typeof cdwr_id !== "undefined")
     {
      callGwService("cdwr_id", cdwr_id);
      site_key = cdwr_id;
     }
});

function checkSiteNo(site_no) {

    if(typeof site_no === "undefined")
      {
        var message = "Incorrectly formatted USGS site number: ";
        message    += "You must use the USGS station numbers, which are a number ";
        message    += "from 8 to 15 digits long. ";
        openModal(message);
        fadeModal(10000)
        return false;
      }
    //site_no  = site_no.trim();
    site_no  = site_no.replace(/^\s+|\s+$/g,'');
    var myRe = /^(\d{8,15})$/g;
    if(!myRe.test(site_no))
      {
        var message = "Incorrectly formatted USGS site number: ";
        message    += "You must use the USGS station numbers, which are a number ";
        message    += "from 8 to 15 digits long. ";
        openModal(message);
        fadeModal(10000)
        return false;
      }

    return site_no;
}

function checkSiteId(site_id) {
                
    if(typeof site_id === "undefined")
      {
        openModal(message);
        fadeModal(10000)
        return null;
      }
                
    site_id  = site_id.trim();

    // Test for USGS site number
    //
    var myRe = /^(\d{8,15})$/g;
    if(myRe.test(site_id))
      {
        return site_id;
      }

    // Test for OWRD well log ID
    //
    var myRe = /^([a-z]{4}){1}\s*(\d+)$/i;
    if(myRe.test(site_id))
      {
        var countyNam  = site_id.substring(0,4).toUpperCase();
        //console.log("countyNam_id " + countyNam);
        var wellId     = site_id.substring(4).trim();
        //console.log("wellId_id " + wellId);
        var site_id    = countyNam + ('0000000' + wellId).slice(-7);
        return site_id;
      }
                   
    // Test for CDWR well number
    //
    var myRe = /^([a-z0-9]{18})$/i;
    if(myRe.test(site_id))
      {
        return site_id;
      }
                   
    // Return
    //
    openModal(message);
    fadeModal(10000)
               
    return null;
}