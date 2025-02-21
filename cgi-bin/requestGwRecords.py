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

import csv

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
version         = "2.10"
version_date    = "February 20, 2025"

program_args    = []

# =============================================================================
def errorMessage(error_message):

   print("Content-type:application/json\n\n")
   print('{ "message": "%s" }' % message)
   sys.exit()

# =============================================================================
def processCollectionSites (file, keyColumn, keySite):

   siteInfoD = []

   keyList   = keySite.upper().split()

   screen_logger.info("\nprocessCollectionSites")
   screen_logger.info("Key %s" % "\t".join(keyList))
   screen_logger.info("Key Column %s" % keyColumn)
   
   # Read collection file
   # -------------------------------------------------
   #
   try:
       with open(file, "r") as fh:
           csv_reader = csv.DictReader(filter(lambda row: row[0]!='#', fh), delimiter='\t')

           # Loop through file
           #
           for tempD in csv_reader:

                # Check for sites with no valid location
                #
                if tempD[keyColumn].upper() in keyList:

                    # Set empty value to None
                    #
                    for key, value in tempD.items():
                        if len(value) < 1:
                            tempD[key] = None
                            
                    siteInfoD.append(tempD)

   except FileNotFoundError:
       message = 'File %s not found' % file
       errorMessage(message)
   except PermissionError:
       message = 'No permission to access file %s' % file
       errorMessage(message)
   except Exception as e:
       message = 'An error occurred: %s' % e
       errorMessage(message)
    
   message = "Processed site %s" % keySite
   screen_logger.info(message)
   
   return siteInfoD
# =============================================================================
def processWls (file, keyColumn, keySite):

   serviceL    = []

   keyList     = keySite.split()

   screen_logger.info("\nprocessWls")
   screen_logger.info("Key %s" % "\t".join(keyList))
   screen_logger.info("Key Column %s" % keyColumn)
   
   # Read waterlevel file
   # -------------------------------------------------
   #
   try:
       with open(file, "r") as fh:
           csv_reader = csv.DictReader(filter(lambda row: row[0]!='#', fh), delimiter='\t')

           # Loop through file
           #
           for tempD in csv_reader:

                # Check for sites with no valid location
                #
                if tempD[keyColumn].upper() in keyList:
                    #screen_logger.info('keyColumn %s' % tempD[keyColumn])
                    # Set empty value to None
                    #
                    for key, value in tempD.items():
                        if len(value) < 1:
                            tempD[key] = None

                    serviceL.append(tempD)

                # Check for site records
                #
                else:
                    if len(serviceL) > 0:

                        serviceL = sorted(serviceL, key=lambda x: x['lev_dtm'])
                        break

   except FileNotFoundError:
       message = 'File %s not found' % file
       errorMessage(message)
   except PermissionError:
       message = 'No permission to access file %s' % file
       errorMessage(message)
   except Exception as e:
       message = 'An error occurred: %s' % e
       errorMessage(message)
    
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
   
      file = codeFiles[code]
   
      if code not in codesD:
         codesD[code] = {}
      
      if os.path.exists(file):

          # Open file
          #
          try:
              with open(file, "r") as fh:
                  csv_reader = csv.DictReader(filter(lambda row: row[0]!='#', fh), delimiter='\t')

                  # Loop through file
                  #
                  for tempD in csv_reader:

                      codeColumn = str(tempD['Code'])
                      codeValue  = str(tempD['Description'])

                      codesD[code][codeColumn] = codeValue

          except FileNotFoundError:
              message = 'File %s not found' % file
              errorMessage(message)
          except PermissionError:
              message = 'No permission to access file %s' % file
              errorMessage(message)
          except Exception as e:
              message = 'An error occurred: %s' % e
              errorMessage(message)
   
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

   
# Obtain codes and explanations
# -------------------------------------------------
codesD = processCodes()

   
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
   siteInfoD = processCollectionSites(collection_file, keyColumn, keySite)
   
else:
   message = "Require the path to the collection file with the list of sites"
   errorMessage(message)

# Read
#
if os.path.exists(waterlevel_file):

   # Process file
   #
   siteInfoL = processWls(waterlevel_file, keyColumn, keySite)
   
else:
   message = "Require the path to the waterlevel file with the list of measurements"
   errorMessage(message)


# Prepare JSON output
# -------------------------------------------------
#
message = "Outputting %d waterlevel measurements for site" % len(siteInfoD)
screen_logger.info(message)

jsonD = { "siteinfo" : siteInfoD,
          "waterlevels" : siteInfoL,
          "codes" : codesD
          }
          

# Output json
# -------------------------------------------------
#
print("Content-type:application/json\n\n")
print('%s' % json.dumps(jsonD))


sys.exit()











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
