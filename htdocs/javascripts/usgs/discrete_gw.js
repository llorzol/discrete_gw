/* NwisWeb Javascript plotting library for jQuery and flot.
 *
 * Main is a JavaScript library to graph NwisWeb groundwater information
 * such as the discrete groundwater measurements for a site(s).
 *
 * version 2.10
 * May 30, 2024
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
// Control for nav bar topics
//
jQuery('.noJump').click(function(e){

   // Prevent jumping to top of page
   //
   e.preventDefault();

   });

// Global
//
var agency_cd;
var site_id;
var site_no;
var coop_site_no;
var station_nm;
var site_key;

var columns = ['site', 'site_id', 'site_no', 'coop_site_no', 'cdwr_id'];

var myGwData;
                
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
   // Current url
   //-------------------------------------------------
   var url     = new URL(window.location.href);  
   //console.log("Current Url " + window.location.href);
     
   // Parse
   //-------------------------------------------------
   column       = url.searchParams.get('column');
   site         = url.searchParams.get('site');
   project      = url.searchParams.get('project');

   site_id      = url.searchParams.get('site_id');
   site_no      = url.searchParams.get('site_no');
   coop_site_no = url.searchParams.get('coop_site_no');
   cdwr_id      = url.searchParams.get('cdwr_id');

   //console.log(`Site site ${site}`);
   //console.log(`Site site_id ${site_id}`);
   //console.log(`Site site_no ${site_no}`);
   //console.log(`Site coop_site_no ${coop_site_no}`);
   //console.log(`Site cdwr_id ${cdwr_id}`);
   //console.log(`Column ${column}`);
   //console.log(`Project ${project}`);
     
   // Check arguments
   //-------------------------------------------------
   if(site)
     {
       if(!checkSiteId(site))
          {
            openModal(message);
            fadeModal(3000);
            return;
          }
      site_key = site;
      if(!column) { column = 'site'; }
     }

   if(site_id)
     {
       if(!checkSiteId(site_id))
          {
            openModal(message);
            fadeModal(3000);
            return;
          }
      site     = site_id;
      site_key = site;
      if(!column) { column = 'site_id'; }
     }

   if(site_no)
     {
       if(!checkSiteNo(site_no))
          {
            openModal(message);
            fadeModal(3000);
            return;
          }
      site     = site_no;
      site_key = site;
      if(!column) { column = 'site_no'; }
     }

   if(coop_site_no)
     {
       if(!checkCoopSiteNo(coop_site_no))
          {
            openModal(message);
            fadeModal(3000);
            return;
          }
      site     = coop_site_no;
      site_key = site;
      if(!column) { column = 'coop_site_no'; }
     }

   if(cdwr_id)
     {
       if(!checkCdwrId(cdwr_id))
          {
            openModal(message);
            fadeModal(3000);
            return;
          }
      site     = cdwr_id;
      site_key = site;
      if(!column) { column = 'cdwr_id'; }
     }

   if(!site)
     {
       openModal(message);
       fadeModal(10000)
       return false;
     }
   
   if(!columns.includes(column))
     {
       var message = "Incorrectly entered column name: ";
       message    += `Enter one of these ${columns.join(', ')}`;
       openModal(message);
       fadeModal(6000)
       return false;
     }
   
   if(project)
     {
      project = checkProject(project);
     }
   else
     {
      project = 'klamath_wells';
     }
   //console.log('Project');
   //console.log(project);


   // Call grapher
   //-------------------------------------------------
   if(column && site && project)
     {
      callGwService(column, site, project);
     }
   else
     {
       openModal(message);
       fadeModal(6000)
       return false;
     }
});
