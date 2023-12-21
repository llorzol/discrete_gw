/* NwisWeb Javascript plotting library for jQuery and flot.
 *
 * Gw_Graphing is a JavaScript library to graph NwisWeb groundwater information
 * such as the discrete groundwater measurements for a site(s).
 *
 * version 1.23
 * January 5, 2015
 */

/*
###############################################################################
# Copyright (c) 2015 NwisWeb
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
      
function plotGw(mySites, SiteInfo, GwInfo) 
  {
    // Set variables
    //
    var x_axis_min     =  9999999999999999999;
    var x_axis_max     = -9999999999999999999;

    var y_axis_min     =  9999999999999999999;
    var y_axis_max     = -9999999999999999999;

    // Site information
    //
    var site_key       = mySites.shift();

    agency_cd          = SiteInfo[site_key].agency_cd;
    site_no            = SiteInfo[site_key].site_no;
    station_nm         = SiteInfo[site_key].station_nm;
    hole_depth_va      = parseFloat(SiteInfo[site_key].hole_depth_va);
    well_depth_va      = parseFloat(SiteInfo[site_key].well_depth_va);
    alt_va             = parseFloat(SiteInfo[site_key].alt_va);
    alt_acy_va         = SiteInfo[site_key].alt_acy_va;
    alt_datum_cd       = SiteInfo[site_key].alt_datum_cd;

    var siteInfo       = [];
    siteInfo.push("<ul>");
    siteInfo.push(" <li>");
    siteInfo.push(" Agency code: " + agency_cd);
    siteInfo.push(" </li>");
    siteInfo.push(" <li>");
    siteInfo.push(" Hole depth: " + hole_depth_va);
    siteInfo.push(" </li>");
    siteInfo.push(" <li>");
    siteInfo.push(" Well depth: " + well_depth_va);
    siteInfo.push(" </li>");
    siteInfo.push(" <li>");
    siteInfo.push(" Site altitude: " + alt_va);
    siteInfo.push(" </li>");
    siteInfo.push(" <li>");
    siteInfo.push(" Vertical reference datum: " + alt_datum_cd);
    siteInfo.push(" </li>");
    siteInfo.push(" <li>");
    siteInfo.push(" Vertical accuracy: " + alt_acy_va);
    siteInfo.push(" </li>");
    siteInfo.push("</ul>");
    $("#site_tx").html(siteInfo.join("\n")); 
          
    var alt_round_va   = roundAlt(alt_acy_va);

    // Groundwater information
    //
    var myData          = GwInfo[site_key].myData;
    var lev_age_cds     = GwInfo[site_key].lev_age_cds;
    var lev_status_cds  = GwInfo[site_key].lev_status_cds;
    var lev_agency_cds  = GwInfo[site_key].lev_agency_cds;
    var sl_datum_cds    = GwInfo[site_key].sl_datum_cds;
  
    // Check the number of reference datum
    //
    var datum_count     = [];
    for (var sl_datum_cd in sl_datum_cds)
      {
        datum_count.push(sl_datum_cd);
      }
    if(datum_count.length > 1)
      {
        var window_width   = jQuery(window).width();
        var html_width     = jQuery(document).width();
        var dialog_width   = html_width * 0.70;
        if(window_width < html_width) { dialog_width = window_width * 0.70; }

        var output_tx = "<p><strong>\n";
        output_tx    += "Graphing option not available. This well has multiple water-level datums (";
        output_tx    += datum_count.join(", ") + ")<br />";
        output_tx    += "See other output formats such as 'Table of data' for more information.";
        output_tx    += "</strong></p>\n";

        jQuery(".discrete_gw_graphing_tool").css( { width: window_width } );
        jQuery(".discrete_gw_graphing_tool").html(output_tx);

        return false;
      }
  
    // Waterlevel
    //
    var lev_va_count    = 0;
    var sl_lev_va_count = 0;
    var data_gap_nu     = 31536000000;
    var last_lev_dt     = null;
    var data_aging      = [];
    var last_lev_age_cd = null;
    var statusOnly      = /^[CNOW]$/g;

    for(var count in myData)
       {
         var lev_dt        = myData[count].lev_dt;
         var lev_tm        = myData[count].lev_tm;
         var lev_tz_cd     = myData[count].lev_tz_cd;
         var lev_va        = myData[count].lev_va;
         var sl_lev_va     = myData[count].sl_lev_va;
         var sl_datum_cd   = myData[count].sl_datum_cd;
         var lev_status_cd = myData[count].lev_status_cd;
         var lev_agency_cd = myData[count].lev_agency_cd;
         var lev_dt_acy_cd = myData[count].lev_dt_acy_cd;
         var lev_acy_cd    = myData[count].lev_acy_cd;
         var lev_src_cd    = myData[count].lev_src_cd;
         var lev_meth_cd   = myData[count].lev_meth_cd;
         var lev_age_cd    = myData[count].lev_age_cd;

         var lev_va_str    = null;
         var value         = null;

         //alert("lev_dt " + lev_dt + " lev_tm " + lev_tm + " lev_va " + lev_va + " sl_lev_va " + sl_lev_va);

         if(lev_status_cd.length < 1) { lev_status_cd = "static"; }

         if(lev_va.length > 0)
           {
             lev_va_str = lev_va.toString();
             lev_va     = parseFloat(lev_va);
             value      = lev_va;
             lev_va_count++;
           }

         else
           {
             if(sl_lev_va.length > 0)
               {
                 lev_va_str = sl_lev_va.toString();
                 sl_lev_va  = parseFloat(sl_lev_va);
                 value      = sl_lev_va;
                 if(alt_va.toString().length > 0) 
                   { 
                     value      = alt_va - sl_lev_va;
                   }
                 //alert("  Alt " + alt_va + " -> " + sl_lev_va + " --> " + value);
                 sl_lev_va_count++;
               }
           }

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

         // Add status
         //
         if(lev_age_cd.length > 0)
           {
             if(last_lev_age_cd === null)
               {
                 data_aging.push( [datetime, datetime, lev_age_cd] );
               }
             else
               {
                 if(lev_age_cd === last_lev_age_cd)
                   {
                     data_aging[data_aging.length - 1][1] = datetime;
                   }
                 else
                   {
                     data_aging[data_aging.length - 1][1] = datetime;
                     data_aging.push( [datetime, datetime, lev_age_cd] );
                   }
               }
           }
         last_lev_age_cd = lev_age_cd;

         if(lev_tz_cd.length > 0)
           {
             //lev_dt_str += " " + lev_tz_cd;
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
             // Add status
             //
             if(typeof status_mts[lev_status_cd] === "undefined")
               {
                 status_mts[lev_status_cd] = {};
                 var definition            = lev_status_cd;
                 //alert("Status |" + lev_status_cd + "| -> |" + lev_status_cds[lev_status_cd] + "|");
                 if(typeof lev_status_cds[lev_status_cd] !== "undefined")
                   {
                     definition = lev_status_cds[lev_status_cd];
                   }
                 status_mts[lev_status_cd].definition = definition;
                 status_mts[lev_status_cd].points     = [];
               }

             // Dry status
             //
             if(lev_status_cd === "D")
               {
                 if(hole_depth_va !== null)
                   {
                     value = hole_depth_va;
                     lev_va_count++;
                   }
                 else if(well_depth_va !== null)
                   {
                     value = well_depth_va;
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
                 if(lev_va.length < 1 && sl_lev_va.length < 1)
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
                 if(lev_va.length < 1 && sl_lev_va.length < 1)
                   {
                     value = "null";
                   }
               }
                    
             // Set status
             //
             var points = status_mts[lev_status_cd].points;
             points.push([ datetime, value, count]);
             status_mts[lev_status_cd].points = points;
           }
             
         // Set min and max
         //
         if(value !== null)
           {
             if(value > y_axis_max) { y_axis_max = value; }
             if(value < y_axis_min) { y_axis_min = value; }
           }

         data[count]                  = [ datetime, value, count ];

         lev_vas[count]               = {};
         lev_vas[count].lev_va        = lev_va_str;
         lev_vas[count].lev_dt        = lev_dt_str;
         lev_vas[count].lev_tz_cd     = lev_tz_cd;
         lev_vas[count].lev_meth_cd   = null;
         lev_vas[count].lev_status_cd = lev_status_cd;
         lev_vas[count].lev_agency_cd = lev_agency_cd;
         count++;
       }

    // No water-level measurements could be graphed
    //
    if(lev_va_count < 1 && sl_lev_va_count < 1)
      {
        var window_width   = jQuery(window).width();
        var html_width     = jQuery(document).width();
        var dialog_width   = html_width * 0.70;
        if(window_width < html_width) { dialog_width = window_width * 0.70; }

        var output_tx = "<p><strong>\n";
        output_tx    += "Graphing option not available. No water-level measurements taken at site due to dry, flowing, and other conditions.\n";
        output_tx    += "<br />";
        output_tx    += "See other output formats such as 'Table of data' for more information.";
        output_tx    += "</strong></p>\n";

        jQuery(".discrete_gw_graphing_tool").css( { width: window_width } );
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

    // Add records
    //
    var points       = { show: true, symbol: "circle" };
    var lines        = { show: true };
    var color_no     = 0;
    var color        = ColorHash[++color_no];
    var id           = site_key + "_discrete";
    LegendHash[id]   = 1;
    color_scheme.push(color);
    data_sets.push(
                   { 
                    label : "Measured values",
                    id    : id,
                    data  : data,
                    color : color,
                    xaxis : 1,
                    yaxis : 1,
                    lines : lines,
                    points: points
                   }
                  );

    // Add status-only records
    //
    for ( var status_cd in status_mts)
      {
        var color      = ColorHash[++color_no];
        color_scheme.push(color);
        var definition = status_mts[status_cd].definition;
        var pts        = status_mts[status_cd].points;
        var id         = site_key + "_" + status_cd;
        LegendHash[id] = 1;
        data_sets.push(
                       { 
                        label : definition,
                        id    : id,
                        data  : pts,
                        color : color,
                        xaxis : 1,
                        yaxis : 1,
                        lines: { show: false },
                        points: { show: true, symbol: "circle" }
                       });
      }

    // Add data aging
    //
    var id           = site_key;
    data_aging_sets.push(
                         { 
                          id           : id,
                          label        : "label_" + id,
                          parameter_cd : "gw",
                          dd_parameter : "gw",
                          data         : data_aging
                      });
    
   // Change title
   // 
   $("#graphs").show(); 
   //$("#plot_title").text(agency_cd + " " + site_no + " " + station_nm);
   $("#header").html("Groundwater Measurement Information for Site " + agency_cd + " " + site_no + " " + station_nm);
   $(document).prop("title", "Groundwater Measurement Information for Site " + agency_cd + " " + site_no + " " + station_nm);
                                                       
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
               font: {size: 10, weight: "bold", color: "#000000"}
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
                   tickFormatter: function ( val, axis ) {
                      //return val.toFixed(alt_round_va);
                          return val;
                      },
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
                   tickFormatter: function ( val, axis ) {
                      //return val.toFixed(alt_round_va);
                          return val;
                      },
                   font: {size: 10, weight: "bold", color: "#000000"}
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
                                                       
   // Graph plot
   //
   plot = $.plot($("#placeholder"), data_sets, options);
   jQuery('.loading').remove();
   jQuery('#enableTooltip').prop('checked',false);
   jQuery('#enableAgingtip').prop('checked',false);
                                                       
   // Add title to canvas
   //
   //var canvas  = plot.getCanvas();
   //var offSet  = $("#placeholder").offset();
   //var context = canvas.getContext("2d");
   //var text    = agency_cd + " " + site_no + " " + station_nm;

   //context.font = "12px helvetica";
   //context.fillText(text,offSet.left,offSet.top);
   //context.fillText(text+"2",offSet.top,offSet.left);
   //AddText2Canvas(plot_canvas, "#placeholder", agency_cd + " " + site_no + " " + station_nm);

    // Overview
    //
    overview = $.plot($("#overview"), data_sets, {
                                              legend: { show: false },
                                              lines: { show: true, lineWidth: 1 },
                                              shadowSize: 0,
                                              xaxis:  xaxis,
                                              yaxes: oaxes,
                                              grid: { color: "#999" },
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
   
   // Add legend table with checkboxes and values
   // 
   var i = 0;
   var legend_txt = [];
   legend_txt.push('<table id="legend" class="legendTable" border="0">');
   legend_txt.push(' <tbody>');
   legend_txt.push(' <tr><td id="explanation" colspan="4">Explanation</td></tr>');
   jQuery.each(data_sets, function(key, val) {
       val.color         = i;
       var label         = val.label;
       var id            = val.id;
       var y_axis_number = val.yaxis;
       var color         = color_scheme[i];
       var feature_type  = val.points.symbol;
           ++i;
           //alert("Feature " + feature_type);
           if(typeof feature_type ===  "undefined")
             {
               feature_type = "line";
             }

           //alert("Label " + label + " Y axis number " + y_axis_number + " color " + color + " point " + feature_type);
           //alert("Parameter " + label + " for " + id + " with color " + color);
           legend_txt.push('<tr>');
           legend_txt.push(' <td>');
           legend_txt.push('  <div id="value_' + id + '" class="legendValue">&nbsp;&nbsp;&nbsp;</div>');
           legend_txt.push(' </td>');
           legend_txt.push(' <td class="checkBoxes">');
           //legend_txt.push('  <input type="checkbox" name="' + label + '" value="on" id="' + id + '" checked="checked"></input>');
           legend_txt.push('  <input type="checkbox" name="' + id + '" value="on" id="checkbox_' + id + '" checked="checked" />');
           legend_txt.push(' </td>');
           legend_txt.push(' <td>');
           //legend_txt.push("  <div style=\"width:4px;height:0px;border:6px solid #ccc;padding:1px\">");
           if(feature_type === "line")
             {
               legend_txt.push('   <div id="legend_' + id + '" class="legendLine" style="border-bottom: 4px solid ' + color + ';">&nbsp;</div>');
             }
           if(feature_type === "triangle")
             {
               //legend_txt.push('   <div id="legend_' + id + '" class="legendTriangle" style="border: solid ' + color + '">&nbsp;</div>');
               legend_txt.push('   <div id="legend_' + id + '" class="legendTriangle" style="border-color: transparent transparent ' + color + ';">&nbsp;</div>');
             }
           if(feature_type === "circle")
             {
               //legend_txt.push('   <div id="legend_' + id + '" class="legendCircle" style="border-color: ' + color + '">&nbsp;</div>');
               legend_txt.push('   <div id="legend_' + id + '" class="legendCircle" style="border-color: ' + color + '">&nbsp;</div>');
             }
           //legend_txt.push("  </div>");
           legend_txt.push(' </td>');
           legend_txt.push(' <td>');
           legend_txt.push('  <div id="label_' + id + '" class="legendLabel parameterLegend">' + label + '</div>');
           legend_txt.push(' </td>');
           legend_txt.push('</tr>');
  });
   jQuery(".legendCircle").corner("3px");

    // Data aging
    //
    if(typeof lev_age_cds !== "undefined")
      {
        for(var data_aging_code in lev_age_cds)
          {
            var definition = lev_age_cds[data_aging_code];
            data_aging_list.push(
                             {
                              data_aging_code : data_aging_code,
                              definition : definition
                             }
                            );
     
            legend_txt.push('<tr id="legend_' + data_aging_code + '" class="data_aging">');
            legend_txt.push(' <td>&nbsp;</td>');
            legend_txt.push(' <td>&nbsp;</td>');
            legend_txt.push(' <td id="color_' + data_aging_code + '">');
            legend_txt.push('   <div class="legendRectangle">&nbsp;</div>');
            legend_txt.push(' </td>');
            legend_txt.push(' <td><div class="legendLabel">' + definition + '</div></td>');
            legend_txt.push('</tr>');
          }
      }

   legend_txt.push(' </tbody>');
   legend_txt.push('</table>');
   jQuery("#Legend").html(legend_txt.join(""));

    var legends = jQuery(".legendValue");
    legends.each(function () {
        // fix the widths so they don't jump around
        jQuery(this).css('width', jQuery(this).width());
    });

   jQuery(".data_aging").hide();

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
                                 
                                 data = [];
                                 for(i = 0; i < data_sets.length; i++)
                                    {
                                     var id = data_sets[i].id;
                                     if(LegendHash[id] > 0)
                                       {
                                        data.push(data_sets[i]);
                                       }
                                    }
        
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

                    var lev_va        = lev_vas[pt_index].lev_va; 
                    var lev_dt        = lev_vas[pt_index].lev_dt; 
                    var lev_tz_cd     = lev_vas[pt_index].lev_tz_cd; 
                    var lev_meth_cd   = lev_vas[pt_index].lev_meth_cd; 
                    var lev_status_cd = lev_vas[pt_index].lev_status_cd;
                    var lev_agency_cd = lev_vas[pt_index].lev_agency_cd;
                    //alert("[" + [lev_va, lev_dt, lev_tz_cd, lev_meth_cd, lev_status_cd, lev_agency_cd].join(", ") + "]");

                    // Waterlevel
                    //
                    if(lev_va === null) 
                      {
                        lev_va = "";
                        if(lev_status_cd !== null)
                          {
                            if(typeof lev_status_cds[lev_status_cd] !== "undefined")
                              {
                                lev_va        = lev_status_cds[lev_status_cd];
                                lev_status_cd = null;
                              }
                          }
                      }

                    // Time zome
                    //
                    if(lev_tz_cd === null) 
                      {
                        lev_tz_cd = "";
                      }
                        

                    // Method
                    //
                    if(lev_meth_cd !== null) 
                      {
                        //alert("lev_meth_cd " + lev_meth_cd + " -> " + lev_meth_cds[lev_meth_cd]);
                        if(typeof lev_meth_cds[lev_meth_cd] !== "undefined")
                          {
                            var myRe          = /^[U]$/g;
                            if(myRe.test(lev_meth_cd))
                              {
                                lev_meth_cd = "";
                              }
                            else
                              {
                                lev_meth_cd = lev_meth_cds[lev_meth_cd];
                              }
                          }
                      }
                    else 
                      {
                        lev_meth_cd = "";
                      }

                    // Status
                    //
                    //alert("Status " + lev_status_cd);
                    if(lev_status_cd !== null) 
                      {
                        if(typeof lev_status_cds[lev_status_cd] !== "undefined")
                          {
                            lev_status_cd = lev_status_cds[lev_status_cd];
                          }
                        else
                          {
                            lev_status_cd = "Static";
                          }
                      }
                    else 
                      {
                        lev_status_cd = "";
                      }

                    // Agency code
                    //
                    if(lev_agency_cd.length > 0) 
                      {
                        if(typeof lev_agency_cds[lev_agency_cd] !== "undefined")
                          {
                            lev_agency_cd = lev_agency_cds[lev_agency_cd];
                          }
                      }
                    else 
                      {
                        lev_agency_cd = "";
                      }

                    var moreInfo  = "Waterlevel: "; 
                    moreInfo     += lev_va + " "; 
                    if(lev_status_cd.length > 0) { moreInfo += " (" + lev_status_cd + ")"; }
                    moreInfo     += " on " + lev_dt;
                    if(lev_tz_cd.length > 0) { moreInfo += " " + lev_tz_cd; }
                    if(lev_meth_cd.length > 0)
                      {
                        var myRe = /^Reported$/ig;
                        if(myRe.test(lev_meth_cd))
                          {
                            moreInfo += " " + lev_meth_cd;
                          }
                        else
                          {
                            moreInfo += " with " + lev_meth_cd;
                          }
                      }
                    if(lev_agency_cd.length > 0) { moreInfo += " by " + lev_agency_cd; }

                    //moreInfo += "(" + pt_index + ")";
                    
                    $("#tooltip").remove();

                    showTooltip(item.pageX, item.pageY, moreInfo);
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
