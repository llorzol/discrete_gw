/* NwisWeb Javascript plotting library for jQuery and flot.
 *
 * Gw_Graphing is a JavaScript library to graph groundwater information
 * such as the discrete groundwater measurements for a site(s).
 *
 * version 2.01
 * December 23, 2023
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

var plot;
var overview;
var data_sets            = [];
var data                 = [];
var data_aging_sets      = [];
var data_aging_list      = [];
var LegendHash           = [];
var d                    = [];
var color_scheme         = [];
var status_mts           = [];
var previousPoint        = null;
var lev_vas              = {};

var monthNames           = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

var symbol_types         = ["circle", "square", "diamond", "triangle", "cross", "downtriangle", "righttriangle"];

// Function to show tooltip
//
function showMessagetip(x, y, x_offset, y_offset, contents) 
  {
    var x_position = x + x_offset;
    var y_position = y + y_offset;
    jQuery("#tooltip").remove();
    jQuery('<div id="tooltip" class="flot_tooltip">' + contents + '</div>').css( {
          top:  parseInt(y_position),
          left: parseInt(x_position)
     }).appendTo("body").fadeIn(200);
  }
      
function closeMessagetip(fadeout) 
  {
   setTimeout(function(){
                $('#tooltip').fadeOut().remove();
      },fadeout);
  }
      
function plotGw(GwInfo) 
  {
    console.log("Plotting");

    // Set variables
    //
    var x_axis_min      =  9999999999999999999;
    var x_axis_max      = -9999999999999999999;

    var y_axis_min      =  9999999999999999999;
    var y_axis_max      = -9999999999999999999;

    myGwData            = GwInfo;

    // Site information
    //
    var mySite          = GwInfo.siteinfo;
    var agency_cd       = mySite.agency_cd;
    var site_no         = mySite.site_no;
    var coop_site_no    = mySite.coop_site_no;
    var cdwr_id         = mySite.cdwr_id;
    var alt_va          = mySite.alt_va;
    var alt_datum_cd    = mySite.alt_datum_cd;
    var alt_acy_va      = mySite.alt_acy_va;
    var station_nm      = mySite.station_nm;

    // Groundwater information
    //
    var myData          = GwInfo.waterlevels;
    var lev_dt_acy_cds  = GwInfo.lev_dt_acy_cds;
    var lev_acy_cds     = GwInfo.lev_acy_cds;
    var lev_src_cds     = GwInfo.lev_src_cds;
    var lev_status_cds  = GwInfo.lev_status_cds;
    var lev_meth_cds    = GwInfo.lev_meth_cds;
    //var lev_agency_cds  = GwInfo.lev_agency_cds;
    //var sl_datum_cds    = GwInfo.sl_datum_cds;
  
    // Waterlevel
    //
    var lev_va_count    = 0;
    var sl_lev_va_count = 0;
    var data_gap_nu     = 31536000000;
    var last_lev_dt     = null;
    var data_aging      = [];
    var last_lev_age_cd = null;
    var statusOnly      = /^[CNOW]$/g;

    var count           = 0;

    for(var record in myData)
       {
         var lev_dtm       = myData[record].lev_dtm;
         var lev_dt        = myData[record].lev_dt;
         var lev_tm        = myData[record].lev_tm;
         var lev_str_dt    = myData[record].lev_str_dt;
         var lev_tz_cd     = myData[record].lev_tz_cd;
         var lev_va        = myData[record].lev_va;
         var sl_lev_va     = myData[record].sl_lev_va;
         var lev_status_cd = myData[record].lev_status_cd;
         var lev_agency_cd = myData[record].lev_agency_cd;
         var lev_dt_acy_cd = myData[record].lev_dt_acy_cd;
         var lev_acy_cd    = myData[record].lev_acy_cd;
         var lev_src_cd    = myData[record].lev_src_cd;
         var lev_meth_cd   = myData[record].lev_meth_cd;

         var lev_va_str    = null;
         var value         = null;
         var toolTip       = ["Waterlevel:"];

         //console.log("lev_dt " + lev_dt + " lev_tm " + lev_tm + " lev_va " + lev_va + " sl_lev_va " + sl_lev_va);

         // Waterlevel
         //
         if(lev_va.length > 0)
           {
             lev_va_str = lev_va.toString();
             lev_va     = parseFloat(lev_va);
             value      = lev_va;
             lev_va_count++;
             toolTip.push(lev_va_str);
           }

         // Static status for waterlevel
         //
         if(lev_status_cd.length < 1)
           {
             lev_status_cd = "9";
           }
           
         // Status-only records [no water-level measurement; no need to graph]
         //
         if(statusOnly.test(lev_status_cd))
           {
             continue;
           }
           
         // Valid records [optional water-level measurement]
         //
         else
           {
            var definition = "";
               
            // Add status
            //
            if(typeof status_mts[lev_status_cd] === "undefined")
              {
               status_mts[lev_status_cd] = {};
               definition                = lev_status_cd;
                 
               if(typeof lev_status_cds[lev_status_cd] !== "undefined")
                 {
                  definition = lev_status_cds[lev_status_cd];
                 }
               status_mts[lev_status_cd].definition = definition;
               status_mts[lev_status_cd].points     = [];
              }
               
            // Add status
            //
            else
               {
                if(typeof lev_status_cds[lev_status_cd] !== "undefined")
                  {
                   definition = lev_status_cds[lev_status_cd];
                  }
               }

            toolTip.push("(" + definition + ")");

             // Dry status
             //
             if(lev_status_cd === "D")
               {
                 if(value !== null)
                   {
                     lev_va_count++;
                   }
                 else
                   {
                     value = "null";
                   }
               }
                    
             // Flowing status
             //
             else if(lev_status_cd === "E" || lev_status_cd === "F" || 
                lev_status_cd === "G" || lev_status_cd === "H")
               {
                 if(!lev_va && !sl_lev_va)
                   {
                     value = 0.0;
                     lev_va_count++;
                   }
               }
                    
             // Pumping status
             //
             else if(lev_status_cd === "P" || lev_status_cd === "R" || 
                     lev_status_cd === "S" || lev_status_cd === "T")
               {
                 if(!lev_va && !sl_lev_va)
                   {
                     value = "null";
                   }
               }
           }

         // Date for waterlevel
         //
         toolTip.push("on " + lev_str_dt);

         // Date for waterlevel
         //
         var lev_dt_str = lev_dt;
         if(lev_dt.length < 5)
           {
             lev_dt += "/01/01";
           }
         if(lev_dt.length < 8)
           {
             lev_dt = lev_dt.replace(/-/g, "/") + "/01";
           }
         else
           {
             lev_dt = lev_dt.replace(/\-/g, "/");
           }

         //alert("lev_dt " + lev_dt + " lev_va " + lev_va + " sl_lev_va " + sl_lev_va);

         //var datetime = +(new Date(lev_dt));
         //var datetime = new Date(lev_dt).getTime();
         //var myDate = new Date("July 1, 1978 02:30:00"); // Your timezone!
         //var myEpoch = myDate.getTime()/1000.0;

         var datetime = Date.parse(lev_dt);

         var browser_offset = 0;
         if(lev_tm.length > 0)
           {
             lev_dt += " " + lev_tm;
             var browser_offset = new Date().getTimezoneOffset() * 60000;
             lev_dt_str += " " + lev_tm;
           }

         datetime -= browser_offset;
  
         if(datetime > x_axis_max) { x_axis_max = datetime; }
         if(datetime < x_axis_min) { x_axis_min = datetime; }

         // Check interval between last measurement break line if necessary
         //
         if(last_lev_dt !== null)
           {
             var delta_dt = datetime - last_lev_dt;
             if(delta_dt > data_gap_nu)
               {
                 data[count] = [ last_lev_dt, null, count ];
                 count++;
               }
           }
         last_lev_dt = datetime;
             
         // Set min and max
         //
         if(value !== null)
           {
             if(value > y_axis_max) { y_axis_max = value; }
             if(value < y_axis_min) { y_axis_min = value; }
           }
                    
         // Set method
         //
         if(lev_meth_cd.length > 0)
           {
            var myRe          = /^[U]$/g;
            if(myRe.test(lev_meth_cd))
              {
               lev_meth_cd = "R";
               toolTip.push(lev_meth_cds[lev_meth_cd]);
              }
            else if(typeof lev_meth_cds[lev_meth_cd] !== "undefined")
              {
                toolTip.push("with " + lev_meth_cds[lev_meth_cd]);
               }
           }
                    
         // Set status data sets
         //
         var points = status_mts[lev_status_cd].points;
         points.push([ datetime, value, count, value ]);
         status_mts[lev_status_cd].points = points;

         data[count]    = [ datetime, value, count, value ];

         lev_vas[count] = toolTip.join(" ");

         //console.log("Point " + count);

         count++;
       }

    // No water-level measurements could be graphed
    //
    if(lev_va_count < 1)
      {
        var window_height  = jQuery(window).height();
        var html_height    = jQuery(document).height();
        var dialog_height  = html_height * 0.70;
        if(window_height < html_height) { dialog_height = window_height * 0.70; }
        var window_width   = jQuery(window).width();
        var html_width     = jQuery(document).width();
        var dialog_width   = html_width * 0.70;
        if(window_width < html_width) { dialog_width = window_width * 0.70; }

        var output_tx = "<p><strong>\n";
        output_tx    += "Graphing option not available. No water-level measurements taken at site due to dry, flowing, and other conditions.\n";
        output_tx    += "<br />";
        output_tx    += "See other output formats such as 'Table of data' for more information.";
        output_tx    += "</strong></p>\n";

        jQuery(".discrete_gw_graphing_tool").css( { height: window_height, width: window_width } );
        jQuery(".discrete_gw_graphing_tool").html(output_tx);

        return false;
      }

    //alert("Max : " + y_axis_max + " Min : " + y_axis_min);
    //alert("Max : " + x_axis_max + " Min : " + x_axis_min);
    //alert("data " + data.length);
    var date_min_max = Date_MinMax(x_axis_min, x_axis_max);
    var x_axis_min   = date_min_max.min;
    var x_axis_max   = date_min_max.max;
    var interval     = setInterval(x_axis_min, x_axis_max);
    var Ticks        = setTicks(x_axis_min, x_axis_max);

    var ColorHash    = setColor();

    // Add hydrograph line
    //
    var id           = site_key + "_line";
    LegendHash[id]   = 1;
    data_sets.push(
                   { 
                    label : "Measured values",
                    id    : id,
                    data  : data,
                    color : "rgba(0, 0, 0, 0.5)",
                    xaxis : 1,
                    yaxis : 1,
                    lines : { show: true, lineWidth: 1},
                    points: { show: false }
                   }
                  );

    // Add status-only records as points
    //
    var color_no     = 1;
    var symbolCount  = 0;
    var symbol_type  = symbol_types[symbolCount];
    for ( var status_cd in status_mts)
      {
        var color       = ColorHash[color_no++];
        var symbol_type = symbol_types[symbolCount];
        color_scheme.push(color);
        var definition  = status_mts[status_cd].definition;
        var pts         = status_mts[status_cd].points;
        var id          = site_key + "_" + status_cd;
        LegendHash[id]  = 1;
        data_sets.push(
                       { 
                        label : definition,
                        id    : id,
                        data  : pts,
                        color : color,
                        xaxis : 1,
                        yaxis : 1,
                        lines: { show: false },
                        points: { show: true, symbol: symbol_type }
                       });

        symbolCount++;
      }
    
   // Change title
   // 
   $("#graphs").show(); 

   var title = ["Groundwater Measurement Information for Site"];
   if(site_no)
     {
      title.push("USGS " + site_no);
     }
   if(coop_site_no)
     {
      if(coop_site_no.length > 0) { title.push("OWRD " + coop_site_no); }
     }
   if(cdwr_id)
     {
      if(cdwr_id.length > 0) { title.push("CDWR " + site_id); }
     }
   if(station_nm)
     {
      if(station_nm.length > 0) { title.push("<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Station " + station_nm); }
     }
   $("#plot_title").html(title.join(" "));
   $(document).prop("title", title.join(" "));
                                                       
   // X axis
   //
   var xaxis = 
              { 
               show: true,
               position: 'bottom',
               ticks: 5,
               mode: "time",
               timezone: null,
               monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
               //tickFormatter: XtickFormatter,
               ticks: Ticks,
               font: {size: 10, weight: "bold", color: "black"},
               color: "#000000",
               min: x_axis_min,
               max: x_axis_max
             };
                                                       
   // Y axes
   //
   var yaxes = [];
   var oaxes = [];

   // Left Y axis
   //
   yaxes.push(
              { 
               show: true,
               position: 'left',
               min: y_axis_min,
               max: y_axis_max,
               transform: function (v) { return -v; },
               inverseTransform: function (v) { return -v; },
               tickFormatter: function (val, axis) { return val.toFixed(axis.tickDecimals); },
               font: {size: 10, weight: "bold", color: "#000000"},
               axisLabel: "DEPTH BELOW LAND SURFACE IN FEET",
               axisLabelUseCanvas: true,
               axisLabelFontSizePixels: 12,
               axisLabelFontFamily: "Verdana, Arial, Helvetica, Tahoma, sans-serif",
               axisLabelPadding: 20
              });

   oaxes.push(
              { 
               show: true,
               position: 'left',
               min: y_axis_min,
               max: y_axis_max,
               transform: function (v) { return -v; },
               inverseTransform: function (v) { return -v; },
               tickFormatter: function (val, axis) { return val.toFixed(axis.tickDecimals); },
               font: {size: 10, weight: "bold", color: "#000000"},
               axisLabel: "  ",
               axisLabelUseCanvas: true,
               axisLabelFontSizePixels: 12,
               axisLabelFontFamily: "Verdana, Arial, Helvetica, Tahoma, sans-serif",
               axisLabelPadding: 20
              });

   // Right Y axis
   //
   if(typeof alt_va !== "undefined")
     {
       y2_axis_max = alt_va - y_axis_min;
       y2_axis_min = alt_va - y_axis_max;

       yaxes.push(
                  { 
                   show: true,
                   position: 'right',
                   min: y2_axis_min,
                   max: y2_axis_max,
                   alignTicksWithAxis: null,
                   tickFormatter: function (val, axis) { return val.toFixed(axis.tickDecimals); },
                   font: {size: 10, weight: "bold", color: "#000000"},
                   axisLabel: "WATER LEVEL IN FEET ABOVE " + alt_datum_cd,
                   axisLabelUseCanvas: true,
                   axisLabelFontSizePixels: 12,
                   axisLabelFontFamily: "Verdana, Arial, Helvetica, Tahoma, sans-serif",
                   axisLabelPadding: 20
                  });

       oaxes.push(
                  { 
                   show: true,
                   position: 'right',
                   min: y2_axis_min,
                   max: y2_axis_max,
                   alignTicksWithAxis: null,
                   tickFormatter: function (val, axis) { return val.toFixed(axis.tickDecimals); },
                   font: {size: 10, weight: "bold", color: "#000000"},
                   axisLabel: "  ",
                   axisLabelUseCanvas: true,
                   axisLabelFontSizePixels: 12,
                   axisLabelFontFamily: "Verdana, Arial, Helvetica, Tahoma, sans-serif",
                   axisLabelPadding: 20
                  });
     }
                                                       
   // Graph options
   //
   var options = {
                  canvas: false,
                  legend: { show: false },
                  lines:  { show: true },
                  points: { show: true },
                  margin: { 
                            top: 100, 
                            left: 10, 
                            bottom: 10, 
                            right: 10 
                          },
                  grid:   
                           { 
                            hoverable: true, 
                            clickable: true,
                            hoverFill: '#444',
                            hoverRadius: 1
                           },
                  yaxes:  yaxes,
                  xaxis:  xaxis,
                  colors: color_scheme,
                  selection: { mode: "x" }
                 };
   
   // Data
   //
   data = data_sets;
   
   console.log("Adding zoom period plot")
                                                       
    // Graph plot
    //
    plot = $.plot($("#placeholder"), data_sets, options);
    jQuery('.loading').remove();
    jQuery('#enableTooltip').prop('checked',true);
   
    console.log("Adding overview period selected plot")

    // Overview
    //
    overview = $.plot($("#overview"), data_sets, {
                                              canvas: false,
                                              legend: { show: false },
                                              lines: { show: true, lineWidth: 1 },
                                              shadowSize: 0,
                                              xaxis:  xaxis,
                                              yaxes: oaxes,
                                              grid: { color: "#000000" },
                                              selection: { mode: "x", color: "#F5E832" }
    });

    // Double click reset
    //
    jQuery("#overview").dblclick(function () {
        plot = jQuery.plot(jQuery("#placeholder"), data,
                      jQuery.extend(true, {}, options, {
                                                        xaxis: { min: new Date(x_axis_min).getTime(), max: new Date(x_axis_max).getTime() }
                      }));
    });
             
    // Reset button
    //
    $("#reset").click(function () {
        plot = jQuery.plot(jQuery("#placeholder"), data,
                      jQuery.extend(true, {}, options, {
                                                        xaxis: { min: new Date(x_axis_min).getTime(), max: new Date(x_axis_max).getTime() }
                      }));
    });
   
      console.log("Adding legend table with checkboxes and values")
   
   // Add legend table with checkboxes and values
   // 
   var i = 0;
   var legend_txt = [];
   legend_txt.push('<div id="Legend" class="container legendTable">');
   legend_txt.push(' <div class="row">');
   legend_txt.push('  <div class="col">');
   legend_txt.push('   <span id="explanation">Explanation</span>');
   legend_txt.push('  </div>');
   legend_txt.push(' </div>');
   legend_txt.push(' <div class="legendEntries">');

   jQuery.each(data_sets, function(key, val) {
       var color         = val.color;
       var label         = val.label;
       var id            = val.id;
       var y_axis_number = val.yaxis;
       //var color         = color_scheme[i];
       console.log(" ID " + id + " color " + color);
       var symbol_type   = val.points.symbol;
           ++i;

           if(typeof symbol_type ===  "undefined")
             {
               symbol_type = "line";
             }

           if(symbol_type !== "line")
             {

              legend_txt.push(' <div id="legend_' + id + '" class="row">');
   
              // Value element
              //
              legend_txt.push('  <div class="col-sm-1">');
              legend_txt.push('   <div id="value_' + id + '" class="legendValue">&nbsp;&nbsp;&nbsp;</div>');
              legend_txt.push('  </div>');
   
              // Checkbox element
              //
              legend_txt.push('  <div class="col-sm-1">');
              legend_txt.push('   <div class="checkBoxes">');
              legend_txt.push('    <input type="checkbox" name="' + id + '" value="on" id="checkbox_' + id + '" />');
              legend_txt.push('   </div>');
              legend_txt.push('  </div>');
   
              // Symbol element
              //
              legend_txt.push('  <div class="col-sm-1">');
   
              if(symbol_type === "line")
                {
                  legend_txt.push('   <div id="legend_' + id + '" class="legendLine" style="margin-top: 6px; border-bottom: 4px solid ' + color + ';">&nbsp;</div>');
                }
              if(symbol_type === "circle")
                {
                 legend_txt.push('   <div id="legend_' + id + '" class="legendCircle" style="border-color: ' + color + '">&nbsp;</div>');
                }
              if(symbol_type === "square")
                {
                 legend_txt.push('   <div id="legend_' + id + '" class="legendRectangle" style="border-color: ' + color + ';">&nbsp;</div>');
                }
              if(symbol_type === "diamond")
                {
                 legend_txt.push('   <div id="legend_' + id + '" class="legendDiamond" style="border-color: ' + color + ';">&nbsp;</div>');
                }
              if(symbol_type === "triangle")
                {
                  legend_txt.push('   <div id="legend_' + id + '" class="legendUpHollowTriangle" style="color: ' + color + ';">&#9651;</div>');
                }
              if(symbol_type === "cross")
                {
                  legend_txt.push('   <div id="legend_' + id + '" class="legendCross" style="color: ' + color + ';">&#10006;</div>');
                }
              if(symbol_type === "tcross")
                {
                  legend_txt.push('   <div id="legend_' + id + '" class="legendCross" style="color: ' + color + ';">&#10010;</div>');
                }
              if(symbol_type === "downtriangle")
                {
                 legend_txt.push('   <div id="legend_' + id + '" class="legendUpHollowTriangle" style="color: ' + color + ';">&#9661;</div>');
                }
              if(symbol_type === "righttriangle")
                {
                 legend_txt.push('   <div id="legend_' + id + '" class="legendUpHollowTriangle" style="color: ' + color + ';">&#9655;</div>');
                }
              legend_txt.push('  </div>');
   
              // Explanation element
              //
              legend_txt.push('  <div class="col-sm-8">');
              legend_txt.push('  <div id="label_' + id + '" class="legendLabel parameterLegend">' + label + '</div>');
              legend_txt.push('  </div>');
   
              legend_txt.push(' </div>');
             }
  });
   jQuery(".legendCircle").corner("3px");

   legend_txt.push(' </div">');
   legend_txt.push('</div>');
   jQuery("#Legend").html(legend_txt.join(""));

    var legends = jQuery(".legendValue");
    legends.each(function () {

       // Fix the widths so they don't jump around
       //
       jQuery(this).css('width', jQuery(this).width());

       // Set check box and properties
       //
       var id = jQuery(this).prop('id').replace("value_", "");

       if(LegendHash[id] > 0)
         {
          jQuery("#checkbox_" + id).prop('checked', true);
          jQuery('#label_' + id).css({ "opacity": 1.0 });
          jQuery('#value_' + id).html(" ");
         }
       else
         {
          jQuery("#checkbox_" + id).prop('checked', false);
          jQuery('#label_' + id).css({ "opacity": 0.4 });
          jQuery('#value_' + id).html(" ");
         }
    });

   // Monitor hover
   //
   jQuery('.parameterLegend').hover(
                                function () 
                                  { 
                                    var agency_cd = jQuery(this).prop('id').split(/_/)[1];
                                    var site_no   = jQuery(this).prop('id').split(/_/)[2];
                                    var id        = [ agency_cd, site_no ].join("_");
                                    var checkbox  = jQuery(this).prop('id').replace("label_", "checkbox_");
                                    //alert("ID " +  id);

                                      if(jQuery("#" + checkbox).prop('checked'))
                                        {
                                          jQuery(this).css({ "opacity": 0.4 });

                                          var placeholder_offset = jQuery("#placeholder").offset();
                                          var placeholder_height = jQuery("#placeholder").height();
                                          var placeholder_width  = jQuery("#placeholder").width();
                                          var placeholder_left   = placeholder_offset.left + placeholder_width;
                                          var placeholder_top    = placeholder_offset.top;
    
                                          // Show approval/screen/status periods
                                          //
                                          if(jQuery("#enableAgingtip").prop('checked'))
                                            {
                                              showDataAging(placeholder_left, placeholder_top, id, data_aging_sets);
                                            }
                                        }
                                    },
                                function () 
                                  { 
                                    var checkbox = jQuery(this).prop('id').replace("label_", "checkbox_");

                                      if(jQuery("#" + checkbox).prop('checked'))
                                        {
                                         jQuery(this).css({ "opacity": 1.0 });
                                        }
                                  }
                               );

   // Legend
   //
   jQuery('.checkBoxes :checkbox').click(function() 
                                {
                                 //var selected   = jQuery(this).prop('name');
                                 var id          = jQuery(this).prop('id').replace("checkbox_", "");

                                 //alert("ID " + id + " checked " + jQuery("#checkbox_" + id).prop('checked') + " legend " + LegendHash[id]);
                                    
                                 // Enable data set
                                 //
                                 if(jQuery("#checkbox_" + id).prop('checked'))
                                   {
                                    LegendHash[id] = 1;
                                    jQuery('#label_' + id).css({ "opacity": 1.0 });
                                    jQuery('#value_' + id).html(" ");
                                   }
                                 else
                                   {
                                    LegendHash[id] = 0;
                                    jQuery('#label_' + id).css({ "opacity": 0.4 });
                                    jQuery('#value_' + id).html(" ");
                                   }
                                 
                                 dataPoints = {};
                                 nullPoints = {};
                                 data = [];
                                 for(i = 1; i < data_sets.length; i++)
                                    {
                                     var id = data_sets[i].id;
                                     if(LegendHash[id] > 0)
                                       {
                                        data.push(data_sets[i]);
                                        dataSet = data_sets[i].data;
                                        for(ii = 0; ii < dataSet.length; ii++)
                                           {
                                            var dataPoint         = dataSet[ii][2];
                                            dataPoints[dataPoint] = dataSet[ii][1];
                                            //console.log(id + " Keeping " + dataPoint);
                                           }
                                       }
                                     else
                                       {
                                        dataSet = data_sets[i].data;
                                        for(ii = 0; ii < dataSet.length; ii++)
                                           {
                                            var nullPoint         = dataSet[ii][2];
                                            nullPoints[nullPoint] = 1;
                                            //console.log(id + " Nulling " + nullPoint);
                                           }
                                       }
                                    }

                                 for(i = 0; i < data_sets[0].data.length; i++)
                                    {
                                      if(typeof nullPoints[i] !== "undefined")
                                        {
                                         //console.log(" Nulling " + i);
                                         data_sets[0].data[i][1] = null;
                                        }
                                      else if(typeof dataPoints[i] !== "undefined")
                                        {
                                         //console.log(" Nulling " + i);
                                         data_sets[0].data[i][1] = data_sets[0].data[i][3];
                                        }
                                      else
                                        {
                                         //console.log(" Keeping " + i);
                                        }
                                     }
                                 data.push(data_sets[0]);

                                 // Determine min/max of xaxis
                                 //
                                 var axes  = plot.getAxes();
                                 var Ticks = setTicks(axes.xaxis.min, axes.xaxis.max);
                             
                                 jQuery.plot(jQuery("#placeholder"), data,
                                                                     jQuery.extend(true, 
                                                                                   {}, 
                                                                                   options, 
                                                                                   {
                                                                                     xaxis: { min: axes.xaxis.min, max: axes.xaxis.max, ticks: Ticks }
                                  }));
                               });
            
    // Connect plot and overview
    //
    $("#placeholder").unbind("plotselected");
    $("#placeholder").bind("plotselected", function (event, ranges) {
        // clamp the zooming to prevent eternal zoom
        if (ranges.xaxis.to - ranges.xaxis.from < 0.00001)
            ranges.xaxis.to = ranges.xaxis.from + 0.00001;
        if (ranges.yaxis.to - ranges.yaxis.from < 0.00001)
            ranges.yaxis.to = ranges.yaxis.from + 0.00001;

        // Set interval of labeling
        //
        //var interval = setInterval(ranges.xaxis.from, ranges.xaxis.to);
        var Ticks    = setTicks(ranges.xaxis.from, ranges.xaxis.to);
        //alert("Interval " + interval.join(", "));
        
        // do the zooming
        plot = $.plot($("#placeholder"), data,
                      $.extend(true, {}, options, {
                               xaxis: { min: ranges.xaxis.from, max: ranges.xaxis.to, ticks: Ticks }
                      }));
        
        // don't fire event on the overview to prevent eternal loop
        overview.setSelection(ranges, true);
    });
    $("#overview").unbind("plotselected");
    $("#overview").bind("plotselected", function (event, ranges) {
        plot.setSelection(ranges);
    });

    // Hover
    //
    $("#placeholder").bind("plothover", function (event, pos, item) {

        if($("#enableTooltip").prop("checked") === true)
          {
            if(item)
              {
                if(previousPoint != item.datapoint)
                  {
                    previousPoint     = item.datapoint;

                    var pt_index      = item.series.data[item.dataIndex][2];
                    console.log("Point " + pt_index);

                    var tooltip       = lev_vas[pt_index]; 
                    
                    $("#tooltip").remove();

                    showTooltip(item.pageX, item.pageY, tooltip);
                }
            }
            else {
                $("#tooltip").remove();
                previousPoint = null;            
            }
        }
      });

   // Monitor approval
   //
   jQuery('#enableAgingtip').click(function() 
     {
      // Remove any shaded periods
      //
      var axes  = plot.getAxes();
      var Ticks = setTicks(axes.xaxis.min, axes.xaxis.max);

      jQuery.plot(jQuery("#placeholder"), 
                  data,
                  jQuery.extend(true, 
                                {}, 
                                options, 
                                {
                                 xaxis: { min: axes.xaxis.min, max: axes.xaxis.max, ticks: Ticks },
                                 grid: { 
                                        hoverable: true,
                                        clickable: true,
                                        hoverFill: '#444',
                                        hoverRadius: 5
                                       }}));

      // Show approval periods
      //
      if(jQuery("#enableAgingtip").prop('checked'))
        {
          for(var i = 0; i < data_aging_list.length; i++)
            {
              var data_aging_code  = data_aging_list[i].data_aging_code;
              var data_aging_color = jQuery("#legend_" + data_aging_code).css('color');
              jQuery("#color_" + data_aging_code).css('background-color',data_aging_color);
            }
          jQuery(".data_aging").show();
        }
        
      // Disable approval periods
      //
      else
        {
          jQuery(".data_aging").hide();
          var message = "Removing any approval or provisional periods from graph";

          placeholder_offset = jQuery("#placeholder").offset();
          placeholder_height = jQuery("#placeholder").height();
          placeholder_width  = jQuery("#placeholder").width();
          placeholder_left   = placeholder_offset.left + placeholder_width;
          placeholder_top    = placeholder_offset.top;

          showMessagetip(placeholder_left, placeholder_top, 0, 0, message);
          closeMessagetip(2000);
                             
         var axes  = plot.getAxes();
         var Ticks = setTicks(axes.xaxis.min, axes.xaxis.max);

         jQuery.plot(jQuery("#placeholder"), 
                     data,
                     jQuery.extend(true, 
                                   {}, 
                                   options, 
                                   {
                                    xaxis: { min: axes.xaxis.min, max: axes.xaxis.max, ticks: Ticks },
                                    grid: { 
                                           hoverable: true,
                                           clickable: true,
                                           hoverFill: '#444',
                                           hoverRadius: 5
                                          }}));
          }
     });

    // Function to show data aging bars
    //
    function showDataAging(x, y, id, data_aging_sets) 
      {
        jQuery("#messagetip").remove();
        jQuery("#tooltip").remove();
    
        // Set agency cd and site_no
        //
        var agencyRe  = /[_]/;
        var agency_cd = "USGS";
        var site_no   = id;

        if(agencyRe.test(id))
          {
            agency_cd = id.split(/[_]/)[0];
            site_no   = id.split(/[_]/)[1];
          }
         
        // Set
        //
        var message           = 'No approval/provisional periods determined for ' + [ agency_cd, site_no ].join(" ");
        var approved_color    = jQuery("#legend_A").css('color');
        var provisional_color = jQuery("#legend_P").css('color');
        var markings          = [];
         
        // Show approval/provisional periods
        //
        if(typeof data_aging_sets !== "undefined" && data_aging_sets.length > 0) 
          {
            for(var i = 0; i < data_aging_sets.length; i++)
               {
                 var label         = data_aging_sets[i].label;
                 var data_aging_id = data_aging_sets[i].id;
                 if(id === data_aging_id)
                   {
                     message = 'Adding the approval/provisional periods for ' + [ agency_cd, site_no ].join(" ");
                     var data_aging_codes     = data_aging_sets[i].data;
                     for(var ii = 0; ii < data_aging_codes.length; ii++)
                        {
                          data_aging_start = data_aging_codes[ii][0];
                          data_aging_end   = data_aging_codes[ii][1];
                          data_aging_code  = data_aging_codes[ii][2];
                          color_background = jQuery("#legend_" + data_aging_code).css('color');
                          markings.push({ xaxis: { from: new Date(data_aging_start).getTime(), to: new Date(data_aging_end).getTime() }, color: color_background});
                        }
                     break;
                   }
               }
          }
   
        // Show message for approval/provisional periods
        //
        showMessagetip(x, y, 0, 0, message);
        closeMessagetip(2000);
                                 
        // Show approval/provisional periods
        //
        var axes  = plot.getAxes();
        var Ticks = setTicks(axes.xaxis.min, axes.xaxis.max);
    
        jQuery.plot(jQuery("#placeholder"), 
                    data,
                    jQuery.extend(true, 
                                  {}, 
                                  options, 
                                  {
                                  xaxis: { min: axes.xaxis.min, max: axes.xaxis.max, ticks: Ticks },
                                   grid: { 
                                          hoverable: true,
                                          clickable: true,
                                          hoverFill: '#444',
                                          hoverRadius: 5,
                                          markings: markings
                                         }}));
      }

  }

function showTooltip(x, y, contents) 
  {
    $('<div id="tooltip" class="flot_tooltip">' + contents + '</div>').css( {
        top:  y - 15,
        left: x + 15
          }).appendTo("body").fadeIn(200);
    //}).appendTo("#placeholder").fadeIn(200);
          //}).appendTo("body").fadeIn(200);
          //}).appendTo("body");

    //alert("Tooltip X: " + x + " Y: " + y);

    //$("#tooltip").corner( "cc: #000").css("padding","6px");
    //$("#placeholder").css( { "z-index": dz });
  }

function coordIn(element) {
  var x_coordinate = null;
  var y_coordinate = null;

  $('#' + element).mousemove(function (e) {
                         x_coordinate = e.clientX - $('#' + element).offset().left;
                         y_coordinate = e.clientY - $('#' + element).offset().top;
                       });
  return { x: x_coordinate, y: y_coordinate };
}
