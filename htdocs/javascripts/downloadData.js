/**
 * Namespace: downloadData
 *
 * downloadData is a JavaScript library to provide a set of functions to download
 *  groundwater measurements.
 *
 * version 1.07
 * February 24, 2019
*/

/*
###############################################################################
# Copyright (c) U.S. Geological Survey Oregon Water Science Center
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

// Trigger for download event
//-------------------------------------------------
jQuery("#downloadHelp").click(function() 
  {
   console.log("Clicked download");
   downloadData(myGwData);
});

// Build output
//-------------------------------------------------
var headerLines = [];

headerLines.push('# ---------------------------------- WARNING ----------------------------------------');
headerLines.push('# Some of the data that you have obtained from this U.S. Geological Survey database');
headerLines.push("# may not have received Director's approval. Any such data values are qualified");
headerLines.push('# as provisional and are subject to revision. Provisional data are released on the');
headerLines.push('# condition that neither the USGS nor the United States Government may be held liable');
headerLines.push('# for any damages resulting from its use.');
headerLines.push('#');

// Read parameter codes from NwisWeb
//
function requestGwData(agency_cd, site_no, coop_site_no, cdwr_id)
  {
   message = "Requesting waterlevel measurements";
   openModal(message);
   fadeModal(4000)

   // Loading message
   //
   var column = "site_no";
   if(typeof site_no !== "undefined")
     {
      site_key = site_id;
     }
   else if(typeof site_id !== "undefined")
     {
      site_key = site_id;
      column   = "site_id";
     }
   else if(typeof coop_site_no !== "undefined")
     {
      site_key = coop_site_no.replace(/\s+/,"_",6);
      column   = "coop_site_no";
     }
   else if(typeof cdwr_id !== "undefined")
     {
      site_key = cdwr_id;
      column   = "cdwr_id";
     }

   // Loading message
   //
   message = "Processing groundwater information for site " + site_key;
   openModal(message);

   // Request for site service information
   //
   var request_type = "GET";
   var script_http  = [cgiService, download_script].join("/");
   var data_http    = download_url;
   data_http       += [column, site_key].join("=");
      
   var dataType     = "text";
      
   // Web request
   //
   webRequest(request_type, script_http, data_http, dataType, downloadData);
  }

// Read parameter codes from NwisWeb
//
function downloadData(GwInfo)
  {
   message = "Preparing waterlevel measurements";
   openModal(message);
   fadeModal(4000)

   // Modify header lines
   // 
   headerLines.push('# retrieved: ' + (new Date()).toString())
   headerLines.push('#');
   headerLines.push('# USGS, OWRD and CDWR groundwater levels');
   headerLines.push('#');
   headerLines.push('# Data for the following site are contained in this file');

   // Set
   // 
   var site_no      = GwInfo.siteinfo.site_no;
   var coop_site_no = GwInfo.siteinfo.coop_site_no;
   var cdwr_id      = GwInfo.siteinfo.cdwr_id;
   var station_nam  = GwInfo.siteinfo.station_nam;

   // Change header line
   // 
   var title = [];
   if(typeof site_no !== "undefined")
     {
      title.push(site_no);
     }
   if(typeof coop_site_no !== "undefined")
     {
      title.push(coop_site_no);
     }
   if(typeof cdwr_id !== "undefined")
     {
      title.push(cdwr_id);
     }
   if(typeof station_nam !== "undefined")
     {
      title.push(station_nm);
     }
   headerLines.push('#   ' + title.join(" "));
      
   headerLines.push('# -----------------------------------------------------------------------------------');
   headerLines.push('#');
   headerLines.push('# The fields in this file include:');
   headerLines.push('# ---------------------------------');
   headerLines.push('# agency_cd     Agency code');
   headerLines.push('# site_no       USGS site number');
   headerLines.push('# coop_site_no  OWRD well log ID');
   headerLines.push('# lev_dt        Date level measured');
   headerLines.push('# lev_tm        Time level measured');
   headerLines.push('# lev_tz_cd     Time datum');
   headerLines.push('# lev_va        Water-level value in feet below land surface');
   headerLines.push('# lev_status_cd Status');
   headerLines.push('# lev_agency_cd Measuring agency');
   headerLines.push('# lev_dt_acy_cd Water-level date-time accuracy');
   headerLines.push('# lev_acy_cd    Water-level accuracy');
   headerLines.push('# lev_src_cd    Source of measurement');
   headerLines.push('# lev_meth_cd   Method of measurement');
   headerLines.push('#');

   // Groundwater information
   //
   var dataLines       = [];
   var myFields = [
                   'agency_cd',
                   'site_no',
                   'coop_site_no',
                   'lev_dt',
                   'lev_tm',
                   'lev_tz_cd',
                   'lev_va',
                   'lev_status_cd',
                   'lev_agency_cd',
                   'lev_dt_acy_cd',
                   'lev_acy_cd',
                   'lev_src_cd',
                   'lev_meth_cd'
                  ];

   var myData          = GwInfo.waterlevels;
   var lev_dt_acy_cds  = GwInfo.lev_dt_acy_cds;
   var lev_acy_cds     = GwInfo.lev_acy_cds;
   var lev_src_cds     = GwInfo.lev_src_cds;
   var lev_status_cds  = GwInfo.lev_status_cds;
   var lev_meth_cds    = GwInfo.lev_meth_cds;

   var lev_codes       = {};

   for(var record in myData)
      {
       var output = [];

       for(var i = 0; i < myFields.length; i++)
          {
           var column = myFields[i];

           if(typeof myData[record][column] === "undefined")
             {
              if(column === "agency_cd")
                {
                 value = "OWRD";
                }
              if(column === "site_no")
                {
                 value = "";
                }
              if(column === "coop_site_no")
                {
                 value = coop_site_no;
                }
             }
           else
             {
              if(typeof lev_codes[column] === "undefined")
                {
                 lev_codes[column] = {};
                }
              value = myData[record][column];

              lev_codes[column][value] = 1;
             }
           output.push(value);   
          }
       dataLines.push(output.join("\t"));
      }
      
   // Build status codes
   //
   headerLines.push('# Referenced water-level site status codes (lev_status_cd) included in this output:');
   headerLines.push('#');

   for(var code in lev_codes['lev_status_cd'])
      {
       var description = lev_status_cds[code];
       if(code == "")
         { 
          code        = '""';
          description = lev_status_cds['9'];
         }
       var headerLine = '#     ';
       headerLine    += code;
       headerLine    += '         ';
       headerLine    += description;

       headerLines.push(headerLine);
      }
   headerLines.push('#');
      
   // Build water-level date-time accuracy
   //
   headerLines.push('# Referenced water-level date-time accuracy codes (lev_dt_acy_cd) included in this output:');
   headerLines.push('#');

   for(var code in lev_codes['lev_dt_acy_cd'])
      {
       var description = lev_dt_acy_cds[code];

       var headerLine = '#     ';
       headerLine    += code;
       headerLine    += '         ';
       headerLine    += description;

       headerLines.push(headerLine);
      }
   headerLines.push('#');

      
   // Build water-level accuracy codes
   //
   headerLines.push('# Referenced water-level accuracy codes (lev_acy_cd) included in this output:');
   headerLines.push('#');

   for(var code in lev_codes['lev_acy_cd'])
      {
       var description = lev_acy_cds[code];
       if(code == "" || code == " ")
         { 
          code        = '""';
          description = lev_acy_cds['U'];
         }

       var headerLine = '#     ';
       headerLine    += code;
       headerLine    += '         ';
       headerLine    += description;

       headerLines.push(headerLine);
      }
   headerLines.push('#');
      
   // Build source of measurement codes
   //
   headerLines.push('# Referenced source of measurement codes (lev_src_cd) included in this output:');
   headerLines.push('#');

   for(var code in lev_codes['lev_src_cd'])
      {
       var description = lev_src_cds[code];

       var headerLine = '#     ';
       headerLine    += code;
       headerLine    += '         ';
       headerLine    += description;

       headerLines.push(headerLine);
      }
   headerLines.push('#');

      
   // Build method of measurement codes
   //
   headerLines.push('# Referenced method of measurement codes (lev_meth_cd) included in this output:');
   headerLines.push('#');

   for(var code in lev_codes['lev_meth_cd'])
      {
       var description = lev_meth_cds[code];

       var headerLine = '#     ';
       headerLine    += code;
       headerLine    += '         ';
       headerLine    += description;

       headerLines.push(headerLine);
      }
   headerLines.push('#');
      
   // Build output
   //
   headerLines.push(myFields.join("\t"));
      
   var myFormats = [
                   '5s',
                   '15s',
                   '10s',
                   '10d',
                   '5d',
                   '5s',
                   '10s',
                   '2s',
                   '2s',
                   '2s',
                   '2s',
                   '2s',
                   '2s'
                  ];
   headerLines.push(myFormats.join("\t"));

   // Output
   //
   var myWindow = window.open('', '_blank', '');
   var myData   = headerLines.join("\n");
   myData     += "\n";
   myData     += dataLines.join("\n");

   jQuery(myWindow.document.body).html('<pre>' + myData + '</pre>');

   // Change title
   // 
   jQuery(myWindow.document).prop("title", "Groundwater Measurement Information for Site " + title.join(" "));

   closeModal();
  }
