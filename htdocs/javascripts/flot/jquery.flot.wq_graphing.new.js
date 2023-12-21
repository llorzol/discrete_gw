/* NwisWeb Javascript plotting library for jQuery and flot.
 *
 * Wq_Graphing is a JavaScript library to graph NwisWeb water-quality
 *  information such as the discrete water-quality measurements for a site(s).
 *
 * version 1.04
 * October 2, 2016
 */

/*
###############################################################################
# Copyright (c) 2016 NwisWeb
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
      
function plotDiscreteWq(myJson) 
  {
    console.log("plotDiscreteWq");

    // Set variables
    //
    var x_axis_min     =  9999999999999999999;
    var x_axis_max     = -9999999999999999999;

    var y_axis_min     =  9999999999999999999;
    var y_axis_max     = -9999999999999999999;

    // Site information
    //
    var site_key       = mySites.shift();

    var SiteInfo       = myJson.SiteInfo

    for(site_no in SiteInfo)
      {
       agency_cd          = SiteInfo[site_no].agency_cd;
       //site_no            = SiteInfo[site_no].site_no;
       station_nm         = SiteInfo[site_no].station_nm;
      }
    
   // Change title
   // 
   $(".body-wrap").show(); 
   $("#plot_title").text(agency_cd + " " + site_no + " " + station_nm);
   $("#header").html("Water-Quality Measurement Information for Site " + agency_cd + " " + site_no + " " + station_nm);

   jQuery(document).prop("title", "Water-Quality Measurement Information for Site " + agency_cd + " " + site_no + " " + station_nm);

    var siteInfo       = [];
    siteInfo.push("<ul>");
    siteInfo.push(" <li>");
    siteInfo.push(" Agency code: " + agency_cd);
    siteInfo.push(" </li>");
    siteInfo.push(" <li>");
    siteInfo.push(" NWIS site number: " + site_no);
    siteInfo.push(" </li>");
    siteInfo.push(" <li>");
    siteInfo.push(" NWIS station name: " + station_nm);
    siteInfo.push(" </li>");
    siteInfo.push("</ul>");
    $("#site_tx").html(siteInfo.join("\n")); 

    // Parameter code information
    //
    var ParmInfo        = myJson.ParameterCodes;

    // Water Quality information
    //
    var WqInfo          = myJson.WaterQuality;
  
    // Loop through water-quality records
    //
    var wqDiscrete      = {};
    var last_wq_dt      = null;

    for(var count in WqInfo)
       {
         var sample_dt     = WqInfo[count].sample_dt;
         var sample_tm     = WqInfo[count].sample_tm;
         var sample_tz     = WqInfo[count].sample_tz;
         console.log("sample_dt " + sample_dt);

         // Process date and time
         //
         var wq_dt_str = sample_dt;
         if(sample_dt.length < 5)
           {
             sample_dt += "/01/01";
           }
         if(sample_dt.length < 8)
           {
             sample_dt = sample_dt.replace(/-/g, "/") + "/01";
           }
         else
           {
             sample_dt = sample_dt.replace(/\-/g, "/");
           }

         var datetime = Date.parse(sample_dt);
  
         if(datetime > x_axis_max) { x_axis_max = datetime; }
         if(datetime < x_axis_min) { x_axis_min = datetime; }

         // Process parameter values
         //
         for(var param_cd in ParmInfo)
            {
             var param_nm = ParmInfo[param_cd];

             var param_va = WqInfo[count][param_cd];
             //console.log("Parm " + param_cd + " --> " + param_va + ' => ' + isNaN(param_va));

             // No valid parameter value
             //
             if(isNaN(param_va))
               {
                param_va = '';
               }

             var wq_va_str     = null;
             var value         = null;
    
             if(param_va.length > 0)
               {
                 wq_va_str = param_va.toString();
                 wq_va     = parseFloat(param_va);
                 value     = param_va;

                 if(typeof wqDiscrete[param_cd] === "undefined")
                   {
                    wqDiscrete[param_cd]             = {}
                    wqDiscrete[param_cd]['count']    = 0
                    wqDiscrete[param_cd]['min']      =  9999999999999999999;
                    wqDiscrete[param_cd]['max']      = -9999999999999999999;
                    wqDiscrete[param_cd]['data']     = [];
                    wqDiscrete[param_cd]['plot']     = 0;
                    wqDiscrete[param_cd]['param_nm'] = ParmInfo[param_cd];
                   }
                  wqDiscrete[param_cd]['count']++;
                  wqDiscrete[param_cd]['data'].push([datetime, value]);
             
                  // Set min and max
                  //
                  if(value !== null)
                    {
                     if(value > wqDiscrete[param_cd]['max'])
                       { 
                        wqDiscrete[param_cd]['max'] = value;
                       }
                     if(value < wqDiscrete[param_cd]['min'])
                       { 
                        wqDiscrete[param_cd]['min'] = value;
                       }
                    }
               }
            }

         if(sample_tz.length > 0)
           {
             //wq_dt_str += " " + lev_tz_cd;
           }
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
                                                       
    // Y axes
    //
    var yaxes_sets = [];
    var oaxes_sets = [];

    var ParmSortedL     = Object.keys(wqDiscrete).sort();

    for(var i = 0; i < ParmSortedL.length; i++)
       {
        var param_cd      = ParmSortedL[i];
        var color         = ColorHash[++color_no];
        var id            = [agency_cd, site_no, param_cd].join("_");
        var data          = wqDiscrete[param_cd]['data'];
        var y_axis_number = i + 1;
        color_scheme.push(color);
        data_sets.push(
                       { 
                        label : "Measured values for " + param_cd,
                        id    : id,
                        data  : data,
                        color : color,
                        xaxis : 1,
                        yaxis : y_axis_number,
                        lines : lines,
                        points: points
                       }
                      );

        // Y axes [only activate first parameter in list]
        //
        LegendHash[id]   = 0;
        var showAxis     = false;

        if(i == 0)
          {
           LegendHash[id]   = 1;
           showAxis         = true;
          }

        // Set Y axis lable for length
        //
        var param_nm    = setParamText(wqDiscrete[param_cd]['param_nm']);

        // Left Y axis
        //
        yaxes_sets.push(
                   { 
                    show: showAxis,
                    position: 'left',
                    color: color,
                    font: { size: 10, weight: "bold", color: color },
                    axisLabel: param_nm,
                    axisLabelPadding: 10,
                    min: wqDiscrete[param_cd]['min'],
                    max: wqDiscrete[param_cd]['max']
                   });
     
        oaxes_sets.push(
                   { 
                    show: true,
                    position: 'left',
                    //min: wqDiscrete[param_cd]['min'],
                    //max: wqDiscrete[param_cd]['max'],
                    font: {size: 10, weight: "bold", color: "#000000"}
                   });
      }
                                                       
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
    
   // Set available parameters
   // 
   availableParameters(wqDiscrete);
   
   // Data
   //
   data.push(data_sets[0]);
   yaxes = yaxes_sets;
   oaxes = oaxes_sets[0];
                                                       
   // Graph options
   //
   var options = {
                  //canvas: false,
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
                                                       
   // Graph plot
   //
   plot = $.plot($("#placeholder"), data, options);
   jQuery('.loading').remove();
   jQuery('#enableTooltip').prop('checked',false);
   jQuery('#enableAgingtip').prop('checked',false);

    // Overview
    //
    overview = $.plot($("#overview"), data, {
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
   legend_txt.push('<table id="Legend" class="legendTable" border="0">');
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

           // Checkbox element
           //
           var checked_txt = '';         
           if(LegendHash[id] > 0) { checked_txt = ' checked="checked"'; }
           legend_txt.push('  <input type="checkbox" name="' + id + '" value="on" id="checkbox_' + id + '"' + checked_txt + ' />');

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

   legend_txt.push(' </tbody>');
   legend_txt.push('</table>');
   jQuery("#Legend").html(legend_txt.join(""));

    var legends = jQuery(".legendValue");
    legends.each(function () {
        // fix the widths so they don't jump around
        jQuery(this).css('width', jQuery(this).width());
    });

   jQuery(".data_aging").hide();

   // Monitor dropdown from nav bar
   //
   jQuery('.available-parameters li').click(function(e) {
      e.preventDefault();
      var parm_cd = jQuery(this).prop('id');
      //console.log("Click " + parm_cd);

      jQuery('.checkBoxes input').each(function( index ) {
         //console.log("..checking " + jQuery(this).prop('id'));
         var agency_cd = jQuery(this).prop('id').split(/_/)[1];
         var site_no   = jQuery(this).prop('id').split(/_/)[2];
         var parmCd    = jQuery(this).prop('id').split(/_/)[3];
         var id        = [ agency_cd, site_no, parmCd ].join("_");
         var checkbox  = jQuery(this).prop('id').replace("label_", "checkbox_");

         if(parmCd == parm_cd)
           {
            LegendHash[id] = 1;
            jQuery("#" + checkbox).prop('checked', true);
            jQuery('#label_' + id).css({ "opacity": 1.0 });
            jQuery('#value_' + id).html(" ");
            console.log("..checking " + id);
           }
         else
           {
            LegendHash[id] = 0;
            jQuery("#" + checkbox).prop('checked', false);
            jQuery('#label_' + id).css({ "opacity": 0.4 });
            jQuery('#value_' + id).html(" ");
           }
      });
                                 
      data  = [];
      yaxes = [];
      for(i = 0; i < data_sets.length; i++)
         {
          var id = data_sets[i].id;
          if(LegendHash[id] > 0)
            {
             data.push(data_sets[i]);
             yaxes.push(yaxes_sets[i]);
             console.log("ID --> " + id);
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
                                                          yaxes: yaxes,
                                                          xaxis: { min: axes.xaxis.min, max: axes.xaxis.max, ticks: Ticks }
       }));
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
   jQuery('.checkBoxes :checkbox').click(function() {

     //var selected   = jQuery(this).prop('name');
     var id          = jQuery(this).prop('id').replace("checkbox_", "");

     console.log("ID " + id + " checked " + jQuery("#checkbox_" + id).prop('checked') + " legend " + LegendHash[id]);
                                    
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

     var yaxesOptions = plot.getOptions().yaxes;
     console.log("getOptions " + JSON.stringify(yaxesOptions));
     for(var ii = 0; ii < plot.getOptions().yaxes.length; ii++)
        {
         console.log("getOptions Loop " + plot.getOptions().yaxes[ii].show);
        }

     // Loop through data sets
     //
     data  = [];
     yaxes = [];
     for(var i = 0; i < data_sets.length; i++)
        {
         var id = data_sets[i].id;
         if(LegendHash[id] > 0)
           {
            console.log("Data " + id + " LegendHash -> " + LegendHash[id]);
            data.push(data_sets[i]);
            plot.getOptions().yaxes[i].show = true;
            yaxes.push(yaxes_sets[i]);
           }
        }

     console.log("Reset");
     for(var ii = 0; ii < plot.getOptions().yaxes.length; ii++)
        {
         console.log("getOptions Loop " + plot.getOptions().yaxes[ii].show);
        }

     //var yaxesOptions = plot.getOptions().yaxes;
     //console.log("getOptions " + JSON.stringify(yaxesOptions));
        
     // Determine min/max of xaxis
     //
     var axes  = plot.getAxes();
     var Ticks = setTicks(axes.xaxis.min, axes.xaxis.max);
 
     jQuery.plot(jQuery("#placeholder"), data,
                                         jQuery.extend(true, 
                                                       {}, 
                                                       options, 
                                                       {
                                                         yaxes: yaxes,
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

  }

function setAxesLabels(plot) 
  {
   // Create a div for each axis
   //
   jQuery.each(plot.getAxes(), function (i, axis) {

   if(!axis.show)
      return;

   var box = axis.box;

   jQuery("<div class='axisTarget' style='position:absolute; left:" + box.left + "px; top:" + box.top + "px; width:" + box.width +  "px; height:" + box.height + "px'></div>")
            .data("axis.direction", axis.direction)
            .data("axis.n", axis.n)
            .css({ backgroundColor: "#f00", opacity: 0, cursor: "pointer" })
            .appendTo(plot.getPlaceholder()).hover(
                                                   function () { $(this).css({ opacity: 0.10 }) },
                                                   function () { $(this).css({ opacity: 0 }) }
                                                  )
                                            .click(function () {
                                               $("#click").text("You clicked the " + axis.direction + axis.n + "axis!")
             });
     });
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

// Determine text width in pixels
//
function setParamText(param_nm) {

  var text_length = param_nm.length;
  var text_width  = setYaxisLength(param_nm);
  var char_ratio  = text_width / text_length;

  var param_array = param_nm.split(/(\s+)/);

  var param_text  =  [];
  var text        =  [];
  for(var i = 0; i < param_array.length; i++)
     {
      string = text.join(" ");
      if(string.length * char_ratio > 250)
        {
         param_text.push("<br />");
         text = [];
        }
      text.push(param_array[i]);
      param_text.push(param_array[i]);
     }
  

  return param_text.join(" ");
}

// Determine text width in pixels
//
function setYaxisLength(param_nm) {
  // create dummy span
  jQuery('<span id="param_nm"></span>').appendTo("body");
  // set text
  jQuery('#param_nm').text(param_nm);
  // set font parameters
  jQuery('#param_nm').addClass('y1axisLabel');
  // get width
  var width = jQuery('#param_nm').width();
  // Optional:
  jQuery('#param_nm').remove();
  // Return width
  var axisHeight = jQuery('flot-overlay').height();

  return width;
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


// Function to locate y axes
//
function labelYAxis(plot, axis) 
  {
    // Create a div for each axis
    //
    jQuery.each(plot.getAxes(), function (i, axis) {
      if(!axis.show)
         return;

      //var box = axis.box;
      var box = getBoundingBoxForAxis(plot, axis);

      jQuery("<div class='axisTarget' style='position:absolute; left:" + box.left + "px; top:" + box.top + "px; width:" + box.width +  "px; height:" + box.height + "px'></div>")
				.data("axis.direction", axis.direction)
				.data("axis.n", axis.n)
				.css({ backgroundColor: "#f00", opacity: 0, cursor: "pointer" })
				.appendTo(plot.getPlaceholder())
				.hover(
					function () { $(this).css({ opacity: 0.10 }) },
					function () { $(this).css({ opacity: 0 }) }
				)
				.click(function () {
					$("#click").text("You clicked the " + axis.direction + axis.n + "axis!")
				});

      var yaxisClass = '.flot-y' + i + '-axis';
      var yaxisLabel = $("<div class='axisLabel yaxisLabels'></div>").text("param_nm").appendTo($("#placeholder"));
      yaxisLabel.css("margin-top", yaxisLabel.width() / 2 - 20);
      yaxisLabel.css("margin-left", (box.left - 50));
    });
        
   return;
  }
