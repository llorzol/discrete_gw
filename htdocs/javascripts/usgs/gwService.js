/* NwisWeb Javascript plotting library for jQuery and flot.
 *
 * A JavaScript library to graph NwisWeb groundwater information
 * such as the discrete groundwater measurements for a site(s).
 *
 * version 2.04
 * December 27, 2023
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

var indexField  = "site_no";
var gwFields    = [
                   'agency_cd', 
                   'site_no', 
                   'site_tp_cd',
                   'lev_dt',
                   'lev_tm',
                   'lev_tz_cd',
                   'lev_va',
                   'sl_lev_va',
                   'sl_datum_cd',
                   'lev_status_cd',
                   'lev_agency_cd',
                   'lev_dt_acy_cd',
                   'lev_acy_cd',
                   'lev_src_cd',
                   'lev_meth_cd',
                   'lev_age_cd'
                  ];

function callGwService(column, site_id, project)
  {
   console.log("callGwService");
   //alert("callGwService");

   // Loading message
   //
   message = ["Processing groundwater information for site", site_id, "for project", project].join(' ');
   openModal(message);

   // Request for site service information
   //
   var request_type = "GET";
   var script_http  = '/cgi-bin/klamath_wells/requestCollectionFile.py';
   var script_http  = '/cgi-bin/klamath_wells/test.py';
   var script_http  = '/cgi-bin/discrete_gw/test.py';
   //var script_http  = '/cgi-bin/discrete_gw/tt.py';
   var script_http  = '/cgi-bin/discrete_gw/requestGwRecords.py';
   script_http     += ['?', 'column=', column, '&', 'site', '=', site_id, '&', 'project', '=', project].join('');
   //var data_http    = { column: site_id };
   var data_http    = '';
      
   var dataType     = "json";
      
   // Web request
   //
   webRequest(request_type, script_http, data_http, dataType, gwService);
  }

function gwService(dataRDB)
  {
   closeModal();
   console.log("gwService");

   // Call plotting routine
   //
   plotGw(dataRDB);
  }
 
function parseGwRDB(dataRDB)
  {
   //console.log("parseGwRDB gwService");

    var myRe            = /^#/;
    var lineRe          = /\r?\n/;  
    var delimiter       ='\t';
    var myData          = {};
    var sl_datum_cds    = {};
    var lev_status_cds  = {};
    var lev_agency_cds  = {};
    var lev_dt_acy_cds  = {};
    var lev_acy_cds     = {};
    var lev_src_cds     = {};
    var lev_meth_cds    = {};
    var lev_age_cds     = {};

    var Fields          = [];

    // Parse from header explanations
    //
    var myAgencyInfo    = /^# Referenced agency codes/;
    var myStatusInfo    = /^# Referenced water-level site status codes/;
    var myReferenceInfo = /^# Referenced vertical datum codes/;
    var myDateAcyInfo   = /^# Referenced water-level date-time accuracy codes/;
    var myLevAcyInfo    = /^# Referenced water-level accuracy codes/;
    var myLevSrcInfo    = /^# Referenced source of measurement codes/;
    var myMethodInfo    = /^# Referenced method of measurement codes/;
    var myAgingInfo     = /^# Referenced water-level approval-status codes/;

    // Parse in lines
    //
    var fileLines       = dataRDB.split(lineRe);

    // Column names on header line
    //
    while(fileLines.length > 0)
      {
        var fileLine = jQuery.trim(fileLines.shift());
        if(fileLine.length < 1)
          {
            continue;
          }
        if(!myRe.test(fileLine))
          {
            break;
          }

        // Header portion for site status information
        //
        if(myStatusInfo.test(fileLine))
          {
            fileLines.shift(); // skip blank line

            while(fileLines.length > 0)
              {
                fileLine = jQuery.trim(fileLines.shift());
                if(myRe.test(fileLine))
                  {
                    if(fileLine.length < 5) { break; }
                  }

                var Fields        = fileLine.split(/\s+/);
                var lev_status_cd = Fields[1];
                if(lev_status_cd === '""') { lev_status_cd = "9"; }
                lev_status_cds[lev_status_cd] = {};
                lev_status_cds[lev_status_cd] = Fields.slice(2).join(" ");
                //console.log("Status " + lev_status_cd.length + "--> " + Fields.slice(2).join(" "));
              }
          }

        // Header portion for measuring agency codes information
        //
        if(myAgencyInfo.test(fileLine))
          {
            fileLines.shift(); // skip blank line

            while(fileLines.length > 0)
              {
                fileLine = jQuery.trim(fileLines.shift());
                if(myRe.test(fileLine))
                  {
                    if(fileLine.length < 5) { break; }
                  }

                var Fields        = fileLine.split(/\s+/);
                var lev_agency_cd = Fields[1];
                lev_agency_cds[lev_agency_cd] = {};
                lev_agency_cds[lev_agency_cd] = Fields.slice(2).join(" ");
              }
          }

        // Header portion for referenced vertical datum codes 
        //
        if(myReferenceInfo.test(fileLine))
          {
            fileLines.shift(); // skip blank line

            while(fileLines.length > 0)
              {
                fileLine = jQuery.trim(fileLines.shift());
                if(myRe.test(fileLine))
                  {
                    if(fileLine.length < 5) { break; }
                  }

                var Fields        = fileLine.split(/\s+/);
                var sl_datum_cd   = Fields[1];
                sl_datum_cds[sl_datum_cd] = {};
                sl_datum_cds[sl_datum_cd] = Fields.slice(2).join(" ");
              }
          }

        // Header portion for method codes 
        //
        if(myMethodInfo.test(fileLine))
          {
            fileLines.shift(); // skip blank line

            while(fileLines.length > 0)
              {
                fileLine = jQuery.trim(fileLines.shift());
                if(myRe.test(fileLine))
                  {
                    if(fileLine.length < 5) { break; }
                  }

                var Fields        = fileLine.split(/\s+/);
                var lev_meth_cd   = Fields[1];
                lev_meth_cds[lev_meth_cd] = {};
                lev_meth_cds[lev_meth_cd] = Fields.slice(2).join(" ");
              }
          }

        // Header portion for  water-level date-time accuracy
        //
        if(myDateAcyInfo.test(fileLine))
          {
            fileLines.shift(); // skip blank line

            while(fileLines.length > 0)
              {
                fileLine = jQuery.trim(fileLines.shift());
                if(myRe.test(fileLine))
                  {
                    if(fileLine.length < 5) { break; }
                  }

                var Fields        = fileLine.split(/\s+/);
                var lev_dt_acy_cd = Fields[1];
                lev_dt_acy_cds[lev_dt_acy_cd] = {};
                lev_dt_acy_cds[lev_dt_acy_cd] = Fields.slice(2).join(" ");
              }
          }

        // Header portion for water-level approval-status
        //
        if(myAgingInfo.test(fileLine))
          {
            fileLines.shift(); // skip blank line

            while(fileLines.length > 0)
              {
                fileLine = jQuery.trim(fileLines.shift());
                if(myRe.test(fileLine))
                  {
                    if(fileLine.length < 5) { break; }
                  }

                var Fields        = fileLine.split(/\s+/);
                var lev_age_cd    = Fields[1];
                lev_age_cds[lev_age_cd] = {};
                lev_age_cds[lev_age_cd] = Fields.slice(2).join(" ");
              }
          }

        // Header portion for source of measurement
        //
        if(myLevSrcInfo.test(fileLine))
          {
            fileLines.shift(); // skip blank line

            while(fileLines.length > 0)
              {
                fileLine = jQuery.trim(fileLines.shift());
                if(myRe.test(fileLine))
                  {
                    if(fileLine.length < 5) { break; }
                  }

                var Fields        = fileLine.split(/\s+/);
                var lev_src_cd    = Fields[1];
                lev_src_cds[lev_src_cd] = {};
                lev_src_cds[lev_src_cd] = Fields.slice(2).join(" ");
              }
          }

        // Header portion for water-level accuracy
        //
        if(myLevAcyInfo.test(fileLine))
          {
            fileLines.shift(); // skip blank line

            while(fileLines.length > 0)
              {
                fileLine = jQuery.trim(fileLines.shift());
                if(myRe.test(fileLine))
                  {
                    if(fileLine.length < 5) { break; }
                  }

                var Fields        = fileLine.split(/\s+/);
                var lev_acy_cd    = Fields[1];
                lev_acy_cds[lev_acy_cd] = {};
                lev_acy_cds[lev_acy_cd] = Fields.slice(2).join(" ");
              }
          }
       }
      
    // Check index column name in file
    //
    var Fields = fileLine.split(delimiter);
    if(jQuery.inArray(indexField,Fields) < 0)
      {
        var message = "Header line of column names does not contain " + indexField + " column\n";
        message    += "Header line contains " + Fields.join(", ");
        message_dialog("Warning", message);
        close_dialog();
        return false;
      }
       
    // Format line in header portion [skip]
    //
    var fileLine = jQuery.trim(fileLines.shift());

    // Data lines
    //
    var count = 0;
    while(fileLines.length > 0)
      {
        fileLine = jQuery.trim(fileLines.shift());
        if(myRe.test(fileLine))
          {
            continue;
          }
        if(fileLine.length > 1)
          {
            var Values        = fileLine.split(delimiter);

            // Key does not exist [First time seen; create it]
            //
            if(typeof myData[count] === "undefined")
              {
                myData[count] = {}; //if the object is undefined, build an object on the fly
              }
          
            for(var i = 0; i < gwFields.length; i++)
              {
                var Value                  = Values[jQuery.inArray(gwFields[i],Fields)];
                if(typeof Value === "undefined" || Value.length < 1)
                  {
                    Value = "";
                  }
                myData[count][gwFields[i]] = Value;
              }
            count++;
          }
      }

      return { "myData": myData,
               "lev_status_cds": lev_status_cds,
               "lev_agency_cds": lev_agency_cds,
               "lev_dt_acy_cds": lev_dt_acy_cds,
               "lev_acy_cds": lev_acy_cds,
               "lev_src_cds": lev_src_cds,
               "lev_meth_cds": lev_meth_cds,
               "lev_age_cds": lev_age_cds,
               "sl_datum_cds": sl_datum_cds };

  }
