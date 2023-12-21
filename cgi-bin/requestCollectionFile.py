#!/usr/bin/env python
#
###############################################################################
# $Id: requestCollectionFile.py
#
# Project:  requestCollectionFile.py
# Purpose:  Script reads an tab-limited collection text file for USGS and OWRD
#           sites.
# 
# Author:   Leonard Orzol <llorzol@usgs.gov>
#
###############################################################################
# Copyright (c) Leonard Orzol <llorzol@usgs.gov>
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

import os, sys, string, re

from datetime import datetime

#import subprocess

import json

# Set up logging
#
#import logging

# Import modules for CGI handling
#
import cgi, cgitb 

# Create instance of FieldStorage
#
params = cgi.FieldStorage()

# ------------------------------------------------------------
# -- Aliases for performance
# ------------------------------------------------------------
output          = sys.stderr.write
argv            = sys.argv
join            = string.join
split           = string.split
rjust           = string.rjust
strip           = string.strip

quiet           = False
debug           = False

program         = "USGS OWRD CDWR Site Loading Script"
version         = "1.05"
version_date    = "06February2019"

program_args    = []

query_string    = ''
script_uri      = ''
server_name     = ''

# =============================================================================
# -- Set global variables
#
server_name              = "waterservices"
timeOut                  = 600
contentType              = "text/plain"

# Web parameter codes
#
#worthlessParams = {}

# Web requests
#
#from serviceRequests import requestLocalFile
#from serviceRequests import requestSitesService
#from serviceRequests import requestOwrdService

#from processRequests import processSiteList
#from processRequests import processSiteService
#from processRequests import processOwrdService

# =============================================================================

def processCollectionSites (itemColumn, columnL, service_rdbL):

   siteInfoD  = {}
   siteCount  = 0
   
   # Parse head lines
   #
   while len(service_rdbL) > 0:
         
      Line = service_rdbL[0].strip("\n|\r")
      del service_rdbL[0]

      # Grab column names in header
      #
      if Line[0] != '#':
         namesL = Line.lower().split('\t')
         break

   # Format line in header section
   #
   del service_rdbL[0]

   # Check column names
   #
   try:
      indexNumber = namesL.index(itemColumn)
   except ValueError: 
      message = "Missing index column " + itemColumn
      return message, {}

   # Parse data lines
   #
   while len(service_rdbL) > 0:

      Line = service_rdbL[0].strip("\n|\r")
      del service_rdbL[0]

      # Skip site
      #
      if Line[0] == '#':
         continue

      valuesL = Line.split('\t')

      indexSite = str(valuesL[ namesL.index(itemColumn) ])

      recordD = {}
   
      for column in columnL:

         try:
            indexValue      = valuesL[ namesL.index(column) ]
            recordD[column] = indexValue
         except ValueError:
            message  = "Parsing issue for column %s " % column
            message += "Unable to parse %s" % Line
            return message, siteInfoD

         #print column,indexValue
   
      dec_lat_va     = recordD['dec_lat_va']
      dec_long_va    = recordD['dec_long_va']
      status         = "Active"
      gw_begin_date  = None
      gw_end_date    = None
      
      siteCount     += 1

      # Check for sites with no valid location
      #
      if len(dec_lat_va) < 1 or len(dec_long_va) < 1:
         continue
   
      if indexSite not in siteInfoD:
         siteInfoD[indexSite] = {}
               
      siteInfoD[indexSite]['agency_cd']          = recordD['agency_cd']
      siteInfoD[indexSite]['site_no']            = recordD['site_no']
      siteInfoD[indexSite]['cdwr_id']            = recordD['cdwr_id']
      siteInfoD[indexSite]['coop_site_no']       = recordD['coop_site_no']
      siteInfoD[indexSite]['state_well_nmbr']    = recordD['state_well_nmbr']
      siteInfoD[indexSite]['dec_lat_va']         = recordD['dec_lat_va']
      siteInfoD[indexSite]['dec_long_va']        = recordD['dec_long_va']
      siteInfoD[indexSite]['station_nm']         = recordD['station_nm']
      siteInfoD[indexSite]['status']             = status
      siteInfoD[indexSite]['gw_begin_date']      = gw_begin_date
      siteInfoD[indexSite]['gw_end_date']        = gw_end_date

   message = "Processed %d sites" % siteCount
   ##print message
   
   return message, siteInfoD
# =============================================================================

def processWls (keyColumn, columnL, service_rdbL):

   serviceL    = []
   recordCount = 0
   message     = ''
   sitesD      = {}
   activeDate  = datetime.strptime('01-01-2018', '%m-%d-%Y')
   
   # Parse head lines
   #
   while len(service_rdbL) > 0:
         
      Line = service_rdbL[0].strip("\n|\r")
      del service_rdbL[0]

      # Grab column names in header
      #
      if Line[0] != '#':
         namesL = Line.split('\t')
         break

   # Format line in header section
   #
   del service_rdbL[0]

   # Check column names
   #
   if namesL.index(keyColumn) < 0:
      message = "Missing index column " + keyColumn
      return message, serviceD

   # Parse data lines
   #
   while len(service_rdbL) > 0:

      Line = service_rdbL[0].strip("\n|\r")
      del service_rdbL[0]

      valuesL = Line.split('\t')

      recordDate    = str(valuesL[ namesL.index('lev_dtm') ])[:10]
      wlsDate       = datetime.strptime(recordDate, '%m-%d-%Y')
      site_id       = str(valuesL[ namesL.index('site_id') ])
      lev_agency_cd = str(valuesL[ namesL.index('lev_agency_cd') ])
      
      if len(lev_agency_cd) > 0 and lev_agency_cd == "OR004":
         lev_agency_cd = "OWRD"         

      # Check if site is commented out
      #
      if site_id[0] != "#":         
   
         # Check if site is already included
         #
         if site_id not in sitesD:

            sitesD[site_id] = {}
   
            # Set dates
            #
            BeginDate = wlsDate
            EndDate   = wlsDate

            sitesD[site_id]['gw_begin_date'] = recordDate
            sitesD[site_id]['gw_end_date']   = recordDate
            sitesD[site_id]['gw_agency_cd']  = []
            sitesD[site_id]['gw_count']      = 0
            sitesD[site_id]['gw_status']     = 'Inactive'

            status                           = 'Inactive'

         # Check monitoring status
         #
         if wlsDate > activeDate:
            sitesD[site_id]['gw_status']     = 'Active'
            status                           = 'Active'

         # Check dates
         #
         if wlsDate < BeginDate:
            BeginDate                        = wlsDate
            sitesD[site_id]['gw_begin_date'] = recordDate
            
         if wlsDate > EndDate:
            EndDate                        = wlsDate
            sitesD[site_id]['gw_end_date'] = recordDate

         sitesD[site_id]['gw_count'] += 1

         # Check measuring agency list
         #
         if len(lev_agency_cd) > 0 and lev_agency_cd not in sitesD[site_id]['gw_agency_cd']:
            sitesD[site_id]['gw_agency_cd'].append(lev_agency_cd)
            
            sitesD[site_id][lev_agency_cd] = [recordDate, recordDate, 1, status]
            
         elif len(lev_agency_cd) > 0:
            porBeginDate = sitesD[site_id][lev_agency_cd][0]
            porEndDate   = sitesD[site_id][lev_agency_cd][1]
            
            porDate      = datetime.strptime(porBeginDate, '%m-%d-%Y')

            # Check dates for lev_agency_cd
            #
            if wlsDate < porDate:
               sitesD[site_id][lev_agency_cd][0] = recordDate
               
            porDate      = datetime.strptime(porEndDate, '%m-%d-%Y')

            if wlsDate > porDate:
               sitesD[site_id][lev_agency_cd][1] = recordDate
 
            if status == "Active":
               sitesD[site_id][lev_agency_cd][3] = "Active"
               
            sitesD[site_id][lev_agency_cd][2] += 1
            
   return message, sitesD

# =============================================================================

# ----------------------------------------------------------------------
# -- Main program
# ----------------------------------------------------------------------
collection_file  = "data/collection.txt"
waterlevel_file  = "data/waterlevels.txt"
siteInfoD        = {}
   
# Obtain list of site records
#
mySiteFields = [
                "site_id",
                "agency_cd",
                "site_no",
                "coop_site_no",
                "cdwr_id",
                "state_well_nmbr",
                "station_nm",
                "dec_lat_va",
                "dec_long_va",
                "alt_va",
                "alt_acy_va",
                "alt_datum_cd"
               ]
   
# Set column names
#
myGwFields = [
                "site_id",
                "site_no",
                "agency_cd",
                "coop_site_no",
                "cdwr_id",
                "lev_va",
                "lev_acy_cd",
                "lev_dtm",
                "lev_dt",
                "lev_tm",
                "lev_tz_cd",
                "lev_dt_acy_cd",
                "lev_str_dt",
                "lev_status_cd",
                "lev_meth_cd",
                "lev_agency_cd",
                "lev_src_cd",
                "lev_web_cd",
                "lev_rmk_tx"
               ]

# Read
#
if os.path.exists(collection_file):

   # Open file
   #
   fh = open(collection_file, 'r')
   if fh is None:
      message = "Can not open collection file %s" % collection_file
      print "Content-type:application/json\n\n"
      print '{ "message": "%s" }' % message
      sys.exit()

   contentL = fh.readlines()

   fh.close()

   if len(contentL) > 0:
      message, siteInfoD = processCollectionSites("site_id", mySiteFields, contentL)
   
   else:
      print "Content-type:application/json\n\n"
      print '{ "message": "%s" }' % message
      sys.exit()
   
else:
   message = "Require the path to the file with the list of OWRD sites"
   print "Content-type:application/json\n\n"
   print '{ "message": "%s" }' % message
   sys.exit()

# Read
#
if os.path.exists(waterlevel_file):

   # Open file
   #
   fh = open(waterlevel_file, 'r')
   if fh is None:
      message = "Can not open water-level file %s" % waterlevel_file
      print "Content-type:application/json\n\n"
      print '{ "message": "%s" }' % message
      sys.exit()

   contentL = fh.readlines()

   fh.close()

   if len(contentL) > 0:
      message, gwInfoD = processWls("site_id", myGwFields, contentL)
   
   else:
      print "Content-type:application/json\n\n"
      print '{ "message": "%s" }' % message
      sys.exit()
   
else:
   message = "Missing a waterlevel file"
   print "Content-type:application/json\n\n"
   print '{ "message": "%s" }' % message
   sys.exit()

#print "Processed %d of %d sites" % (len(siteInfoD), len(siteL))
#print siteInfoD

# Prepare JSON output
# -------------------------------------------------
#
jsonL = []
jsonL.append('{')
jsonL.append('  "type" : "FeatureCollection",')
#jsonL.append('  "crs" : {')
#jsonL.append('    "type" : "name",')
#jsonL.append('    "properties" : {')
#jsonL.append('                   "name" : "EPSG:4326"')
#jsonL.append('                   }')
#jsonL.append('           },')
jsonL.append('  "features" : [')

# Site information
#
paramD             = {}
discreteParameters = []
siteColumnsL       = [
                      'site_no',
                      'agency_cd',
                      'station_nm',
                      'coop_site_no',
                      'cdwr_id',
                      'state_well_nmbr',
                      'status',
                      'gw_begin_date',
                      'gw_end_date',
                      'gw_agency_cd',
                      'gw_count'
                     ]

# Loop through site information
#
features        = []
siteCount       = 0
duplicateSitesD = {}
for site_id in sorted(siteInfoD.iterkeys()):
   siteCount += 1
   x_pt     = siteInfoD[site_id]['dec_long_va']
   y_pt     = siteInfoD[site_id]['dec_lat_va']
   
   feature  = '                {'
   feature += '"type": "Feature", '
   feature += '"geometry": {"type": "Point", "coordinates": [%s, %s]}, ' % (str(x_pt), str(y_pt))
   feature += '"properties": { '
   recordL = []
   recordL.append('"%s" : %s' % ('site_id', json.dumps(site_id)))
   for column in siteColumnsL:
      if column == 'station_nm':
         recordL.append('"%s" : %s' % (column, json.dumps(siteInfoD[site_id][column])))
      elif column == 'status':
         if site_id in gwInfoD:
            recordL.append('"%s" : %s' % (column, json.dumps(gwInfoD[site_id]['gw_status'])))
         else:
            recordL.append('"%s" : "%s"' % (column, 'Inactive'))
      elif column in ['gw_begin_date', 'gw_end_date', 'gw_agency_cd', 'gw_count']:
         if site_id in gwInfoD:
            recordL.append('"%s" : %s' % (column, json.dumps(gwInfoD[site_id][column])))

            if column == 'gw_agency_cd':
               for lev_agency in gwInfoD[site_id][column]:
                  recordL.append('"%s" : %s' % (lev_agency, json.dumps(gwInfoD[site_id][lev_agency])))
         else:
            recordL.append('"%s" : %s' % (column, "null"))
      else:
         recordL.append('"%s" : %s' % (column, json.dumps(siteInfoD[site_id][column])))
         #recordL.append('"%s" : "%s"' % (column, str(siteInfoD[site_id][column])))

   feature += ", ".join(recordL)
   feature += '} }'
   features.append(feature)

jsonL.append('%s' % ",\n".join(features))
jsonL.append('               ]')

# Finish json output
#
jsonL.append('}')

message = "Processed %d sites" % siteCount

# Output json
# -------------------------------------------------
#
print "Content-type:application/json\n\n"
print '\n'.join(jsonL)


sys.exit()

