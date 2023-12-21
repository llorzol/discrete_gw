/* NwisWeb Javascript plotting library for jQuery and flot.
 *
 * NwisWeb_Tools is a JavaScript library to graph NwisWeb information such as
 * the daily values for a specific parameter(s) for a site(s).
 *
 */

/*
###############################################################################
# Copyright (c) 2013, NwisWeb
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

var x_axis_min           =  9999999999999999999;
var x_axis_max           = -9999999999999999999;

var x_date_min           = -9999999999999999999;
var x_date_max           = -9999999999999999999;

var y_axis_min           =  9999999999999999999;
var y_axis_max           = -9999999999999999999;

var plot;
var overview;
var data_sets            = [];
var data                 = [];
var data_aging_sets      = [];
var data_aging_list      = [];
var screen_code_sets     = [];
var screen_list          = [];
var status_code_sets     = [];
var status_list          = [];
var reference_level_sets = [];
var reference_list       = [];
var LegendHash           = [];
var AgingHash            = [];
var d                    = [];
var yaxes                = [];

var monthNames           = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var weekday              = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function XtickFormatter(val, axis) {
   var d          = new Date(val);
   //alert("Value " + val);
   var delta      = axis.max - axis.min;
   var delta_days = Math.floor(delta / 1000 / 60 / 60 / 24);
   //alert("Range " + delta + " Min date " + axis.min + " Max date " + axis.max);
   var x_label = d.getUTCFullYear();
   if(delta_days > 5 * 365)
     {
      x_label = d.getUTCFullYear();
     }
   else if(delta_days > 365)
     {
      x_label = monthNames[d.getUTCMonth()]  + '<br>' + d.getUTCFullYear();
     }
   else if(delta_days > 90)
     {
      x_label = monthNames[d.getUTCMonth()] + "-" + d.getUTCDate()  + '<br>' + d.getUTCFullYear();
     }
   else if(delta_days > 10)
     {
      x_label = monthNames[d.getUTCMonth()] + '<br>' + d.getUTCDate()  + '<br>' + d.getUTCFullYear();
     }
   else if(delta_days > 5)
     {
      x_label = d.getUTCHours() + ":00" + '<br>' + monthNames[d.getUTCMonth()] + "-" + d.getUTCDate() + '<br>' + d.getUTCFullYear();
     }
   else
     {
      x_label = d.getUTCHours() + ":" + padout(d.getUTCMinutes()) + '<br>' + monthNames[d.getUTCMonth()] + "-" + d.getUTCDate() + '<br>' + d.getUTCFullYear();
     }

   return x_label;
 }

function timeFormat(x_axis_min, x_axis_max) {
   //var d          = new Date(val);
   //var offset     = new Date().getTimezoneOffset();
   //var new_d      = new Date(val + 300 * 60 * 1000);
   //alert("Date " + val + " -> " + d.toUTCString() + " offset " + offset + " new " +  new_d.toUTCString()); 
   var delta      = x_axis_max - x_axis_min;
   var delta_days = Math.floor(delta / 1000 / 60 / 60 / 24);
   var tzOffset   = new Date().getTimezoneOffset();
   //alert("Range " + delta + " Min date " + x_axis_min + " Max date " + x_axis_max + " Offset " + tzOffset);
   //alert("Range " + delta + " Min date " + axis.min + " Max date " + axis.max + " value " + val);
   //d = new_d;
   var x_label = "%Y";
   if(delta_days > 5*365)
     {
      x_label = "%Y";
     }
   else if(delta_days > 365)
     {
      x_label = "%b<br>%Y";
     }
   else if(delta_days > 90)
     {
      x_label = "%b-%d<br>%Y";
     }
   else if(delta_days > 3)
     {
      x_label = "%b<br>%d<br>%Y";
     }
   else
     {
       x_label = "%H:%M<br>%b-%d<br>%Y";
     }

   return x_label;
 }

function padout(number) {
    return (number < 10) ? '0' + number : number;
 }

function ReverseYaxis(v, axis)
  { 
   return -v;
  }

function YtickFormatter(v, axis)
  { 
   vv = -1.0 * v ; 
   return vv;
  }

function Y2tickFormatter(v, axis)
  { 
   vv = alt_va - v; 
   return vv;
  }

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

// Function to locate y axes
//
function getBoundingBoxForAxis(plot, axis) 
  {
   var left = axis.box.left, top = axis.box.top,
       right = left + axis.box.width, bottom = top + axis.box.height;

   // some ticks may stick out, enlarge the box to encompass all ticks
   var cls = axis.direction + axis.n + 'Axis';
   plot.getPlaceholder().find('.' + cls + ' .tickLabel').each(function () {
        var pos = jQuery(this).position();
        left = Math.min(pos.left, left);
        top = Math.min(pos.top, top);
        right = Math.max(Math.round(pos.left) + jQuery(this).outerWidth(), right);
        bottom = Math.max(Math.round(pos.top) + jQuery(this).outerHeight(), bottom);
   });
        
   return { left: left, top: top, width: right - left, height: bottom - top };
  }

function message_dialog(warning) 
  {
   if(jQuery('#message').is(':data(dialog)') == true) 
      {     
       jQuery('#message').delay(4000);
       setTimeout(function() 
                    {
                     $dialog.dialog('close');
                    }, 2000);
      }

   var $dialog = jQuery("#message")
                 .html(warning)
                 .dialog({
                          modal: true,
                          autoOpen: false,
                          title: "Message",
                          width: 600,
                          hide: {effect: "fadeOut", duration: 1000}
                         });
                   
   $dialog.dialog('open');
   setTimeout(function() 
                {
                 $dialog.dialog('close');
                }, 2000);
   return false;
  }

// Return lighter (+lum) or darker (-lum) color as a hex string
// pass original hex string and luminosity factor, e.g. -0.1 = 10% darker
function ColorLuminance(hex, lum) {

	// validate hex string
	hex = String(hex).replace(/[^0-9a-f]/gi, '');
	if (hex.length < 6) {
		hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
	}
	lum = lum || 0;
	
	// convert to decimal and change luminosity
	var rgb = "#", c, i;
	for (i = 0; i < 3; i++) {
		c = parseInt(hex.substr(i*2,2), 16);
		c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
		rgb += ("00"+c).substr(c.length);
	}

	return rgb;
}

function rgb2hex(colorval) {
    var parts = colorval.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    delete(parts[0]);
    for (var i = 1; i <= 3; ++i) {
        parts[i] = parseInt(parts[i]).toString(16);
        if (parts[i].length == 1) parts[i] = '0' + parts[i];
    }
    color = '#' + parts.join('');
    return color;
}

function processJson(json_data)
  { 
   // Check for returning warning or error
   //
   var warning      = json_data.warning;
   if(typeof warning !== "undefined") 
     {
      message_dialog("Warning " + warning);
      return false;
     }
                                          
   // Check for errors
   //
   var error_message = json_data.error_message;
   if(typeof error_message !== "undefined")
     {
      message_dialog("Error " + error_message);
      return false;
     }

   // Check status returned
   //
   var status       = json_data.status;
   
   // Check for measurements
   //
   if(status !== "success") 
     {
      message_dialog("Error " + error_message);
      return false;
     }

   // Plot title
   //
   var plot_type    = json_data.format;
   var plot_title   = json_data.plot_title;

   // General information
   //
   var agency_cd    = json_data.agency_cd;
   var site_no      = json_data.site_no;
   var station_nm   = json_data.station_nm;
   var count        = json_data.count;
   var data_type    = json_data.data_type;
   var y_axis_title = json_data.y_axis_title;
   var x_axis_max   = json_data.x_axis_max;
   var x_axis_min   = json_data.x_axis_min;
   var x_date_max   = json_data.x_date_max;
   var x_date_min   = json_data.x_date_min;
   var y_axis_max   = json_data.y_axis_max;
   var y_axis_min   = json_data.y_axis_min;
   var parm_list    = json_data.parameter_list;

   var updateLegendTimeout = null;
   var latestPosition      = null;
   var previousPoint       = null;
   
   // Check for returning warning or error
   //
   if(x_date_max == null)
     {
      var error_message = "No information found for site " + site_no;
      message_dialog(error_message);
      return false;
     }
   
   // Set for browser time offset
   //
   var offset   = (new Date(x_axis_max)).getTimezoneOffset() * 60 * 1000;
   //alert("Timezone offset " + offset);
   x_axis_max  += offset;
   x_axis_min  += offset;

   // Set colors for parameters
   //
   var ColorHash      = new Object();
   var color_array    = [];
   var yaxis_array    = [];
   for(var i = 1; i <= 100; i++)
     {
       var item        = "color_" + i.toString();
       jQuery('<div id="' + item + '"></div>').appendTo("body");
       var div_color   = jQuery('#' + item).css('color');
       if(typeof div_color === "undefined" || div_color === "null") { break; }
       var graph_color = div_color;
       if(div_color.match(/^rgb/i))
         {
          graph_color = rgb2hex(div_color);
         }
       if(graph_color === "#000000") { break; }
       color_array.push(graph_color);
       yaxis_array.push(graph_color);
       ColorHash[i] = color_array[i - 1];
       jQuery('<div id="' + item + '"></div>').remove();
     }
   //alert("Colors " + color_array.join(", "));

   // Y-axis and colors for parameters
   //
   var y_axis_label   = "";
   jQuery.each(json_data.y_axis_sets, 
               function(index) {
                                var id            = json_data.y_axis_sets[index].id;
                                var parameter_cd  = json_data.y_axis_sets[index].parameter_cd;
                                var axis_label    = json_data.y_axis_sets[index].y_axis_label;
                                var y_axis_number = json_data.y_axis_sets[index].y_axis_number;
                                var y_axis_min    = json_data.y_axis_sets[index].y_axis_min;
                                var y_axis_max    = json_data.y_axis_sets[index].y_axis_max;
                                var y_axis_type   = json_data.y_axis_sets[index].y_axis_type;
                                var y_axis_scale  = json_data.y_axis_sets[index].y_axis_scale;
                                y_axis_label      += "<div id=\"y" + y_axis_number + "Axis\" class=\"y" + y_axis_number + "Axis\">";
                                y_axis_label      += axis_label;

                                if(y_axis_max === null)
                                  {
                                    y_axis_label += "<br /> (No records for period of interest)";
                                    jQuery('#y' + y_axis_number + 'Axis').css({ "opacity": 0.4 });
                                  }
                                y_axis_label     += "</div> <br />";
                           
                                // Build y axes scale
                                //
                                if(y_axis_type === "log" && y_axis_min < 0.01)
                                  {
                                    y_axis_type = "arithmetic";
                                  }
                           
                                // Build arithmetic y axes scale
                                //
                                if(y_axis_type === "arithmetic")
                                  {
                                   // Reverse y axes scale
                                   //
                                   if(y_axis_scale === "reverse")
                                     {
                                       yaxes.push(
                                                  { 
                                                   color: yaxis_array[y_axis_number - 1], 
                                                   position: 'left',
                                                   transform: function (v) { return -v; },
                                                   inverseTransform: function (v) { return -v; }
                                                  });
                                     }
                                   else
                                     {
                                       yaxes.push(
                                                  { 
                                                   color: yaxis_array[y_axis_number - 1], 
                                                   position: 'left'
                                                  });
                                     }
                                  }
                           
                                // Build log y axes scale
                                //
                                else
                                  {
                                   yaxes.push(
                                              { 
                                               min: y_axis_min,
                                               max: y_axis_max,
                                               color: yaxis_array[y_axis_number - 1],
                                               position: 'left',
                                               transform: function (v) { return Math.log(v); },
                                               inverseTransform: function (v) { return Math.exp(v); }
                                              });
                                  }
                               });

   // Set Y-axis and colors for parameters for gif_mult_sites
   //
   if(json_data.format === "gif_mult_sites")
     {
       y_axis_number = 0;
       y_axis_label  = "<div id=\"y" + y_axis_number + "Axis\" class=\"y" + y_axis_number + "Axis\">";
       y_axis_label += y_axis_title;
       y_axis_label += "</div>";
       jQuery(".tickLabel").css({ "color": "#000000" });

       for(var i = 0; i < yaxis_array.length; i++)
         {
           yaxis_array[i] = "#000000";
         }

       yaxes            = [];
       var y_axis_type  = "log";
       var y_axis_min   =  9999999999999999999;
       var y_axis_max   = -9999999999999999999;
       var y_axis_scale = "normal";
       for(var i = 0; i < json_data.y_axis_sets.length; i++)
         {
           y_axis_scale = json_data.y_axis_sets[i].y_axis_scale;

           if(typeof json_data.y_axis_sets[i].y_axis_min !== "null")
             {
               if(json_data.y_axis_sets[i].y_axis_min < y_axis_min) 
                 { 
                   y_axis_min = json_data.y_axis_sets[i].y_axis_min;
                 }
               if(json_data.y_axis_sets[i].y_axis_max > y_axis_max) 
                 { 
                   y_axis_max = json_data.y_axis_sets[i].y_axis_max;
                 }
      
               // Build y axes scale
               //
               if(json_data.y_axis_sets[i].y_axis_type === "log" && y_axis_min < 0.01)
                 {
                   y_axis_type = "arithmetic";
                 }
               else if(json_data.y_axis_sets[i].y_axis_type === "arithmetic")
                 {
                   y_axis_type = "arithmetic";
                 }
             }
         }
                           
       // Build y axes scale
       //
       if(y_axis_type === "arithmetic")
         {
           // Reverse y axes scale
           //
           if(y_axis_scale === "reverse")
             {
               yaxes.push(
                          { 
                           color: yaxis_array[0], 
                           position: 'left',
                           transform: function (v) { return -v; },
                           inverseTransform: function (v) { return -v; }
                          });
             }
           else
             {
               yaxes.push(
                          { 
                           color: yaxis_array[0], 
                           position: 'left'
                          });
             }
         }
       else
         {
           yaxes.push(
                      { 
                       min: y_axis_min,
                       max: y_axis_max,
                       color: yaxis_array[0],
                       position: 'left',
                       transform: function (v) { return Math.log(v); },
                       inverseTransform: function (v) { return Math.exp(v); }
                      });
         }
     }

   // Time-series
   //
   var data_number    = 0;
   var LegendHash     = new Object();
   var color_scheme   = [];

   jQuery.each(json_data.data, 
               function(index) {
                           var id               = json_data.data[index].id;
                           var parameter_cd     = json_data.data[index].parameter_cd;
                           var dd_parameter     = json_data.data[index].dd_parameter;
                           var label            = json_data.data[index].label;
                           var array            = json_data.data[index].array;
                           var array_type       = json_data.data[index].array_type;
                           var data_aging       = json_data.data[index].data_aging;
                           var data_id          = data_number;
                           var y_axis_number    = json_data.data[index].yaxis_nu;
                           var location_nm      = json_data.data[index].loc_nm;
                           var data_count       = json_data.data[index].data_count;
                           var data_aging_count = json_data.data[index].data_aging_count;
                           var screen_count     = json_data.data[index].screen_count;
                           var status_count     = json_data.data[index].status_count;
                           var ref_level_count  = json_data.data[index].reference_level_count;
                           var plot_symbol      = json_data.data[index].plot_symbol;
                             
                           if(location_nm.length > 0) { label += ", " + location_nm; }
                           //alert("Parameter " + parameter_cd + " label " + label + " nu " + y_axis_nu);
                           data_number     += 1;
                            
                           color            = ColorHash[y_axis_number];
                           //alert("Setting color for " + label + " to " + ColorHash[y_axis_number]);
                           color_scheme.push(color);
                            
                           if(json_data.format === "gif_mult_sites") { y_axis_number = 1; }
                           
                           var points = { show: false };
                           var lines  = { show: true };
                           if(array_type === "point") { points = { show: true, symbol: plot_symbol };  lines  = { show: false };}
                                                                         
                           data_sets.push(
                                          { 
                                           label : label,
                                           id    : id,
                                           data  : array,
                                           color : color,
                                           xaxis : 1,
                                           yaxis : y_axis_number,
                                           lines : lines,
                                           points: points
                                          });
                                                                         
                           if(ref_level_count > 0)
                             {      
                               var reference_levels = json_data.data[index].reference_levels;   
                               for(var i = 0; i < ref_level_count; i++)
                                 {         
                                   var ref_id      = reference_levels[i][0];     
                                   var value       = reference_levels[i][1];     
                                   var description = reference_levels[i][2];
                                   var midpoint    = ( x_axis_min + x_axis_max ) * 0.5;
                                   var x           = new Date(midpoint).getTime();
                                   var ref_y_axis  = "y" + y_axis_number + "axis".toString();
                                   reference_level_sets.push(
                                                   { 
                                                    id           : ref_id,
                                                    label        : label,
                                                    parameter_cd : parameter_cd,
                                                    description  : description,
                                                    value        : value,
                                                    x            : x,
                                                    y_axis_number: y_axis_number,
                                                    data         : { yaxis: { from: value, to: value }, color: "#842DCE", lineWidth: 3 }
                                                });
                                 }
                             }
                                                                         
                           if(data_aging_count > 0)
                             {                          
                              data_aging_sets.push(
                                                   { 
                                                    id           : id,
                                                    label        : label,
                                                    parameter_cd : parameter_cd,
                                                    dd_parameter : dd_parameter,
                                                    data         : data_aging
                                                });
                             }
                                               
                           if(screen_count > 0)
                             {                          
                              screen_code_sets.push(
                                                    { 
                                                     id           : id,
                                                     label        : label,
                                                     parameter_cd : parameter_cd,
                                                     dd_parameter : dd_parameter,
                                                     data         : json_data.data[index].screen_codes
                                                    });
                             }
                                               
                           if(status_count > 0)
                             {                          
                              status_code_sets.push(
                                                    { 
                                                     id           : id,
                                                     label        : label,
                                                     parameter_cd : parameter_cd,
                                                     dd_parameter : dd_parameter,
                                                     data         : json_data.data[index].status_codes
                                                    });
                             }
                                   
                           LegendHash[id] = 1;
                           AgingHash[id]  = 0;
                          });
   
   // Add legend table with checkboxes and values
   // 
   var i = 0;
   var legend_txt = [];
   legend_txt.push('<table id="legend" class="legendTable" border="0">');
   legend_txt.push(' <th colspan="4"> <div id="scanner_tooltip"></div></th>');
   legend_txt.push(' <tbody>');
   legend_txt.push(' <tr><td id="explanation" colspan="4">Explanation</tr></td>');
   jQuery.each(data_sets, function(key, val) {
       val.color         = i;
       var label         = val.label;
       var id            = val.id;
       var y_axis_number = val.yaxis;
       var color         = color_scheme[i];
       var feature_type  = val.points.symbol;
       if(typeof feature_type ===  "undefined")
         {
          feature_type = "line";
         }

       //alert("Label " + label + " Y axis number " + y_axis_number + " color " + color + " point " + feature_type);
       ++i;
       //alert("Parameter " + label + " for " + id + " with color " + color);
       legend_txt.push('<tr>');
       legend_txt.push(' <td>');
       legend_txt.push('  <div id="value_' + id + '" class="legendValue">&nbsp;&nbsp;&nbsp;</div>');
       legend_txt.push(' </td>');
       legend_txt.push(' <td class="checkBoxes">');
       //legend_txt.push('  <input type="checkbox" name="' + label + '" value="on" id="' + id + '" checked="checked"></input>');
       legend_txt.push('  <input type="checkbox" name="' + id + '" value="on" id="' + id + '" checked="checked" />');
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
           legend_txt.push('   <div id="legend_' + id + '" class="legendCircle" style="border: 2px solid ' + color + ';">&nbsp;</div>');
         }
       //legend_txt.push("  </div>");
       legend_txt.push(' </td>');
       legend_txt.push(' <td>');
       legend_txt.push('  <div id="label_' + id + '" class="legendLabel parameterLegend">' + label + '</div>');
       legend_txt.push(' </td>');
       legend_txt.push('</tr>');
  });

   if(typeof json_data.data_aging_codes !== "undefined")
     {
       if(json_data.data_aging_codes.length > 0)
         {
           for(var i = 0; i < json_data.data_aging_codes.length; i++)
             {
               var data_aging_code = json_data.data_aging_codes[i].data_aging_code;
               var definition      = json_data.data_aging_codes[i].definition;
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
     }

   if(typeof json_data.screen_codes !== "undefined")
     {
       if(json_data.screen_codes.length > 0)
         {
           for(var i = 0; i < json_data.screen_codes.length; i++)
             {
               var screen_code = json_data.screen_codes[i].screen_code;
               var definition  = json_data.screen_codes[i].definition;
               screen_list.push(
                                {
                                 screen_code : screen_code,
                                 definition : definition
                                }
                               );
    
               legend_txt.push('<tr id="legend_' + screen_code + '" class="screen_codes">');
               legend_txt.push(' <td>&nbsp;</td>');
               legend_txt.push(' <td>&nbsp;</td>');
               legend_txt.push(' <td id="color_' + screen_code + '">');
               legend_txt.push('   <div class="legendRectangle">&nbsp;</div>');
               legend_txt.push(' </td>');
               legend_txt.push(' <td><div class="legendLabel">' + definition + '</div></td>');
               legend_txt.push('</tr>');
             }
         }
     }

   if(typeof json_data.status_codes !== "undefined")
     {
       if(json_data.status_codes.length > 0)
         {
           for(var i = 0; i < json_data.status_codes.length; i++)
             {
               var status_code = json_data.status_codes[i].status_code;
               var definition  = json_data.status_codes[i].definition;
               status_list.push(
                                {
                                 status_code : status_code,
                                 definition : definition
                                }
                               );
    
               legend_txt.push('<tr id="legend_' + status_code + '" class="status_codes">');
               legend_txt.push(' <td>&nbsp;</td>');
               legend_txt.push(' <td>&nbsp;</td>');
               legend_txt.push(' <td id="color_' + status_code + '">');
               legend_txt.push('   <div class="legendRectangle">&nbsp;</div>');
               legend_txt.push(' </td>');
               legend_txt.push(' <td><div class="legendLabel">' + definition + '</div></td>');
               legend_txt.push('</tr>');
             }
         }
     }

   legend_txt.push(' </tbody>');
   legend_txt.push('</table>');
   jQuery("#overviewLegend").html(legend_txt.join(""));
   //alert("Legend " + legend_txt.join(" "));

    var legends = jQuery(".legendValue");
    legends.each(function () {
        // fix the widths so they don't jump around
        jQuery(this).css('width', jQuery(this).width());
    });
   
   // Data
   //
   data = data_sets;

    // Show graphs
   // 
   //jQuery("#site_title").text(measurement + " Measurement information for site " + station_nm); 
   //jQuery("#graphs").show(); 
   jQuery("#plot_title").html(plot_title); 
   //jQuery("#x_axis_label").text("Calendar Year"); 
   jQuery("#y_axis_label").html(y_axis_label); 
                                                        
   // Graph options
   //
   var options = {
                  legend: { 
                           show: false 
                          },
                  lines: { show: true, lineWidth: 1 },
                  points: { show: false },
                  grid: { 
                         hoverable: true, 
                         clickable: true,
                         hoverFill: '#444',
                         hoverRadius: 1
                        },
                  crosshair: { mode: "x" },
                  yaxes: yaxes ,
                  xaxis: {
                          mode: "time",
                          tickFormatter: XtickFormatter,
                          //timeformat: timeFormat(x_axis_min,x_axis_max),
                          //timezone: "browser",
                          font: {size: 10, weight: "bold"},
                          color: "#000000",
                          monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                          min: x_axis_min,
                          max: x_axis_max
                         },
                  colors: color_scheme,
                  selection: { mode: "x" }
                  };
                                                       
   // Graph plot
   //
   plot = jQuery.plot(jQuery("#placeholder"), data_sets, options);

   jQuery("#reset").show();
   jQuery("#hoverdata").show();
   jQuery("#checktooltip").show();
   if(data_aging_list.length < 1)
     {
      jQuery("#enableAgingtip").show();
     }
   if(status_list.length < 1)
     {
      jQuery(".StatusToolTip").hide();
     }
   if(screen_list.length < 1)
     {
      jQuery(".ScreenToolTip").hide();
     }
   if(reference_level_sets.length < 1)
     {
      jQuery(".ReferenceToolTip").hide();
     }

   jQuery('#enableTooltip').removeAttr('checked');
   jQuery('#enableAgingtip').removeAttr('checked');
   jQuery('#enableScreentip').removeAttr('checked');
   jQuery('#enableStatustip').removeAttr('checked');
   jQuery('#enableReferencetip').removeAttr('checked');
   jQuery('#all_available_parameters').removeAttr('checked');

   jQuery(".data_aging").hide();
   jQuery(".screen_codes").hide();
   jQuery(".status_codes").hide();
   //jQuery(".referernce_levels").hide();

    // Overview
    //
    overview = jQuery.plot(jQuery("#overview"), data, {
                                                       legend: { show: false },
                                                       lines: { show: true, lineWidth: 1 },
                                                       points: { show: false },
                                                       shadowSize: 0,
                                                       xaxis: {  
                                                               mode: "time",
                                                               tickFormatter: XtickFormatter,
                                                               //timeformat: XtickFormatter(x_axis_min,x_axis_max),
                                                               //timezone: null,
                                                               font: {size: 7, weight: "bold"},
                                                               color: "#000000",
                                                               monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                                                               min: (new Date(x_axis_min)).getTime(),
                                                               max: (new Date(x_axis_max)).getTime()
                                                              },
                                                       yaxes: yaxes ,
                                                       grid: { color: "#999" },
                                                         selection: { mode: "x", color: "#D39D32" },
                                                       colors: color_scheme
                                                      });

    // Double click reset
    //
    jQuery("#overview").dblclick(function () {

        // Remove labels of reference level
        //
        jQuery(".reference_levels").remove();

        //alert("Max : " + x_axis_max + " Date " + x_date_max + " Min : " + x_axis_min + " Date " + x_date_min);
        //jQuery.plot(jQuery("#placeholder"), data, options);
        plot = jQuery.plot(jQuery("#placeholder"), data,
                      jQuery.extend(true, {}, options, {
                                                        xaxis: { min: new Date(x_axis_min).getTime(), max: new Date(x_axis_max).getTime() }
                      }));
        //alert(JSON.stringify(plot.getOptions(), null, 4));
    });
            
    // Connect plot and overview
    //
    jQuery("#placeholder").unbind("plotselected");
    jQuery("#placeholder").bind("plotselected", function (event, ranges) {

        // Remove labels of reference level
        //
        jQuery(".reference_levels").remove();
        

        // Clamp the zooming to prevent eternal zoom
        //
        if(ranges.xaxis.to - ranges.xaxis.from < 0.00001)
            ranges.xaxis.to = ranges.xaxis.from + 0.00001;
        //if(ranges.yaxis.to - ranges.yaxis.from < 0.00001)
        //ranges.yaxis.to = ranges.yaxis.from + 0.00001;
        
        // do the zooming
        plot = jQuery.plot(jQuery("#placeholder"), data,
                      jQuery.extend(true, {}, options, {
                          xaxis: { min: ranges.xaxis.from, max: ranges.xaxis.to }
                      }));
        
        // don't fire event on the overview to prevent eternal loop
        overview.setSelection(ranges, true);
    });
    jQuery("#overview").unbind("plotselected");
    jQuery("#overview").bind("plotselected", function (event, ranges) {
        plot.setSelection(ranges);
    });

   // Monitor hover
   //
   jQuery('.parameterLegend').hover(
                                function () 
                                  { 
                                      var ID          = jQuery(this).attr('id');
                                      var checkbox_id = ID.replace("label_", "");
                                      if(jQuery("[name=" + checkbox_id + "]").is(':checked'))
                                        {
                                          jQuery(this).css({ "opacity": 0.4 });

                                          var placeholder_offset = jQuery("#placeholder").offset();
                                          var placeholder_height = jQuery("#placeholder").height();
                                          var placeholder_width  = jQuery("#placeholder").width();
                                          var placeholder_left   = placeholder_offset.left + placeholder_width;
                                          var placeholder_top    = placeholder_offset.top;
    
                                          // Show approval/screen/status periods
                                          //
                                          if(jQuery("#enableAgingtip").is(':checked'))
                                            {
                                              showDataAging(placeholder_left, placeholder_top, ID, data_aging_sets);
                                            }
    
                                          // Show approval/screen/status periods
                                          //
                                          if(jQuery("#enableScreentip").is(':checked'))
                                            {
                                              showScreenCodes(placeholder_left, placeholder_top, ID, screen_code_sets);
                                            }
    
                                          // Show approval/screen/status periods
                                          //
                                          if(jQuery("#enableStatustip").is(':checked'))
                                            {
                                              showStatusCodes(placeholder_left, placeholder_top, ID, status_code_sets);
                                            }
    
                                          // Show reference levels
                                          //
                                          if(jQuery("#enableReferencetip").is(':checked'))
                                            {
                                              showReferenceLevels(placeholder_left, placeholder_top, checkbox_id, reference_level_sets);
                                            }
                                        }
                                    },
                                function () 
                                  { 
                                      var ID          = jQuery(this).attr('id');
                                      var checkbox_id = ID.replace("label_", "");
                                      if(jQuery("[name=" + checkbox_id + "]").is(':checked'))
                                        {
                                         jQuery(this).css({ "opacity": 1.0 });
                                        }
                                  }
                               );

   // Legend
   //
   jQuery('.checkBoxes :checkbox').click(function() 
                                {
                                 //var selected   = jQuery(this).attr('name');
                                 var id         = jQuery(this).attr('id');
                                 var isChecked  = jQuery(this).attr('checked');
                                 var legendshow = LegendHash[id];
                                 //alert("ID " + id + " checked " + isChecked + " legend " + legendshow);

                                 // Remove labels of reference level
                                 //
                                 jQuery(".reference_levels").remove();
                                    
                                 // Remove data set
                                 //
                                 if(legendshow > 0)
                                   {
                                    LegendHash[id] = 0;
                                    jQuery('#label_' + id).css({ "opacity": 0.4 });
                                    jQuery('#value_' + id).html(" ");
                                   }
                                 else
                                   {
                                    LegendHash[id] = 1;
                                    jQuery('#label_' + id).css({ "opacity": 1.0 });
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
                                 var axes = plot.getAxes();
                             
                                 jQuery.plot(jQuery("#placeholder"), data,
                                                                          jQuery.extend(true, {}, options, {
                                                                                                            xaxis: { min: axes.xaxis.min, max: axes.xaxis.max }
                                  }));
                               });

    // Function to monitor cursor hover
    //
    jQuery("#placeholder").bind("plothover", function (event, pos, item) {

        // Check to see if axes are enabled
        //
        if(typeof pos.x === "undefined") { return; }
        if(typeof pos.y === "undefined" && typeof pos.y2 === "undefined" && typeof pos.y3 === "undefined") { return; }
    
        // Update value in legend
        //
        latestPosition = pos;
        if (!updateLegendTimeout)
          updateLegendTimeout = setTimeout(updateLegend, 50);
        //updateLegendTimeout = setTimeout(function (){updateLegend()}, 50);
        
        // Update value for cursor
        //
        var myDate      = new Date();
        var date_string = myDate.setTime(pos.x.toFixed(0));
        var born        = new Date(date_string);
      
        jQuery("#x").text(born.toDateString());
        var y_cursor_txt = [];
        if(typeof pos.y  !== "undefined") { y_cursor_txt.push('( axis 1: ' + pos.y.toFixed(2)  + ' )'); }
        if(typeof pos.y2 !== "undefined") { y_cursor_txt.push('( axis 2: ' + pos.y2.toFixed(2) + ' )'); }
        if(typeof pos.y3 !== "undefined") { y_cursor_txt.push('( axis 3: ' + pos.y3.toFixed(2) + ' )'); }
          
        jQuery("#y").text(y_cursor_txt.join(', '));

        // Remove any highlighted entries in explanation
        //
        jQuery(".legendLabel").css({ "background-color": "transparent" });

        // Tooltip window enabled
        //
        if(jQuery("#enableTooltip:checked").length > 0) 
          {
           if(item) 
             {
              // Highlight entry in explanation
              //
               var series = item.series;
               var id     = series.id;
               jQuery("#label_" + id).css({ "background-color": "#F7FE2E" });

              if(previousPoint !== item.datapoint) 
                {
                 previousPoint    = item.datapoint;
                    
                 var dataIndex    = item.dataIndex;
                 var seriesIndex  = item.seriesIndex;
                 var tz_offset    = data[seriesIndex].data[dataIndex][2];
                 var x            = item.datapoint[0];
                 var y            = item.datapoint[1].toString();
                 var myDate       = new Date(x);
                 var myDateString = [weekday[myDate.getUTCDay()], monthNames[myDate.getUTCMonth()], myDate.getUTCDate(), myDate.getUTCFullYear()].join(" ") + " ";
                 if(data_type === "uv")
                   {
                     var hours       = myDate.getUTCHours();
                     var minutes     = myDate.getUTCMinutes();
                     var hours_str   = ("0" + hours.toString()).slice(-2);
                     var minutes_str = ("0" + minutes.toString()).slice(-2);
                     myDateString   += hours_str + ":" + minutes_str;
                   }
                    
                 showMessagetip(item.pageX, item.pageY, 5, 5,
                             item.series.label + " " + y + " on " + myDateString);
                }
             }
           else 
             {
              jQuery("#tooltip").remove();
              previousPoint = null;            
             }
          }

        // Tooltip window disabled
        //
        else 
          {
            jQuery("#tooltip").remove();

           var myDateString = [weekday[myDate.getUTCDay()], monthNames[myDate.getUTCMonth()], myDate.getUTCDate(), myDate.getUTCFullYear()].join(" ") + " ";
            if(data_type === "uv")
              {
                var hours       = myDate.getUTCHours();
                var minutes     = myDate.getUTCMinutes();
                var hours_str   = ("0" + hours.toString()).slice(-2);
                var minutes_str = ("0" + minutes.toString()).slice(-2);
                myDateString   += hours_str + ":" + minutes_str;
              }
                    
            placeholder_offset = jQuery("#placeholder").offset();
            placeholder_height = jQuery("#placeholder").height();
            placeholder_width  = jQuery("#placeholder").width();
            placeholder_left   = placeholder_offset.left + placeholder_width;
            placeholder_top    = placeholder_offset.top;

            showMessagetip(placeholder_left, placeholder_top, 0, 0, myDateString);
          }
      });
    
    function updateLegend() {
              
        updateLegendTimeout = null;
        
        var pos  = latestPosition;

        // Check position with active axes
        //
        var axes = plot.getAxes();

        if(typeof axes === "undefined")
           return;
                 
        if(pos.x < axes.xaxis.min || pos.x > axes.xaxis.max)
          {
            //alert("X axis min " + axes.xaxis.min + " max " + axes.xaxis.max + " X pos " + pos.x);
           return;
          }

        if(typeof pos.y  !== "undefined") 
          { 
           if(pos.y < axes.yaxis.min || pos.y > axes.yaxis.max)
              return;
          }

        if(typeof pos.y2 !== "undefined") 
          { 
           if(pos.y2 < axes.y2axis.min || pos.y2 > axes.y2axis.max)
              return;
          }

        if(typeof pos.y3 !== "undefined") 
          { 
           if(pos.y3 < axes.y3axis.min || pos.y3 > axes.y3axis.max)
              return;
          }

        // Determine value against active axes
        //
        var i, j, dataset = plot.getData();
        for(i = 0; i < dataset.length; ++i) 
           {
            var series  = dataset[i];
            var label   = series.label;
            var id      = series.id;
            var axis_nu = series.yaxis.n;
            if(LegendHash[id] > 0)
              {

            //alert("Series " + id + " - " + label + " on axis |" + axis_nu + "|");
            //alert(JSON.stringify(axis_nu, null, 4));

            // Find the nearest points, x-wise
            //
            for (j = 0; j < series.data.length; ++j)
                if (series.data[j][0] > pos.x)
                    break;
            
            // Interpolate
            //
            var y_str = "--";

            // Disable values in Explanation if tooltip window enabled
            //
            if(jQuery("#enableTooltip:checked").length < 1) 
              {
                var p1 = series.data[j - 1];
                var p2 = series.data[j];
                if(typeof p1 === "undefined" || typeof p2 === "undefined") 
                   y = " ";
                else if (p1[1] === null)
                   y = " ";
                else if (p2[1] === null)
                   y = " ";
                else
                  {
                   y = p1[1];
                   var x1_diff = Math.abs(pos.x - p1[0]);
                   var x2_diff = Math.abs(pos.x - p2[0]);
                   if(x2_diff < x1_diff)
                      y = p2[1];
                   //y = p1[1] + (p2[1] - p1[1]) * (pos.x - p1[0]) / (p2[0] - p1[0]);
                   y_str = y.toString();
                  }
              }

            jQuery('#value_' + id).html(y_str);
           }
        }
    }

   // Monitor approval
   //
   jQuery('#enableAgingtip').click(function() 
     {
      // Remove any shaded periods
      //
      var axes = plot.getAxes();

      jQuery.plot(jQuery("#placeholder"), 
                  data,
                  jQuery.extend(true, 
                                {}, 
                                options, 
                                {
                                xaxis: { min: axes.xaxis.min, max: axes.xaxis.max },
                                 grid: { 
                                        hoverable: true,
                                        clickable: true,
                                        hoverFill: '#444',
                                        hoverRadius: 5
                                       }}));

      // Show approval periods
      //
      if(jQuery("#enableAgingtip").is(':checked'))
        {
          for(var i = 0; i < data_aging_list.length; i++)
            {
              var data_aging_code  = data_aging_list[i].data_aging_code;
              var data_aging_color = jQuery("#legend_" + data_aging_code).css('color');
              jQuery("#color_" + data_aging_code).css('background-color',data_aging_color);
            }
          jQuery(".data_aging").show();

          jQuery("#enableScreentip").removeAttr('checked');
          jQuery(".screen_codes").hide();

          jQuery("#enableStatustip").removeAttr('checked');
          jQuery(".status_codes").hide();

          jQuery("#enableReferencetip").removeAttr('checked');
          jQuery(".reference_levels").remove();
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
                             
         var axes = plot.getAxes();

         jQuery.plot(jQuery("#placeholder"), 
                     data,
                     jQuery.extend(true, 
                                   {}, 
                                   options, 
                                   {
                                   xaxis: { min: axes.xaxis.min, max: axes.xaxis.max },
                                    grid: { 
                                           hoverable: true,
                                           clickable: true,
                                           hoverFill: '#444',
                                           hoverRadius: 5
                                          }}));
          }
     });

   // Monitor qualification codes
   //
   jQuery('#enableScreentip').click(function() 
     {
      // Remove any shaded periods
      //
      var axes = plot.getAxes();

      jQuery.plot(jQuery("#placeholder"), 
                  data,
                  jQuery.extend(true, 
                                {}, 
                                options, 
                                {
                                xaxis: { min: axes.xaxis.min, max: axes.xaxis.max },
                                 grid: { 
                                        hoverable: true,
                                        clickable: true,
                                        hoverFill: '#444',
                                        hoverRadius: 5
                                       }}));

      // Show qualification periods
      //
      if(jQuery("#enableScreentip").is(':checked'))
        {
          for(var i = 0; i < screen_list.length; i++)
            {
              var screen_code  = screen_list[i].screen_code;
              var screen_color = jQuery("#legend_" + screen_code).css('color');
              jQuery("#color_" + screen_code).css('background-color',screen_color);
            }
          jQuery(".screen_codes").show();

          jQuery("#enableAgingtip").removeAttr('checked');
          jQuery(".data_aging").hide();

          jQuery("#enableStatustip").removeAttr('checked');
          jQuery(".status_codes").hide();

          jQuery("#enableReferencetip").removeAttr('checked');
          jQuery(".reference_levels").remove();
        }
        
      // Disable Qualification Code periods
      //
      else
        {
          jQuery(".screen_codes").hide();
          var message = "Removing any Qualification Code periods from graph";

          placeholder_offset = jQuery("#placeholder").offset();
          placeholder_height = jQuery("#placeholder").height();
          placeholder_width  = jQuery("#placeholder").width();
          placeholder_left   = placeholder_offset.left + placeholder_width;
          placeholder_top    = placeholder_offset.top;

          showMessagetip(placeholder_left, placeholder_top, 0, 0, message);
                             
         var axes = plot.getAxes();

         jQuery.plot(jQuery("#placeholder"), 
                     data,
                     jQuery.extend(true, 
                                   {}, 
                                   options, 
                                   {
                                   xaxis: { min: axes.xaxis.min, max: axes.xaxis.max },
                                    grid: { 
                                           hoverable: true,
                                           clickable: true,
                                           hoverFill: '#444',
                                           hoverRadius: 5
                                          }}));
          }
     });

   // Monitor status codes
   //
   jQuery('#enableStatustip').click(function() 
     {
      // Remove any shaded periods
      //
      var axes = plot.getAxes();

      jQuery.plot(jQuery("#placeholder"), 
                  data,
                  jQuery.extend(true, 
                                {}, 
                                options, 
                                {
                                xaxis: { min: axes.xaxis.min, max: axes.xaxis.max },
                                 grid: { 
                                        hoverable: true,
                                        clickable: true,
                                        hoverFill: '#444',
                                        hoverRadius: 5
                                       }}));

      // Show status periods
      //
      if(jQuery("#enableStatustip").is(':checked'))
        {
          for(var i = 0; i < status_list.length; i++)
            {
              var status_code  = status_list[i].status_code;
              var status_color = jQuery("#legend_" + status_code).css('color');
              jQuery("#color_" + status_code).css('background-color',status_color);
            }
          jQuery(".status_codes").show();

          jQuery("#enableAgingtip").removeAttr('checked');
          jQuery(".data_aging").hide();

          jQuery("#enableScreentip").removeAttr('checked');
          jQuery(".screen_codes").hide();

          jQuery("#enableReferencetip").removeAttr('checked');
          jQuery(".reference_levels").remove();
        }
        
      // Disable Status Code periods
      //
      else
        {
          jQuery(".status_codes").hide();
          var message = "Removing any Status Code periods from graph";

          placeholder_offset = jQuery("#placeholder").offset();
          placeholder_height = jQuery("#placeholder").height();
          placeholder_width  = jQuery("#placeholder").width();
          placeholder_left   = placeholder_offset.left + placeholder_width;
          placeholder_top    = placeholder_offset.top;

          showMessagetip(placeholder_left, placeholder_top, 0, 0, message);
        }
     });

   // Monitor reference levels
   //
   jQuery('#enableReferencetip').click(function() 
     {
      // Remove any shaded periods
      //
      var axes = plot.getAxes();

      jQuery.plot(jQuery("#placeholder"), 
                  data,
                  jQuery.extend(true, 
                                {}, 
                                options, 
                                {
                                xaxis: { min: axes.xaxis.min, max: axes.xaxis.max },
                                 grid: { 
                                        hoverable: true,
                                        clickable: true,
                                        hoverFill: '#444',
                                        hoverRadius: 5
                                       }}));

      // Show reference levels
      //
      if(jQuery("#enableReferencetip").is(':checked'))
        {
          jQuery("#enableAgingtip").removeAttr('checked');
          jQuery(".data_aging").hide();

          jQuery("#enableScreentip").removeAttr('checked');
          jQuery(".screen_codes").hide();

          jQuery("#enableStatustip").removeAttr('checked');
          jQuery(".status_codes").hide();
        }
        
      // Disable reference levels
      //
      else
        {
          jQuery(".reference_levels").remove();
          var message = "Removing any reference levels from graph";

          placeholder_offset = jQuery("#placeholder").offset();
          placeholder_height = jQuery("#placeholder").height();
          placeholder_width  = jQuery("#placeholder").width();
          placeholder_left   = placeholder_offset.left + placeholder_width;
          placeholder_top    = placeholder_offset.top;

          showMessagetip(placeholder_left, placeholder_top, 0, 0, message);
        }
     });

    // Function to show data aging bars
    //
    function showDataAging(x, y, id, data_aging_sets) 
      {
        jQuery("#messagetip").remove();
        jQuery("#tooltip").remove();
        jQuery(".reference_levels").remove();
         
        // Set
        //
        var message           = 'No approval/provisional periods determined ';
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
                 var data_aging_id = "label_" + data_aging_sets[i].id;
                 if(data_aging_id === id)
                   {
                     message = 'Adding the approval/provisional periods for ' + label;
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
        jQuery('<div id="messagetip" class="flot_tooltip">' + message + '</div>').css( {
               position: 'absolute',
               display: 'none',
               top: y + 5,
               left: x + 5
             }).appendTo("body").fadeIn(1000).fadeOut(2000);
                                 
        // Show approval/provisional periods
        //
        var axes = plot.getAxes();
    
        jQuery.plot(jQuery("#placeholder"), 
                    data,
                    jQuery.extend(true, 
                                  {}, 
                                  options, 
                                  {
                                  xaxis: { min: axes.xaxis.min, max: axes.xaxis.max },
                                   grid: { 
                                          hoverable: true,
                                          clickable: true,
                                          hoverFill: '#444',
                                          hoverRadius: 5,
                                          markings: markings
                                         }}));
  }

    // Function to show screen codes bars
    //
    function showScreenCodes(x, y, id, screen_code_sets) 
      {
        jQuery("#messagetip").remove();
        jQuery("#tooltip").remove();
        jQuery(".reference_levels").remove();
         
        // Set
        //
        var message           = 'No qualification codes periods determined ';
        var markings          = [];
         
        // Show screen codes periods
        //
        if(typeof screen_code_sets !== "undefined" && screen_code_sets.length > 0) 
          {
            for(var i = 0; i < screen_code_sets.length; i++)
               {
                 var label          = screen_code_sets[i].label;
                 var screen_code_id = screen_code_sets[i].id;
                 var label_id       = "label_" + screen_code_id;
                 if(label_id === id)
                   {
                     message = 'Adding the qualification code periods for ' + label;
                     var screen_codes     = screen_code_sets[i].data;
                     for(var ii = 0; ii < screen_codes.length; ii++)
                        {
                          screen_start = screen_codes[ii][0];
                          screen_end   = screen_codes[ii][1];
                          screen_code  = screen_codes[ii][2];
                          color_background = jQuery("#legend_" + screen_code).css('color');
                          markings.push({ xaxis: { from: new Date(screen_start).getTime(), to: new Date(screen_end).getTime() }, color: color_background});
                        }
                     break;
                   }
               }
          }

        // Show message on status codes periods
        //
        jQuery('<div id="messagetip" class="flot_tooltip">' + message + '</div>').css( {
               position: 'absolute',
               display: 'none',
               top: y + 5,
               left: x + 5
             }).appendTo("body").fadeIn(1000).fadeOut(2000);
                                 
        // Show status codes periods
        //
        var axes = plot.getAxes();
    
        jQuery.plot(jQuery("#placeholder"), 
                    data,
                    jQuery.extend(true, 
                                  {}, 
                                  options, 
                                  {
                                  xaxis: { min: axes.xaxis.min, max: axes.xaxis.max },
                                   grid: { 
                                          hoverable: true,
                                          clickable: true,
                                          hoverFill: '#444',
                                          hoverRadius: 5,
                                          markings: markings
                                         }}));
  }

    // Function to show status bars
    //
    function showStatusCodes(x, y, id, status_code_sets) 
      {
        jQuery("#messagetip").remove();
        jQuery("#tooltip").remove();
        jQuery(".reference_levels").remove();
         
        // Set
        //
        var message           = 'No Status Codes periods determined ';
        var markings          = [];
         
        // Show status periods
        //
        //alert("Status " + typeof status_code_sets + " and " + status_code_sets.length);
        if(typeof status_code_sets !== "undefined" && status_code_sets.length > 0) 
          {
            for(var i = 0; i < status_code_sets.length; i++)
               {
                 var label          = status_code_sets[i].label;
                 var status_code_id = status_code_sets[i].id;
                 var label_id       = "label_" + status_code_id;
                 if(label_id === id)
                   {
                     message = 'Adding the status periods for ' + label;
                     var status_codes     = status_code_sets[i].data;
                     for(var ii = 0; ii < status_codes.length; ii++)
                        {
                          status_start = status_codes[ii][0];
                          status_end   = status_codes[ii][1];
                          status_code  = status_codes[ii][2];
                          color_background = jQuery("#legend_" + status_code).css('color');
                          markings.push({ xaxis: { from: new Date(status_start).getTime(), to: new Date(status_end).getTime() }, color: color_background});
                        }
                     break;
                   }
              }
          }
         
        // Show message on status codes periods
        //
        jQuery('<div id="messagetip" class="flot_tooltip">' + message + '</div>').css( {
               position: 'absolute',
               display: 'none',
               top: y + 5,
               left: x + 5
             }).appendTo("body").fadeIn(1000).fadeOut(3000);
                                 
        // Show status codes periods
        //
        var axes = plot.getAxes();
    
        jQuery.plot(jQuery("#placeholder"), 
                    data,
                    jQuery.extend(true, 
                                  {}, 
                                  options, 
                                  {
                                  xaxis: { min: axes.xaxis.min, max: axes.xaxis.max },
                                   grid: { 
                                          hoverable: true,
                                          clickable: true,
                                          hoverFill: '#444',
                                          hoverRadius: 5,
                                          markings: markings
                                         }}));
  }

    // Function to show reference levels
    //
    function showReferenceLevels(x, y, id, reference_level_sets) 
      {
        jQuery("#messagetip").remove();
        jQuery("#tooltip").remove();
        jQuery(".reference_levels").remove();
         
        // Set
        //
        var message           = 'No Reference Levels determined ';
        var markings          = [];
        var myRe              = new RegExp("^" + id);
         
        // Show status periods
        //
        if(typeof reference_level_sets !== "undefined" && reference_level_sets.length > 0) 
          {
            for(var i = 0; i < reference_level_sets.length; i++)
               {
                 var reference_id = reference_level_sets[i].id;
                 //alert("Reference " + reference_id + " == " + id);
                 if(myRe.exec(reference_id) !== null)
                   {
                     var reference_txt   = reference_level_sets[i].description;
                     var reference_data  = reference_level_sets[i].data;
                     var reference_level = reference_level_sets[i].value;
                     var reference_x     = reference_level_sets[i].x;
                     var reference_label = reference_level_sets[i].label;
                     var y_axis_number   = reference_level_sets[i].y_axis_number;
                     message = 'Adding the reference levels for ' + reference_label;
                     if(y_axis_number === 1)
                       {
                         markings.push( { yaxis: { from: reference_level, to: reference_level }, color: "#842DCE", lineWidth: 3 } );
                       }
                     else if(y_axis_number === 2)
                       {
                         markings.push( { y2axis: { from: reference_level, to: reference_level }, color: "#842DCE", lineWidth: 3 } );
                       }
                     else
                       {
                         markings.push( { y3axis: { from: reference_level, to: reference_level }, color: "#842DCE", lineWidth: 3 } );
                       }
                     //markings.push( reference_level_sets[i].data );
                     var reference_point = plot.pointOffset( { x: x, y: reference_level, xaxis: 1, yaxis: y_axis_number } );

                     placeholder_offset = jQuery("#placeholder").offset();
                     placeholder_height = jQuery("#placeholder").height();
                     placeholder_width  = jQuery("#placeholder").width();
                     placeholder_left   = parseInt(placeholder_offset.left + placeholder_width * 0.5);
                     placeholder_top    = parseInt(placeholder_offset.top + reference_point.top);
                     //alert("Point (" + reference_point.left + ", " + reference_point.top + ")");
                     //alert("Position (" + placeholder_left + ", " + placeholder_top + ")");
                     //jQuery("#placeholder").append('<div class="reference_levels">' + reference_txt + '</div>').css( { top: placeholder_top, left: placeholder_left });
                     jQuery('<div id="referencetip" class="reference_levels">' + reference_txt + '</div>').css( { top: placeholder_top, left: placeholder_left }).appendTo("body").fadeIn(200);

                     //showMessagetip(placeholder_left, placeholder_top, 0, 0, reference_txt);
                   }
              }
          }
         
        // Show message on reference levels
        //
        jQuery('<div id="messagetip" class="flot_tooltip">' + message + '</div>').css( {
               position: 'absolute',
               display: 'none',
               top: y + 5,
               left: x + 5
             }).appendTo("body").fadeIn(1000).fadeOut(3000);
                                 
        // Show reference levels
        //
        var axes = plot.getAxes();
    
        jQuery.plot(jQuery("#placeholder"), 
                    data,
                    jQuery.extend(true, 
                                  {}, 
                                  options, 
                                  {
                                  xaxis: { min: axes.xaxis.min, max: axes.xaxis.max },
                                   grid: { 
                                          hoverable: true,
                                          clickable: true,
                                          hoverFill: '#444',
                                          hoverRadius: 5,
                                          markings: markings
                                         }}));
  }

  // Highlight x and y axes
  //    
  //jQuery.each(plot.getAxes(), function (i, axis) {
  //    if (!axis.show)
  //        return;
  //      
  //    var box = getBoundingBoxForAxis(plot, axis);
  //      
  //    jQuery('<div class="axisTarget" style="position:absolute;left:' + box.left + 'px;top:' + box.top + 'px;width:' + box.width +  'px;height:' + box.height + 'px"></div>')
  //        .data('axis.direction', axis.direction)
  //        .data('axis.n', axis.n)
  //        .css({ backgroundColor: "#f00", opacity: 0, cursor: "pointer" })
  //        .appendTo(plot.getPlaceholder())
  //        .hover(
  //               function () { 
  //                            jQuery(this).css({ opacity: 0.10 }); 
  //                            jQuery("#" + axis.direction + axis.n + "axis").css( "color","red" ); 
  //                           },
  //               function () { 
  //                            jQuery(this).css({ opacity: 0 }); 
  //                            jQuery("#" + axis.direction + axis.n + "axis").css( "color","black" ); 
  //                           }
  //              );
  //  });

   return;
  }
