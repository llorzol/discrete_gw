/**
 * Namespace: Framework_Cell_Log
 *
 * Framework_Cell_Log is a JavaScript library to build a single column of 
 *  framework information from the subsurface geologic layers.
 *
 * Special layout for MERAS and OZARKS projects (no tabs).
 *
 * version 1.26
 * September 7, 2017
*/

/*
###############################################################################
# Copyright (c) 2017 Oregon Water Science Center
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
var aboutFiles         = {
                           "welcome" :              "framework_welcome.txt",
                           "general_instructions" : "framework_general_instructions.txt",
                           "contacts" :             "framework_contacts.txt"
                         };

var frameworkFile      = "framework_parameters.js";

var map;
var configuration      = '{ "type": "map", "layers": { "group": { "name": "well log",             "type": "marker", "details": "lat: -360, lng: -180", "latlng": [ -360, -180 ] } } }';

var map_options        = '{ "controls": { "zoom": false, "layers": { "autoZIndex": false, "sortLayers": false },';
map_options           += ' "attribution": { "prefix": "<a href= "https://github.com/gherardovarando/leaflet-map-builder"> leaflet-map-builder</a>" } },';
map_options           += ' "tooltip": { "marker": false, "polyline": false, "polygon": false, "circle": false, "rectangle": false }, ';
map_options           += ' "popup": { "marker": true, "polyline": false, "polygon": false, "circle": false, "rectangle": false     } }';

// Prepare when the DOM is ready 
//
$(document).ready(function() 
  {
    // Insert welcome text
    //
    var InfoText     = loadText(aboutFiles["welcome"]);
    
    jQuery("#aboutContent").html(InfoText);

    // Parse url
    //
    longitude        = jQuery.url.param("longitude");
    latitude         = jQuery.url.param("latitude");
    x_coordinate     = jQuery.url.param("x_coordinate");
    y_coordinate     = jQuery.url.param("y_coordinate");
    //tiffs            = jQuery.url.param("tiffs");
    //color_file       = jQuery.url.param("color_file");

    // Retrieve model and modflow information
    //
    var myInfo       = getInfo(frameworkFile);

    var script_http  = myInfo.script_http;
    var rasters      = myInfo.rasters;
    var color_file   = myInfo.color_file;

    var northwest    = [ myInfo.northwest_x, myInfo.northwest_y ].join(",");
    var northeast    = [ myInfo.northeast_x, myInfo.northeast_y ].join(",");
    var southwest    = [ myInfo.southwest_x, myInfo.southwest_y ].join(",");
    var southeast    = [ myInfo.southeast_x, myInfo.southeast_y ].join(",");

    coordinates      = {
                        "longitude"    : longitude,
                        "latitude"     : latitude,
                        "x_coordinate" : x_coordinate,
                        "y_coordinate" : y_coordinate
                       };

    // Build cell log
    //
    var myData = createLog(coordinates, script_http, rasters, color_file);

  });
 
// Create Log
//
function createLog (coordinates, script_http, rasters, color_file) 
  {
    // Request for cell log information
    //
    var request_type = "GET";
    script_http      = [script_http, "framework_well_log.pl"].join("/");
    var data_http    = "";
        data_http   += "longitude=" + coordinates.longitude;
        data_http   += "&latitude=" + coordinates.latitude;
        data_http   += "&x_coordinate=" + coordinates.x_coordinate;
        data_http   += "&y_coordinate=" + coordinates.y_coordinate;
        data_http   += "&rasters=" + rasters;
        data_http   += "&color=" + color_file;

    var dataType    = "json";

    webRequest(request_type, script_http, data_http, dataType, BuildCellGeometry);

  }

function YtickFormatter(v, axis)
  { 
   vv = v ; 
   return vv;
  }

function roundNumber(num, dec) {
	var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
	return result;
}

function Y2tickFormatter(v, axis)
  { 
   vv = v;
   if(y_axis_interval > 2)
     {
      vv = roundNumber(vv, 0)
     }
   else
     {
      vv = roundNumber(vv, 2)
     }

   return vv;
  }
   
function showTooltip(name, x, y, contents) 
  {
    //alert("Tooltip " + contents + " at (" + x + ", " + y + ")");
    jQuery('<div id="tooltip">' + contents + '</div>').css( {
              top: y + 5,
              left: x + 5
          }).appendTo("#" + name).fadeIn(200);
  }

function locationMap(latitude, longitude)
  {
   console.log("locationMap " + longitude + " " + latitude);

   var map = L.map('map').setView([latitude, longitude], 14);

   L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 17,
      minZoom: 9
    }).addTo(map);

   var color  = "#f06c00";
   var radius = 5;

   var circle = L.circleMarker([latitude, longitude], 
                               { 
                                radius: radius,
                                color: color,
                                fillColor: color,
                                fillOpacity: 0.15
   }).addTo(map);

  }

function BuildCellGeometry(json_data)
  { 
   // No subsurface
   //
   if(json_data.status != "success") 
     {
      var message = json_data.warning;
      if(typeof json_data.error !== "undefined") {message = json_data.error;}
      if(typeof json_data.warning !== "undefined") {message = json_data.warning;}

      openModal(message);
      fadeModal(3000);
      return;
     }

   // Check for returning warning or error
   //
   var message       = json_data.warning;
   if(typeof message !== "undefined") 
     {
      openModal(message);
      fadeModal(3000);
      return;
     }

   // Close modal dialog
   //
   closeModal();

   // General information
   //
   longitude         = json_data.longitude;
   latitude          = json_data.latitude;
   easting           = json_data.easting;
   northing          = json_data.northing;
   row               = json_data.row;
   col               = json_data.column;
   rows              = json_data.nrows;
   columns           = json_data.ncols;
   time_units        = json_data.time_units;
   length_units      = json_data.length_units;
   cell_width        = json_data.cell_width;
   x_axis_min        = json_data.x_axis_min;
   x_axis_max        = json_data.x_axis_max;
   y_axis_min        = json_data.y_axis_min;
   y_axis_max        = json_data.y_axis_max;
   cell_count        = json_data.cell_count;

   var LegendHash    = new Object();
   var ToolTipHash   = new Object();
   data              = [];
   data_sets         = [];
   color_scheme      = [];

   plot              = "";
   
   // No cell records
   //
   var cell_count = json_data.cell_count;
   if(cell_count <= 0)
     {
      var warning  = "<p><b>No cell geometry for this row " + row + " and column " + col + "</b></p>";
      warning     += "<p><b>    All cells inactive</b></p>";
      openModal(message);
      return;
     }

   else
     {
      // Build explanation
      // 
      var i = 0;
      var legend_html = [];
      legend_html.push('<table id="legend" class="cell_table" border="1">');
      legend_html.push(' <caption>' + "Explanation" + '</caption>');

      legend_html.push(' <thead>');
      legend_html.push(' <tr>');
      legend_html.push('  <th>Top<sup>1</sup></th>');
      legend_html.push('  <th>Bottom<sup>1</sup></th>');
      legend_html.push('  <th>Altitude</th>');
      legend_html.push('  <th>Thickness</th>');
      legend_html.push('  <th>Geologic Unit</th>');
      legend_html.push(' </tr>');
      legend_html.push(' </thead>');

      legend_html.push(' <tbody>');

      // Set color specification array
      //
      var color_scheme = new Array();
               
      var cells        = json_data.well_log;
      var top          = 0;
      for(i = 0; i < cells.length; i++)
         {
          var unit        = cells[i].unit;
          var top_elev    = cells[i].top;
          var bot_elev    = cells[i].bottom;
          var thickness   = top_elev - bot_elev;
          var bot         = top - thickness;
          var color       = cells[i].color;
          var explanation = cells[i].description;
          var id          = color.replace("#","") 
          var label       = id;

          console.log("Unit " + unit + " top " + top + " bottom " +  bot);

          // Build explanation
          // 
          legend_html.push(' <tr bgcolor="' + color + '">');

          legend_html.push(' <td>');
          legend_html.push('  <div class=legendDepth>' + Math.abs(top).toFixed(0) + '</div>');
          legend_html.push(' </td>');

          legend_html.push(' <td>');
          legend_html.push('  <div class=legendDepth>' + Math.abs(bot).toFixed(0) + '</div>');
          legend_html.push(' </td>');

          legend_html.push(' <td>');
          legend_html.push('  <div class=legendDepth>' + top_elev.toFixed(0) + '</div>');
          legend_html.push(' </td>');

          if(i < cells.length - 1)
            {
             legend_html.push(' <td>');
             legend_html.push('  <div class=legendDepth>' + Math.abs(thickness).toFixed(0) + '</div>');
             legend_html.push(' </td>');
            }
          else
            {
             legend_html.push(' <td>');
             legend_html.push('  <div class=legendDepth>not determined</div>');
             legend_html.push(' </td>');
            }

          legend_html.push(' <td style="background-color:#FFFFFF">');
          legend_html.push('  <div id="label_' + label + '" class="legendLabel">' + explanation + '</div>');
          legend_html.push(' </td>');

          legend_html.push(' </tr>');

          var rock_id     = i;
                           
          if(top_elev !== null) 
            {
             //alert("Adding " + explanation);
             color       = cells[i].color;
             color_scheme.push(color);
                    
             rock = [];
             rock.push([        0.0, Math.abs(top)]);
             rock.push([ cell_width, Math.abs(top)]);
             rock.push([ cell_width, Math.abs(bot)]);
             rock.push([        0.0, Math.abs(bot)]);
             rock.push([        0.0, Math.abs(top)]);
             data_sets.push(
                            { 
                             label: label,
                             id   : rock_id,
                             xaxis : 1,
                             yaxis : 1,
                             lines: { show :      true, 
                                      lineWidth : 0,
                                      fill :      1.0
                                    },
                             data : rock
                            }
                           );
             LegendHash[label] = 1;
             graph_count       = 1;
             top               = bot;
            }
         }

      legend_html.push(' <tr><td id="cell_bottom" colspan="5"><sup>1</sup>' + "Values are depth below land surface, in feet" + '</td></tr>');
      legend_html.push(' </tbody>');
      legend_html.push('</table>');
              
      // Hard-code color indices to prevent them from shifting as
      // elements are turned on/off
      var i = 0;
      jQuery.each(data_sets, function(key, val) {
          val.color = i;
          //val.color = val.id;
          ++i;
      });
     }

   // Page title
   //
   var title = "Geologic Information at Longitude " + parseFloat(longitude).toFixed(4) + " Latitude " + parseFloat(latitude).toFixed(4);
   jQuery(document).prop("title", title);
   jQuery("#page_title").html(title);

   // Data
   //
   data = data_sets;
                                                       
   // Y axes
   //
   var yaxes = [];

   // Left Y axis
   //
   var y2_axis_max = y_axis_max - y_axis_min;
   var y2_axis_min = 0;
   yaxes.push(
              { 
               show: true,
               position: 'left',
               min: y2_axis_min,
               max: y2_axis_max,
               transform: function (v) { return -v; },
               inverseTransform: function (v) { return -v; },
               font: {size: 10, weight: "bold", color: "#000000"},
               axisLabel: "DEPTH BELOW LAND SURFACE IN FEET",
               axisLabelUseCanvas: true,
               axisLabelFontSizePixels: 12,
               axisLabelFontFamily: "Verdana, Arial, Helvetica, Tahoma, sans-serif",
               axisLabelPadding: 10
              });

   // Right Y axis
   //
   yaxes.push(
              { 
               show: true,
               position: 'right',
               min: y_axis_min,
               max: y_axis_max,
               tickFormatter: function ( val, axis ) {
                      return val;
                  },
               font: {size: 10, weight: "bold", color: "#000000"},
               axisLabel: "ELEVATION, IN FEET",
               axisLabelUseCanvas: true,
               axisLabelFontSizePixels: 12,
               axisLabelFontFamily: "Verdana, Arial, Helvetica, Tahoma, sans-serif",
               axisLabelPadding: 10
              });
                                                        
   // Graph options
   //
   var options = {
                  legend: { 
                           show: false 
                          },
                  lines: { show: true, lineWidth: 1 },
                  points: { show: false },
                  grid: { 
                         aboveData: true,
                         color: "#000000",
                         borderWidth: 2.0,
                         hoverable: true, 
                         clickable: true,
                         hoverFill: '#444',
                         hoverRadius: 5
                        },
                  
                  yaxes:  yaxes,
                  xaxis: { show: false },
                  colors: color_scheme,
                  selection: { mode: "xy" }
                 };
                    
   // Graph plot
   //
   plot = jQuery.plot(jQuery("#cell_graph"), data_sets, options);
 
   // Legend
   //
   jQuery("#cell_table").html(legend_html.join(""));

   $(':checkbox').click(function() 
                                {
                                 //var selected   = jQuery(this).prop('name');
                                 var id         = jQuery(this).prop('id');
                                 var isChecked  = jQuery(this).prop('checked');
                                 var name       = jQuery(this).prop('name');
                                 var legendshow = LegendHash[id];
                                 //alert("Legend id " + id + " name " + name + " checked " + isChecked + " legend " + legendshow);
                                    
                                 // Remove data set
                                 //
                                 if(legendshow > 0)
                                   {
                                    LegendHash[id] = 0;
                                    jQuery('#label_' + id).css({ "opacity": 0.4 });
                                    jQuery('#legend_' + id).css({ "opacity": 0.4 });
                                   }
                                 else
                                   {
                                    LegendHash[id] = 1;
                                    jQuery('#label_' + id).css({ "opacity": 1.0 });
                                    jQuery('#legend_' + id).css({ "opacity": 1.0 });
                                   }
                                 
                                 data = [];
                                 for(i = 0; i < data_sets.length; i++)
                                    {
                                     var id = data_sets[i].label;
                                     if(LegendHash[id] > 0)
                                       {
                                        data.push(data_sets[i]);
                                       }
                                    }
        
                                 // Determine min/max of xaxis
                                 //
                                 var axes = plot.getAxes();
                             
                                 jQuery.plot(jQuery("#cell_graph"), data,
                                                                          jQuery.extend(true, {}, options, {
                                                                                                            xaxis: { min: axes.xaxis.min, max: axes.xaxis.max },
                                                                                                            yaxis: { min: axes.yaxis.min, max: axes.yaxis.max }
                                                                                                           }
                                  ));
                               });
   
      var previousPoint = null;
      jQuery("#cell_graph").bind("plothover", function (event, pos, item) {
    
          // Check to see if axes are enabled
          //
          if(typeof pos.x === "undefined") { return; }
          if(typeof pos.y === "undefined") { return; }
                   
          jQuery("#x").text(Math.abs(pos.x.toFixed(0)));
          jQuery("#y").text(pos.y.toFixed(0));
               
          if(jQuery("#enableTooltip").is(':checked')) {
              if (item) {
                  if (previousPoint !== item.datapoint) {
                      previousPoint = item.datapoint;
                      
                      jQuery("#tooltip").remove();

                      var x = item.datapoint[0].toFixed(0);
                      var y = item.datapoint[1].toFixed(0);
                         
                      var contents = ToolTipHash[item.series.label] + " Altitude " + y;
                        
                      var label_offset  = jQuery("#cell_graph").offset();
                      var labelX_offset = label_offset.left;
                      var labelY_offset = label_offset.top;

                      x = item.pageX - labelX_offset;
                      y = item.pageY - labelY_offset;
                      
                      showTooltip("cell_graph", x, y, contents);
                  }
              }
              else {
                  jQuery("#tooltip").remove();
                  previousPoint = null;            
              }
          }
      });
   
      jQuery("#cell_graph").bind("plotclick", function (event, pos, item) {
          if (item) {
              jQuery("#clickdata").html("<br>You clicked on " + item.series.label + ".");
              plot.highlight(item.series, item.datapoint);
          }
      });
   
      // Legend
      //
      jQuery('.legendColorBox').click(function() {
                                             selected = jQuery(this).siblings().text();
                                             color    = jQuery(this).siblings().length;
                                             var legendshow = LegendHash[selected];
                                             //alert("Legend " + selected + " color " + color + " object " + jQuery(this).siblings().toSource());
                                                            
                                             var data = [];
                                             for(i = 0; i < data_sets.length; i++)
                                                {
                                                 if(data_sets[i].label == selected)
                                                   {
                                                    // Hide
                                                    //
                                                    if(legendshow > 0)
                                                      {
                                                       LegendHash[selected] = 0;
                                                      }
                                                    else
                                                      {
                                                       LegendHash[selected] = 1;
                                                       data.push(data_sets[i]);
                                                      }
                                                   }
                                                 else
                                                   {
                                                    var data_name = data_sets[i].label;
                                                    if(LegendHash[data_name] > 0)
                                                      {
                                                       data.push(data_sets[i]);
                                                      }
                                                   }
                                                }
                                                             
                                             jQuery.plot(jQuery("#cell_graph"), data, options);
                                           });

   locationMap(latitude, longitude);
  }
