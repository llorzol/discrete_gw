#!/usr/bin/env python3
#
###############################################################################
# $Id: requestGwRecords.py
#
# Project:  requestGwRecords
# Purpose:  Script reads groundwater measurements from an tab-limited text file of
#           USGS and OWRD records.
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

import datetime

import json

# Set up logging
#
import logging

# -- Set logging file
#
# Create screen handler
#
screen_logger = logging.getLogger()
formatter     = logging.Formatter(fmt='%(message)s')
console       = logging.StreamHandler()
console.setFormatter(formatter)
screen_logger.addHandler(console)
screen_logger.setLevel(logging.INFO)

# Set up path to data files
#
import project_config
projectDir = project_config.project_config['default']

# Import modules for CGI handling
#
from urllib import parse

# ------------------------------------------------------------
# -- Set
# ------------------------------------------------------------
debug           = False

program         = "USGS OWRD CDWR Groundwater Measurements Loading Script"
version         = "2.09"
version_date    = "May 29, 2024"

program_args    = []

# =============================================================================
def errorMessage(error_message):

   print("Content-type:application/json\n\n")
   print('{ "message": "%s" }' % message)
   sys.exit()

# =============================================================================
def processCollectionSites (collection_file, mySiteFields, keyColumn, keySite):

   siteInfoD   = {}

   keyList     = keySite.split()

   screen_logger.info("\nprocessCollectionSites")
   screen_logger.info("Key %s" % "\t".join(keyList))
   screen_logger.info("Key Column %s" % keyColumn)
   
   # Read collection file
   # -------------------------------------------------
   #
   with open(collection_file,'r') as f:
       linesL = f.read().splitlines()

   # Parse for column names [rdb format]
   #
   while len(linesL) > 0:
         
      Line = linesL[0].strip("\n|\r")
      del linesL[0]

      # Grab column names in header
      #
      if Line[0] != '#':
         namesL = Line.split('\t')
         break

   # Format line in header section
   #
   del linesL[0]

   # Check column names
   #
   if keyColumn not in namesL: 
      message = "Missing index column " + keyColumn
      errorMessage(message)

   # Parse data lines
   #
   while len(linesL) > 0:
      
      if len(linesL[0]) < 1:
         del linesL[0]
         continue
      
      if linesL[0][0] == '#':
         del linesL[0]
         continue

      Line = linesL[0]
      del linesL[0]

      valuesL = Line.split('\t')

      tmpSite = str(valuesL[ namesL.index(keyColumn) ])

      # Check for site records
      #
      if tmpSite in keyList:
      
         for column in mySiteFields:
            if column in namesL:
               siteInfoD[column] = valuesL[ namesL.index(column) ]
            else:
               siteInfoD[column] = ''
    
   message = "Processed site %s" % keySite
   screen_logger.info(message)
   
   return siteInfoD
# =============================================================================
def processWls (waterlevel_file, myGwFields, keyColumn, keySite):

   serviceL    = []

   keyList     = keySite.split()

   screen_logger.info("\nprocessWls")
   screen_logger.info("Key %s" % "\t".join(keyList))
   screen_logger.info("Key Column %s" % keyColumn)
   
   # Read waterlevel file
   # -------------------------------------------------
   #
   with open(waterlevel_file,'r') as f:
       linesL = f.read().splitlines()
   
   # Parse head lines
   #
   while len(linesL) > 0:
         
      Line = linesL[0].strip("\n|\r")
      del linesL[0]

      # Grab column names in header
      #
      if Line[0] != '#':
         namesL = Line.split('\t')
         break

   # Format line in header section
   #
   #del linesL[0]

   # Check column names
   #
   if keyColumn not in namesL:
      message = "Missing index column " + keyColumn
      errorMessage(message)

   # Parse data lines
   #
   while len(linesL) > 0:
      
      if len(linesL[0]) < 1:
         del linesL[0]
         continue
      
      if linesL[0][0] == '#':
         del linesL[0]
         continue

      Line = linesL[0]
      del linesL[0]

      valuesL = Line.split('\t')

      tmpSite = str(valuesL[ namesL.index(keyColumn) ])

      # Check for site records
      #
      if tmpSite in keyList:

         recordD      = {}
      
         for column in myGwFields:
            if column in namesL:
               recordD[column] = valuesL[ namesL.index(column) ]
            else:
               recordD[column] = ''

         serviceL.append(recordD)

      # Check for site records
      #
      else:
         if len(serviceL) > 0:

            serviceL = sorted(serviceL, key=lambda x: x['lev_dtm'])
            break
    
   message = "Processed %d record" % len(serviceL)
   screen_logger.info(message)

   #sys.exit()

   return serviceL

# =============================================================================
def processCodes ():

   # Read codes and explanations
   #
   codeFiles = {
                "lev_acy_cds":    "data/water_level_acc_cd_query.txt",
                "lev_status_cds": "data/water_level_status_cd_query.txt",
                "lev_dt_acy_cds": "data/water_level_dtacy_cd_query.txt",
                "lev_meth_cds":   "data/water_level_meth_cd_query.txt",
                "lev_src_cds":    "data/water_level_src_cd_query.txt"
               }
   myCodeFields = [
                   "code",
                   "description"
                  ]
   
   codesD       = {}
   
   for code in codeFiles:
   
      codeFile = codeFiles[code]
   
      if code not in codesD:
         codesD[code] = {}
      
      if os.path.exists(codeFile):
      
         # Open discretization file
         #
         fh = open(codeFile, 'r')
         if fh is None:
            message = "Can not open code file %s" % codeFile
            errorMessage(message)
      
         contentL = fh.readlines()
      
         fh.close()
      
         if len(contentL) > 0:
         
            # Parse head lines
            #
            while len(contentL) > 0:
                  
               Line = contentL[0].strip("\n|\r")
               del contentL[0]
         
               # Grab column names in header
               #
               if Line[0] != '#':
                  namesL = Line.split('\t')
                  break
         
            # Format line in header section
            #
            del contentL[0]
   
            # Parse data lines
            #
            while len(contentL) > 0:
         
               Line = contentL[0].strip("\n|\r")
               del contentL[0]
         
               valuesL = Line.split('\t')
   
               codeColumn = str(valuesL[ namesL.index('Code') ])
               codeValue  = str(valuesL[ namesL.index('Description') ])
   
               codesD[code][codeColumn] = codeValue
   
   return codesD

# =============================================================================

# ----------------------------------------------------------------------
# -- Main program
# ----------------------------------------------------------------------
parmsDict        = {}
siteInfoD        = {}

# Parse the Query String
#
params = {}

#os.environ['QUERY_STRING'] = 'project=klamath_wells&column=site_id&site=433152121281301,415104121232901'
#os.environ['QUERY_STRING'] = 'project=klamath_wells&column=site_id&site=433152121281301'
#os.environ['QUERY_STRING'] = 'project=klamath_wells&site_id=417944N1220350W001'
#os.environ['QUERY_STRING'] = 'project=klamath_wells&column=site_id&site=433152121281301'
#os.environ['QUERY_STRING'] = 'project=klamath_wells&site_id=417944N1220350W001'
    
if 'QUERY_STRING' in os.environ:
    queryString = os.environ['QUERY_STRING']

    queryStringD = parse.parse_qs(queryString, encoding='utf-8')

    myParmsL = [
       'column',
       'project',
       'site',
       'site_id',
       'site_no',
       'coop_site_no',
       'cdwr_id'
       ]
    
    for myParm in myParmsL:
       if myParm in queryStringD:
          params[myParm] = re.escape(queryStringD[myParm][0])

screen_logger.info("\nrequestGwRecords")
screen_logger.info("params %s" % str(params))

# Check site and column
#
keyColumn        = None
keySite          = None

# Check column
#
if 'column' in params:
   keyColumn = params['column']

# Check site
#
if 'site' in params:
   keySite   = params['site']
   keyColumn = 'site_id'

# Check site_id
#
elif 'site_id' in params:
   keySite   = params['site_id']
   keyColumn = 'site_id'

# Check site_no
#
elif 'site_no' in params:
   keySite   = params['site_no']
   keyColumn = 'site_no'

# Check coop_site_no
#
elif 'coop_site_no' in params:
   keySite      = params['coop_site_no']
   keyColumn = 'coop_site_no'

# Check cdwr_id
#
elif 'cdwr_id' in params:
   keySite      = params['cdwr_id']
   keyColumn = 'cdwr_id'
   
else:
   message = "Require a NWIS site nmber or OWRD well log ID or CDWR well number"
   errorMessage(message)
    
# Check project path to data files
#
if 'project' in params:
   pathName   = params['project']
   projectDir = project_config.project_config[pathName]

screen_logger.info("Site %s" % keySite)
screen_logger.info("Search column %s" % keyColumn)
   
# Set column names
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
      
# Set project directory
#
collection_file  = "/".join([projectDir, "collection.txt"])
waterlevel_file  = "/".join([projectDir, "waterlevels.txt"])

screen_logger.info("Site %s Project %s" % (keySite, projectDir))
screen_logger.info("Collection file %s Waterlevel file %s" % (collection_file, waterlevel_file))

# Read
#
if os.path.exists(collection_file):

   # Process file
   #
   siteInfoD = processCollectionSites(collection_file, mySiteFields, keyColumn, keySite)
   
else:
   message = "Require the path to the collection file with the list of sites"
   errorMessage(message)

# Read
#
if os.path.exists(waterlevel_file):

   # Process file
   #
   siteInfoL = processWls(waterlevel_file, myGwFields, keyColumn, keySite)
   
else:
   message = "Require the path to the waterlevel file with the list of measurements"
   errorMessage(message)

   
# Obtain codes and explanations
# -------------------------------------------------
codesD = processCodes()


# Prepare JSON output
# -------------------------------------------------
#
message = "Outputting %d waterlevel measurements for site" % len(siteInfoD)
screen_logger.info(message)

jsonL = []
jsonL.append('{')
#jsonL.append('  "%s" : {' % site_id)

# Loop through site information
#
recordsL = []
for column in siteInfoD:
    recordsL.append('"%s":  "%s"' % (column, siteInfoD[column]))
   
jsonL.append(' "siteinfo" : {')
jsonL.append("  %s" % ",\n".join(recordsL))
jsonL.append('               },')

# Loop through waterlevel information
#
recordsL = []
for record in siteInfoL:
   recordString = "%s" % record
   recordsL.append(recordString.replace("\'","\""))
   
jsonL.append(' "waterlevels" : [')
jsonL.append("%s" % ",\n".join(recordsL))
jsonL.append('               ],')
#jsonL.append('  },')

# Loop through codes information
#
if len(codesD) > 0:
   codesL = []
   for codes in codesD:
       recordsL = []
       for code in codesD[codes]:
          recordString = '"%s": "%s"' % (code, codesD[codes][code])
          recordsL.append(recordString)
      
       codesL.append('  "%s" : {\n %s \n    }' % (codes, ",\n".join(recordsL)))
   
   jsonL.append("%s" % ",\n".join(codesL))                  

# Finish json output
#
jsonL.append('}')

# Output json
# -------------------------------------------------
#
print("Content-type:application/json\n\n")
print('\n'.join(jsonL))


sys.exit()
