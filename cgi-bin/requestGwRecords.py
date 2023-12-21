#!/usr/bin/env python
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

#import subprocess

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

# Import modules for CGI handling
#
import cgi, cgitb 

# Create instance of FieldStorage
#
params = cgi.FieldStorage()

# Set up path to data files
#
import project_config
projectDir = project_config.project_config['default']

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

program         = "USGS OWRD CDWR Groundwater Measurements Loading Script"
version         = "1.26"
version_date    = "September 9, 2021"

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

# =============================================================================

def processWls (keyColumn, keySite, columnL, linesL):

   serviceL    = []
   recordCount = 0
   message     = ''

   keyList     = []

   #pattern = '^([a-z]{4})\s*(\d{1,7})$'
   if re.search('^([a-z]{4})\s*(\d{1,7})$', keySite, re.I):
      countyAbbrev = keySite[:4]
      wellNumber   = keySite[4:]
      keyList.append("%s%6d" % (countyAbbrev, int(wellNumber)))
      keyList.append("%s%7d" % (countyAbbrev, int(wellNumber)))
      keyList.append("%s%07d" % (countyAbbrev, int(wellNumber)))
      keyList.append("%s%06d" % (countyAbbrev, int(wellNumber)))
      
   else:
      keyList.append("%s" % keySite)

   screen_logger.info("Key %s" % "\t".join(keyList))
   
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
   del linesL[0]

   # Check column names
   #
   if keyColumn not in namesL:
      message = "Missing index column " + keyColumn
      return message, serviceD

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
         recordCount += 1
         lev_dtm      = ''
      
         for column in columnL:
   
            try:
               indexValue      = valuesL[ namesL.index(column) ]
               recordD[column] = indexValue
               if column == 'lev_rmk_tx':
                  recordD[column] = indexValue.replace('"', '\\"')
            except ValueError:
               message  = "Parsing issue for column %s " % column
               message += "Unable to parse %s" % Line
               serviceD = {}
               return message, serviceD

         if 'lev_dtm' in columnL:
            lev_dtm       = recordD['lev_dtm']
            lev_tz_cd     = recordD['lev_tz_cd']

            screen_logger.info(lev_dtm)
            screen_logger.info(len(lev_dtm))
    
            if len(lev_dtm) < 1:
               continue
    
            # Partial date YYYY
            #
            elif len(lev_dtm) <= 4:
               tempDate = datetime.datetime.strptime(lev_dtm, '%Y')
               wlDate   = tempDate.replace(month=7,day=16,hour=12)
    
            # Partial date YYYY-MM | MM-YYYY
            #
            elif len(lev_dtm) <= 7:

               if re.search('^(\d{4})-', lev_dtm):
                  tempDate = datetime.datetime.strptime(lev_dtm, '%Y-%m')
                  
               elif re.search('^(\d{2})-', lev_dtm):
                  tempDate = datetime.datetime.strptime(lev_dtm, '%m-%Y')

               wlDate   = tempDate.replace(day=16,hour=12)
               if wlDate.month == 2:
                   wlDate = tempDate.replace(day=15,hour=12)
    
            # Full date YYYY-MM-DD | MM-DD-YYYY
            #
            elif len(lev_dtm) <= 10:

               if re.search('^(\d{4})-', lev_dtm):
                  tempDate = datetime.datetime.strptime(lev_dtm, '%Y-%m-%d')
                  
               elif re.search('^(\d{2})-', lev_dtm):
                  tempDate = datetime.datetime.strptime(lev_dtm, '%m-%d-%Y')
               
               wlDate   = tempDate.replace(hour=12)
    
            # Full date YYYY-MM-DD HH:MM | MM-DD-YYYY HH:MM
            #
            elif len(lev_dtm) <= 16:

               if re.search('^(\d{4})-', lev_dtm):
                  if re.search('(\d{2}:\d{2})', lev_dtm):
                     wlDate = datetime.datetime.strptime(lev_dtm, '%Y-%m-%d %H:%M')
                  else:
                     wlDate = datetime.datetime.strptime(lev_dtm, '%Y-%m-%d %H%M')
                  
               elif re.search('^(\d{2})-', lev_dtm):
                  if re.search('(\d{2}:\d{2})', lev_dtm):
                     wlDate = datetime.datetime.strptime(lev_dtm, '%m-%d-%Y %H:%M')
                  else:
                     wlDate = datetime.datetime.strptime(lev_dtm, '%m-%d-%Y %H%M')
    
            # Full date YYYY-MM-DD HH:MM:SS | MM-DD-YYYY HH:MM:SS
            #
            else:
               lev_dtm = lev_dtm[:-3].strip()

               if re.search('^(\d{4})-', lev_dtm):
                  if re.search('(\d{2}:\d{2})', lev_dtm):
                     wlDate = datetime.datetime.strptime(lev_dtm, '%Y-%m-%d %H:%M')
                  else:
                     wlDate = datetime.datetime.strptime(lev_dtm, '%Y-%m-%d %H%M')
                  
               elif re.search('^(\d{2})-', lev_dtm):
                  if re.search('(\d{2}:\d{2})', lev_dtm):
                     wlDate = datetime.datetime.strptime(lev_dtm, '%m-%d-%Y %H:%M')
                  else:
                     wlDate = datetime.datetime.strptime(lev_dtm, '%m-%d-%Y %H%M')
               
            screen_logger.info(wlDate.strftime("%Y-%m-%d %H:%M:%S"))
            lev_dtm = wlDate.strftime("%Y-%m-%d %H:%M:%S")
            
            screen_logger.info(lev_dtm)
            screen_logger.info('\n')
            
            recordD['lev_dtm'] = lev_dtm
            recordD['wlDate']  = lev_dtm

         serviceL.append(recordD)

      # Check for site records
      #
      else:
         if len(serviceL) > 0:

            serviceL = sorted(serviceL, key=lambda x: x['wlDate'])
            break
    
   message = "Processed %d record" % len(serviceL)
   screen_logger.info(message)

   #sys.exit()

   return message, serviceL

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
            print "Content-type:application/json\n\n"
            print '{ "message": "%s" }' % message
            sys.exit()
      
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
         
         else:
            print "Content-type:application/json\n\n"
            print '{ "message": "%s" }' % message
            sys.exit()
   
   return codesD

# =============================================================================

def processCollectionFile (keyColumn, keySite, columnL, linesL):

   siteInfoD   = {}
   siteCount   = 0

   keyList     = []
   
   # Check for OWRD well log ID
   #
   #pattern = '^([a-z]{4})\s*(\d{1,7})$'
   if re.search('^([a-z]{4})\s*(\d{1,7})$', keySite, re.I):
      countyAbbrev = keySite[:4]
      wellNumber   = keySite[4:]
      keyList.append("%s%6d" % (countyAbbrev, int(wellNumber)))
      keyList.append("%s%7d" % (countyAbbrev, int(wellNumber)))
      keyList.append("%s%07d" % (countyAbbrev, int(wellNumber)))
      keyList.append("%s%06d" % (countyAbbrev, int(wellNumber)))
      
   else:
      keyList.append("%s" % keySite)

   screen_logger.info("Key %s" % "\t".join(keyList))
   
   # Parse head lines
   #
   while len(linesL) > 0:
      if len(linesL) < 1:
         del linesL[0]
      elif linesL[0][0] == '#':
         del linesL[0]
      else:
         namesL = linesL[0].lower().split('\t')
         del linesL[0]
         break

   # Format line in header section
   #
   del linesL[0]

   # Check column names
   #
   if keyColumn not in namesL:
      message = "Missing index column " + keyColumn
      return message, {}

   # Parse data lines
   #
   while len(linesL) > 0:

      Line = linesL[0].strip("\n|\r")
      del linesL[0]

      # Skip comment line
      #
      if len(Line) < 1:
         continue
      if Line[0] == '#':
         continue

      valuesL = Line.split('\t')

      tmpSite = str(valuesL[ namesL.index(keyColumn) ])

      # Check for site records
      #
      if tmpSite in keyList:
    
          valuesL = Line.split('\t')
       
          for column in columnL:
    
             try:
                indexValue        = valuesL[ namesL.index(column) ]
                siteInfoD[column] = indexValue
             except ValueError:
                message  = "Parsing issue for column %s " % column
                message += "Unable to parse %s" % Line
                return message, siteInfoD
          
          siteCount     += 1
    
   message = "Processed %d sites" % siteCount
   screen_logger.info(message)
   
   return message, siteInfoD

# =============================================================================

# ----------------------------------------------------------------------
# -- Main program
# ----------------------------------------------------------------------
keyColumn        = None
keySite          = None
parmsDict        = {}
siteInfoD        = {}
message          = ''
   
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

HardWired = None
#HardWired = 1

# Set input
#
if HardWired is not None:
    params           = {}
    params['site_no'] = '430734118561201'
    params['site_no'] = '414236121584601'
    params['site_no'] = '413804121581501'
    params['site_id'] = 'KLAM 2288'
    params['site_id'] = '419363N1213388W001'
    params['site_id'] = '420126121360201'
    params['site_id'] = '421139121544801'
    params['site_id'] = '423622121401001'
    params['site_id'] = '415104121232901'
    params['site_id'] = '430837121472801'
    params['site_id'] = '423245121405001'
    params['project'] = 'default'
    
    screen_logger.info("Site %s Project %s" % (params['site_id'], params['project']))

# Check site_no
#
if 'site_id' in params:
   if HardWired is None:
      keySite      = params.getvalue('site_id')
   else:
      keySite      = params['site_id']
   keyColumn = 'site_id'

elif 'site_no' in params:
   if HardWired is None:
      keySite      = params.getvalue('site_no')
   else:
      keySite      = params['site_no']
   keyColumn = 'site_no'

# Check coop_site_no
#
elif 'coop_site_no' in params:
   if HardWired is None:
      keySite      = params.getvalue('coop_site_no')
   else:
      keySite      = params['coop_site_no']
   keyColumn = 'coop_site_no'

# Check cdwr_id
#
elif 'cdwr_id' in params:
   if HardWired is None:
      keySite      = params.getvalue('cdwr_id')
   else:
      keySite      = params['cdwr_id']
   keyColumn = 'cdwr_id'
   
else:
   message = "Require a NWIS site nmber or OWRD well log ID or CDWR well number"
   print "Content-type:application/json\n\n"
   print '{ "message": "%s" }' % message
   sys.exit()
    
# Check project path to data files
#
if 'project' in params:
   if HardWired is None:
      pathName   = params.getvalue('project')
      projectDir = project_config.project_config[pathName]
   else:
      pathName   = params['project']
      projectDir = project_config.project_config[pathName]

      
# Set project directory
#
collection_file  = "/".join([projectDir, "collection.txt"])
waterlevel_file  = "/".join([projectDir, "waterlevels.txt"])

screen_logger.info("Site %s Project %s" % (keySite, projectDir))
screen_logger.info("Collection file %s Waterlevel file %s" % (collection_file, waterlevel_file))

# Read
#
if os.path.exists(collection_file):
   
   # Parse entire file
   #
   with open(collection_file,'r') as f:
       linesL = f.read().splitlines()

   # Check for empty file
   #
   if len(linesL) < 1:
      message = "Empty collection file %s" % collection_file
      print("Content-type:application/json\n\n")
      print('{ "message": "%s" }' % message)
      sys.exit( 1 )

   # Process file
   #
   message, siteInfoD = processCollectionFile(keyColumn, keySite, mySiteFields, linesL)
   
else:
   message = "Require the path to the file with the list of sites"
   print "Content-type:application/json\n\n"
   print '{ "message": "%s" }' % message
   sys.exit()

# Read
#
if os.path.exists(waterlevel_file):
   
   # Parse entire file
   #
   with open(waterlevel_file,'r') as f:
       linesL = f.read().splitlines()

   # Check for empty file
   #
   if len(linesL) < 1:
      message = "Empty waterlevel file %s" % waterlevel_file
      print("Content-type:application/json\n\n")
      print('{ "message": "%s" }' % message)
      sys.exit( 1 )

   # Process file
   #
   message, siteInfoL = processWls(keyColumn, keySite, myGwFields, linesL)
   
else:
   message = "Require the URL path to the file with the list of OWRD sites"
   print "Content-type:application/json\n\n"
   print '{ "message": "%s" }' % message
   sys.exit()
   
# Obtain codes and explanations
# -------------------------------------------------
codesD = processCodes()

# Prepare JSON output
# -------------------------------------------------
#
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
print "Content-type:application/json\n\n"
print '\n'.join(jsonL)


sys.exit()

