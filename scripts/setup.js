/*jslint indent: 2, nomen: true, maxlen: 100, white: true, plusplus: true, unparam: true */
/*global require, applicationContext*/
'use strict';

////////////////////////////////////////////////////////////////////////////////
/// @brief A Demo Foxx-Application written for ArangoDB
///
/// @file
///
/// DISCLAIMER
///
/// Copyright 2019 Georgij Ludmirskij, Gold Coast, Australia
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///
/// Copyright holder is Georgij Ludmirskij, Gold Coast, Australia
///
/// @author Georgij Ludmirskij
/// @author Copyright 2019, Georgij Ludmirskij, Gold Coast, Australia
////////////////////////////////////////////////////////////////////////////////

const arangodb = require("@arangodb");
const db = arangodb.db;
var _ = require('lodash');
const fs = require("fs");
const Handlebars = require("handlebars");

const setupFolder = fs.join(module.context.basePath, "setup");
const handlebarsTemplateCtxt = module.context.collectionName("handlebarsTemplates");
/**
 * @description Loads all handlebars templates from the setup/handlebars/ subfolder stores documents
 * containing raw and precompiled templates as well as a sample JSON into the handlebarsTemplates collection.
 */
function parseHandlebarsTemplate(path, hbsfile, clientFlag){
  var jsonTemplate = {};
  jsonTemplate["_key"] = _.replace(hbsfile,".handlebars","");
  var hbsFileFullPath = fs.join(path, hbsfile)
  jsonTemplate["raw"] = fs.read(hbsFileFullPath);
  if(fs.isFile(hbsFileFullPath + ".json")) {
      var sampleD = fs.read(hbsFileFullPath + ".json");//JSON.parse(fs.read(hbsFileFullPath + ".json"));
      console.log(sampleD);
      jsonTemplate["sampleData"] = JSON.parse(sampleD);
      console.log(jsonTemplate["sampleData"]);
  }
  jsonTemplate["client"] = clientFlag;
  console.log(`compiling ${hbsfile}`);
  jsonTemplate["compiled"] = Handlebars.precompile(jsonTemplate["raw"]);
  if(fs.isFile(hbsFileFullPath + ".helpers.js")) {
    jsonTemplate["helpers"] = fs.read(hbsFileFullPath + ".helpers.js");
  }
  if(fs.isFile(hbsFileFullPath + ".querypaths.json")) {
    jsonTemplate["queryPaths"] = JSON.parse(fs.read(hbsFileFullPath + ".querypaths.json"));
  }
  return jsonTemplate;
}

function loadHandlebarsTemplates(){
  if (db._collection(handlebarsTemplateCtxt) === null) {
    var collection = db._create(handlebarsTemplateCtxt);
    var jsonTemplates = [];
    ///load clientside templates
    var path = fs.join(setupFolder, "handlebars");
    if(fs.isDirectory(path)){
      var allFiles = fs.list(path);
      console.log(allFiles);
      var handlebarsFiles = _.filter(allFiles, function(o) { return _.endsWith(o,".handlebars")})
      for(var hbsfile of handlebarsFiles){
        var jsonTemplate = parseHandlebarsTemplate(path, hbsfile, true);
        jsonTemplates.push(jsonTemplate); 
      }
    }
    //load serveronly templates
    path = fs.join(path, "serverside");
    if(fs.isDirectory(path)){
      var allFiles = fs.list(path);
      var handlebarsFiles = _.filter(allFiles, function(o) { return _.endsWith(o,".handlebars")})
      for(var hbsfile of handlebarsFiles){
        jsonTemplate = parseHandlebarsTemplate(path, hbsfile, false);
        jsonTemplates.push(jsonTemplate); 
      }
    }
    collection.save(jsonTemplates);
  }
}

function isImageFile(str){
   return (_.endsWith(str,".jpg") || _.endsWith(str,".svg") || _.endsWith(str,".gif"));
}

function loadBackgroundImages(){
  var imagesCtxt = module.context.collectionName("Images");
  if (db._collection(imagesCtxt) === null) {
    var collection = db._create(imagesCtxt);
    var jsonTemplates = [];
    var jsonTemplate = {};
    var path = fs.join(setupFolder, "img");
    if(fs.isDirectory(path)){
      var allFiles = fs.list(path);
      var imageFiles = _.filter(allFiles, isImageFile)
      for(var imageFile of imageFiles){
        jsonTemplate = {};
        jsonTemplate["_key"] = imageFile;
        var imageFullPath = fs.join(path, imageFile);
        jsonTemplate["data"] = fs.read64(imageFullPath);
        jsonTemplates.push(jsonTemplate); 
      }
      collection.save(jsonTemplates);
    }
  }
}

function initialiseCollection(collectionName, values) {
  console.log(`working on ${collectionName}`);
  var collectionNameCtxt = module.context.collectionName(collectionName);
  ///initialise only empty or missing collections
  if (db._collection(collectionNameCtxt) === null) {
    var collection = db._create(collectionNameCtxt);
    collection.save(values);
  }
  else if(db._collection(collectionNameCtxt).count() <= 0){
    var collection = db._collection(collectionNameCtxt);
    collection.save(values);
  }
  else {
    console.log("Collection '%s' already exists with some documents in it. Leaving it untouched.", collectionNameCtxt);
  }
}

function initialiseMainMenuCollection(){
  if(db._collection(handlebarsTemplateCtxt).exists("menu")){
    var menuTemplate = db._collection(handlebarsTemplateCtxt).document("menu");
    if("sampleData" in menuTemplate){
        for(var i of menuTemplate.sampleData){
          initialiseCollection(i._key, {});
          i.collection = module.context.collectionName(i._key);
        }
        initialiseCollection("pageMenus", menuTemplate.sampleData);  
    }
    else{
      console.log("The menu template is available, but it does not contain a 'sampleData' object. Potentially the menu.handlebars.json wasn't loaded properly at startup.");
    }
  }
  else{
    console.log("The menu template is missing in the '%s.' collection", db._collection(handlebarsTemplateCtxt));
  }
}

function initialiseMainFooterCollection(){
  if(db._collection(handlebarsTemplateCtxt).exists("footer")){
    var menuTemplate = db._collection(handlebarsTemplateCtxt).document("footer");
    if("sampleData" in menuTemplate){
      var sampleData = menuTemplate.sampleData;
      sampleData["_key"] = "mainFooters";
      initialiseCollection("Footers", sampleData);
    }
    else{
      console.log("The footer template is available, but it does not contain the 'sampleData' object with a 'toc' attribute in it. Potentially the menu.handlebars.json wasn't loaded properly at startup.");
    }
  }
  else{
    console.log("The footer template is missing in the '%s.' collection", db._collection(handlebarsTemplateCtxt));
  }
}



loadHandlebarsTemplates();
initialiseMainMenuCollection();
//initialiseMenuItems();
initialiseMainFooterCollection();
loadBackgroundImages();
