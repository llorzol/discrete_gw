/**
 * Namespace: Flot.Lithology
 *
 * Sites is a JavaScript library to provide a set of functions to build
 *  a graph of the lithology records for a single from a tab delimiter text file.
 *
 * version 1.06
 * November 6, 2017
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

function plotLithology(myLithology)
  { 
   // No subsurface
   //
   if(typeof myLithology.status != "undefined") 
     {
      var message = myLithology.warning;
      if(typeof myLithology.error !== "undefined")   {message = myLithology.error;}
      if(typeof myLithology.warning !== "undefined") {message = myLithology.warning;}

      openModal(message);
      fadeModal(3000);
      return;
     }

   // Check for returning warning or error
   //
   var message       = myLithology.warning;
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
   var LegendHash    = new Object();
   var ToolTipHash   = new Object();
   var cell_width    = 500;
   var y_axis_max    = -999999999.99;
   var y_axis_min    =  999999999.99;
   data              = [];
   data_sets         = [];
   color_scheme      = [];

   plot              = "";

   myLith            = myLithology[coop_site_no];
   myLookUp          = myLithology['Lithology'];

   // No lithology records
   //
   if(typeof myLith === "undefined")
     {
      var title   = "Harney Basin Lithology Grapher";
      var message = "No lithology records for site " + coop_site_no;

      openModal(message);
      fadeModal(3000);
      return;
     }

   // Lithology records
   //
   else
     {
      var imageList = [];

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
               
      var cells        = myLith;
      var top          = 0;
      for(i = 0; i < cells.length; i++)
         {
          var unit        = cells[i]['primary_lithology'];
          var top_elev    = parseFloat(cells[i].top);
          var bot_elev    = parseFloat(cells[i].bot);
          if(top_elev > y_axis_max) { y_axis_max = top_elev; }
          if(bot_elev < y_axis_min) { y_axis_min = bot_elev; }
          var thickness   = top_elev - bot_elev;
          var bot         = top - thickness;
          //var color       = cells[i].color;
          var color       = "#fff";
          var explanation = myLookUp[unit]['description'];
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
             rock_image  = "lithology_patterns/" + myLookUp[unit]['symbol'] + ".png";
             console.log("Rock image " + rock_image);
             if(jQuery.inArray(rock_image, imageList) < 0)
               {
                console.log("Loading rock image " + rock_image);
                if(rock_image.complete && rock_image.naturalHeight !== 0)
                  {
                   console.log("Rock image " + rock_image + " did not load");
                  }
                imageList.push(rock_image);
               }
             color       = cells[i].color;
             color_scheme.push(color);
                    
             rock = [[rock_image, 0.0, Math.abs(top), cell_width, Math.abs(bot)]];

             data_sets.push(
                            { 
                             label: label,
                             id   : rock_id,
                             xaxis : 1,
                             yaxis : 1,
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
     }
   console.log("Y axis max " + y_axis_max + " min " + y_axis_min);

   // Page title
   //
   var title = "Well Lithology Information for Site " + coop_site_no + " at Longitude " + parseFloat(longitude).toFixed(4) + " Latitude " + parseFloat(latitude).toFixed(4);
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
                  series: { 
                           images: { show: true, anchor: "corner" } 
                          },
                  legend: { 
                           show: false 
                          },
                  yaxes:  yaxes,
                  xaxis: { show: false }
                 };
                    
   // Graph plot
   //
   $.plot.image.loadDataImages(data, options, function () {
     $.plot("#cell_graph", data, options);
   });
 
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

   //locationMap(latitude, longitude);
  }

function setColor(lith_code)
  {
    // Set color
    //
    var item        = "legend_" + lith_code;
    jQuery('<div id="' + item + '"></div>').appendTo("body");
    var div_color   = jQuery('#' + item).css('color');
    if(typeof div_color === "undefined" || div_color === "null") { jQuery('#' + item).remove(); return '#000000'; }
    var graph_color = div_color;
    if(div_color.match(/^rgb/i))
      {
        graph_color = rgb2hex(div_color);
      }
    if(graph_color === "#000000") { jQuery('#' + item).remove(); return '#000000'; }
    jQuery('#' + item).remove();

   return graph_color;
  }

function setExplanation(lith_code)
  {
    // Set css selector
    //
    var item        = "legend_" + lith_code;
    jQuery('<div id="' + item + '"></div>').appendTo("body");
    var explanation   = jQuery('#' + item).css('-explanation');
    //var explanation   = jQuery('#' + item).prop('-explanation');
    if(lith_code === "SO")
      {
        //alert("Lith " + lith_code + " Explanation " + explanation);
      }
    if(typeof explanation === "undefined" || explanation === "null") { jQuery('#' + item).remove(); return ''; }
    jQuery('#' + item).remove();

   return explanation;
  }

    function getCssValue(selector, attribute) {
        var raw = getRawCss(selector);
        if (!raw) {
            return null;
        }
        var parts = raw.split(';');
        for (var i in parts) {
            var subparts = parts[i].split(':');
            if (trimString(subparts[0]) == attribute) {
                return subparts[1];
            }
        }
        return null;
    }

    function trimString(s) {
        return s.replace(/^\s+|\s+$/g, ""); 
    }

    function getRawCss(selector) {
        for (var i = 0; i < document.styleSheets.length; i++) {
            var css = document.styleSheets[i].rules || document.styleSheets[i].cssRules;
            for (var x = 0; x < css.length; x++) {
                if (css[x].selectorText == selector) {
                    return (css[x].cssText) ? css[x].cssText : css[x].style.cssText;
                }
            }
        }
        return null;
    }

function rgb2hex(colorval) {
    var parts = colorval.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    delete(parts[0]);
    for (var i = 1; i <= 3; ++i) {
        parts[i] = parseInt(parts[i]).toString(16);
        if (parts[i].length == 1) parts[i] = '0' + parts[i];
    }
    var color = '#' + parts.join('');
    return color;
}

function get_max_min( min_value, max_value)
  { 
   var factor         = 0.01; 
   var interval_shift = 0.67; 
   var range          = max_value - min_value; 
        
   var interval       = factor; 
   range              = range / 5.0; 
        
   // Determine interval 
   // 
   while (range > factor) 
     { 
      if(range <= (factor * 1)) 
        { 
   	 interval = factor * 1; 
        } 
      else if (range <= (factor * 2))
        { 
   	 interval = factor * 2; 
        } 
      else if (range <= (factor * 2.5))
        { 
   	 if(factor < 10.0) 
           { 
            interval = factor * 2; 
           } 
         else 
           { 
            interval = factor * 2.5; 
           } 
        } 
      else if (range <= (factor * 5))
        { 
         interval = factor * 5;
        } 
      else
        { 
         interval = factor * 10;
        } 

       factor = factor * 10; 
    } 

   // Maximum
   //
   factor = parseInt(max_value / interval); 
   value  = factor * interval; 
   if(max_value > value ) 
     { 
      value = (factor + 1) * interval; 
     } 
   if(Math.abs(max_value - value) <= interval_shift * interval) 
     { 
      max_value = value + interval; 
     } 
   else 
     { 
      max_value = value; 
     } 

   // Minimum
   //
   factor = parseInt(min_value / interval); 
   value  = factor * interval; 
   if(min_value > value ) 
     { 
      value = (factor - 1) * interval; 
     } 
   if(Math.abs(min_value - value) <= interval_shift * interval) 
     { 
      min_value = value - interval; 
     } 
   else 
     { 
      min_value = value; 
     } 
      
   return [min_value, max_value, interval];
  }

function readLithology (file_name, delimiter) 
  {
    var SiteInfo = {};

    // Check file name
    //
    if(file_name.length < 1)
      {
        alert("No file containing list of sites was specified");
        return false;
      }

    // Load file
    //
    jQuery.ajax( 
                { url: file_name + "?_="+(new Date()).valueOf(),
                  async: false
                })
      .done(function(data)
            {
              var indexField = "other_id";
              var myFields   = ["other_id", "lth1", "lth2", "color", "water", "depth"];
              var myData     = parseLith(data, indexField, myFields);

              // Loop through data record
              //
              var site_count = Object.size(myData);      
              if(site_count > 0)
                {
                  jQuery.each(myData, 
                              function(index) {
                                  if(typeof SiteInfo[index] === "undefined")
                                    {
                                      SiteInfo[index] = {};
                                    }
                                  SiteInfo[index]["lithology"]  = myData[index]["lithology"];
                              });
                }
            })
      .fail(function() { console.log( "Error reading site file " + file_name ); });

    return SiteInfo;
  }

function readLithExplanations (file_name, delimiter) 
  {
    var myCodes = {};

    // Check file name
    //
    if(file_name.length < 1)
      {
        alert("No file containing list of sites was specified");
        return false;
      }

    // Load file
    //
    jQuery.ajax( 
                { url: file_name + "?_="+(new Date()).valueOf(),
                  async: false
                })
      .done(function(data)
            {
              var indexField = "code";
              var myFields   = ["explanation", "color"];
              myCodes        = parseRDB(data, indexField, myFields);
            })
      .fail(function() { console.log( "Error reading site file " + file_name ); });

    return myCodes;
  }

function parseLith(dataRDB, indexField, myFields)
  {
    var title   = "Upper Deschutes Basin Lithology";
    var message = "Reading well bore lithology from file";
    message_dialog(title, message);
    close_dialog();

    var myRe        = /^#/;
    var lineRe      = /(\r\n|\n)/g;  //the "g" here is a modifier to find a global match (i.e. the script will continue finding matches and not just the first one)
    var myLines     = 0;
    var myCount     = 0;
    var delimiter   ='\t';
    var myData      = {};

    var Fields      = [];

    // Parse in lines
    //
    var fileLines   = dataRDB.split(lineRe);

    // Column names on header line
    //
    for(i = 0; i < fileLines.length; i++)
      {
        var fileLine = jQuery.trim(fileLines[i]);
        myLines++;
        if(myRe.test(fileLine))
          {
            continue;
          }
        if(fileLine.length > 1)
          {
            Fields = fileLine.split(delimiter);
            break;
          }
      }
      
    // Check index column name in file
    //
    if(jQuery.inArray(indexField,Fields) < 0)
      {
        var message = "Header line of column names does not contain " + indexField + " column\n";
        message    += "Header line contains " + Fields.join(", ");
        alert(message);
        return false;
      }
      
    // Check column names on header line
    //
    for(var i = 0; i < myFields.length; i++)
      {
        var myField = myFields[i];
        if(jQuery.inArray(myField,Fields) < 0)
          {
            var message = "Header line of column names does not contain " + myField + " column\n";
            message    += "Header line contains " + Fields.join(", ");
            alert(message);
            return false;
          }
      }
       
    // Format line in header portion [skip]
    //
    var fileLine = jQuery.trim(fileLines[++myLines]);

    // Data lines
    //
    while(myLines < fileLines.length)
      {
        var fileLine = jQuery.trim(fileLines[++myLines]);
        if(myRe.test(fileLine))
          {
            continue;
          }
        if(fileLine.length > 1)
          {
            var Values    = fileLine.split(delimiter);
            var indexCol  = Values[jQuery.inArray(indexField,Fields)];

            // Key does not exist [First time seen; create it]
            //
            if(typeof myData[indexCol] === "undefined")
              {
                myData[indexCol] = {};
              }
            if(typeof myData[indexCol]["lithology"] === "undefined")
              {
                myData[indexCol]["lithology"] = [];
              }
          
            // Loop through specified fields only
            //
            for(var i = 0; i < myFields.length; i++)
              {
                var Value = Values[jQuery.inArray(myFields[i],Fields)];

                myData[indexCol][myFields[i]] = Value;
              }

            // Combine lithology and depth
            //
            myData[indexCol]["lithology"].push(
                                               [ 
                                                myData[indexCol].lth1,
                                                myData[indexCol].depth
                                               ]
                                              );

            myCount++;
          }
      }

    return myData;

  }
