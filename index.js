'use strict';
const createRouter = require('@arangodb/foxx/router');
// const sessionsMiddleware = require('@arangodb/foxx/sessions');
// const sessions = sessionsMiddleware({
//   storage: module.context.collection('sessions'),
//   transport: 'cookie'
// });

//   // First enable the middleware for this service
// module.context.use(sessions);
// /////////
// 'use strict';
// const createAuth = require('@arangodb/foxx/auth');

// /////////////
// module.exports = createAuth();
// Now mount the routers that use the session
const router = createRouter();
module.context.use(router);

const arangodb = require('@arangodb');
const db = arangodb.db;

const fs = require('fs');
const Handlebars = require("handlebars");

// router.get('/loggedin', function (req, res) {
//     res.send(`Hello ${req.session.uid || 'anonymous'}!`);
//   }, 'hello');
  
// router.post('/login', function (req, res) {
//     req.session.uid = req.body;
//     req.sessionStorage.save(req.session);
//     res.redirect(req.reverse('hello'));
//   })
//   .body(['text/plain'], 'Username');



///Check both full collection name and the module context prefixed collection name before returning 404.
function prefixModuleContext(collectionName, res){
    if(db._collection(collectionName) != null){
        return db._collection(collectionName)
    }else if(db._collection(module.context.collectionName(collectionName)) != null){
        return db._collection(module.context.collectionName(collectionName));
    }else{
        res.throw(404, `There is no [${collectionName}] collection in the database. Try connecting to [/collections] to retrieve a list of all available connections.`);
    }
}

///retrieve and decode from base 64 an image stored in the "Images" collection.
router.get('/img/:filename', function(req, res){
    var collection = db._collection(module.context.collectionName("Images"));
    var filename = req.param("filename");
    var imageDoc = collection.document(filename);
    var buffer64 = new Buffer(imageDoc.data, 'base64');
    var extension = filename.split('.').pop();
    var mimeType = 'image/' + extension;
    if(extension == 'svg'){
        mimeType = 'image/svg+xml';
    }
    res.attachment(filename);
    res.set('content-type', mimeType);
    res.set('content-length', buffer64.length);
    res.send(buffer64);
    }
)  
.summary('Returns base 64 encoded image data stored in the Images collection.')
.description("Note : Storing non-JSON-data in ArangoDB is strongly discouraged! Looks for an image (preferably svg) in the 'Image' collection and sends the data as a file.");


///retrieve handlebars templates from the collection "XYZ_handlebarsTemplates" and return one complete JS string.
function combineHandlebarsCompiledTemplates(exampleJSON){
    var helpers = "";        //insert helpers here
    var templates = " ";
    var templatesCollection = db._collection(module.context.collectionName("handlebarsTemplates"));
    templatesCollection.load();
    var tc;
    if(exampleJSON == null){
        tc = templatesCollection.all();
    }else{
        tc = templatesCollection.byExample(exampleJSON);
    }
     
    while(tc.hasNext()) {
        var templateObject = tc.next();
        templates += `templates['${templateObject._key}'] = template(${templateObject.compiled});`;
        if(typeof templateObject.helpers == "string"){
            helpers += templateObject.helpers;
        }
    }

    var template = `(function() { 
                         ${helpers} 
                         var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
                         ${templates}
                         })();`;
 
    return template;
}



router.get('/templates.js', function(req, res){
    var template = combineHandlebarsCompiledTemplates({"client": true});
    res.attachment("templates.js")
    .send(template);
})
.response(['application/javascript'], '')
.summary('Combines the precompiled files from the database and sends them as a single "templates.js" to the client.')
.description("Provides the javascript file with precompiled handlebars templates.");


function nonSystemCollection(c){
    return !c.properties().isSystem;
}

function getCollections(FilterFunc){
    var jsontable = {"table":
    {
    "attributes": "class=\"w3-table w3-striped w3-card w3-responsive w3-hoverable\"",
    "thead": ["Name", "Count", "DocSize"],
    "tbody": []
    }
    };
    var row = [];
    var collections =db._collections().filter(FilterFunc);
    for(var i = 0; i < collections.length; i++){
        row = [];
        row[0] = collections[i].name();
        row[1] = collections[i].count();
        row[2] = collections[i].figures().documentsSize;
        row[3] = (collections[i].type()==3)?"edge":(collections[i].type()==2)?"document":"unknown";
        row[4] = `<a href='collections/${collections[i].name()}'?skip=0&limit=5>${collections[i].name()}</a>`;
        jsontable.table.tbody.push(row);
    }
    return jsontable;
}

router.get('/collections', function(req, res){
    var list = {"allcollections": db._collections().filter(nonSystemCollection).map(c => c.name())};
    res
    .set('content-type', 'application/json')
    .send(list);
})  
.summary('List all collections')
.description("Lists all collections in the database (includes system collections)");

router.get('/collectionsTable', function(req, res){
    var jsontable = getCollections(nonSystemCollection);
    res
    .set('content-type', 'application/json')
    .send(jsontable);
})  
.summary('List all collections as a table')
.description("Lists all collections in the database (includes system collections)");


router.get('/collections/:collection', function(req, res){
    var collectionName = req.param("collection");
    var skip = req.param("skip")||0;
    var limit = req.param("limit")||5;
    var collection = prefixModuleContext(collectionName, res).all().skip(skip).limit(limit);
    res.set('content-type', 'application/json')
    .send(collection.toArray());
    }
)
.summary('Lists a collection')
.description("Lists a collection limiting the result length with SKIP and LIMIT parameters ");

function getCollectionAsTable(collectionName, skip, limit, res){
    var jsontable = {"table":
    {
        "attributes": "class=\"w3-table w3-striped w3-responsive w3-hoverable\"",
        "thead": [],
        "tbody": []
    }
    };

    var collection = prefixModuleContext(collectionName, res).all().skip(skip).limit(limit);
    collection = collection.toArray();
    var somestr = "";
    for(var doc in collection){
        var row = [];
        var theDocument = collection[doc];
        //somestr += "doc :" +JSON.stringify(collection[doc]);
        for(var att in theDocument){
            var colid = jsontable.table.thead.indexOf(att);
            if(colid == -1){
                colid = jsontable.table.thead.length;
                jsontable.table.thead.push(att);
            }
            somestr += " docatt :" + theDocument[att];
            if(typeof theDocument[att] == 'object'){
                row[colid] = "click to expand";
            }
            else{
                row[colid] = theDocument[att];
            }
        }
        jsontable.table.tbody.push(row);
    }
    return jsontable;
}

router.get('/colTable/:collection', function(req, res){
    var skip = req.param("skip")||0;
    var limit = req.param("limit")||5;
    var collectionName = req.param("collection");
    var jsontable = getCollectionAsTable(collectionName,skip,limit, res);
    res.send(jsontable);
    }
)
.summary('Lists a collection')
.description("Lists a collection as a table");


///Runs an AQL query converting the first three layers of any document into a markdown text.
function getCollectionAsMarkdown(collectionName){
    if(db._collection(collectionName)==null){
        collectionName = module.context.collectionName(collectionName);
    } else if(db._collection(collectionName)==null){
        res.throw(404, `There is no such collection in the database ${collectionName}. Try connecting to [/collections] to retrieve a list of all available connections.`);
    }
    var markdown = db._query(
        `LET attributesPerDocument = (
            FOR doc IN @@collection 
                FOR att IN ATTRIBUTES(doc, true)
                    RETURN []<doc[att]?
                                        {}<doc[att]?
                                                    CONCAT("\n# ", att,"\n",CONCAT_SEPARATOR("\n##",ATTRIBUTES(doc[att])))
                                                    :CONCAT("\n# ", att,"\n",CONCAT_SEPARATOR("\n* ",doc[att]))
                                        :CONCAT("\n# ", att, "\n", doc[att], "\n")
        )
        return CONCAT_SEPARATOR("\n", attributesPerDocument)`,
            {"@collection":collectionName})
    return markdown.next(); //only ever expect one result;
}

router.get('/colMarkdown/:collection', function(req, res){
    var collectionName = req.param("collection"); 
    res.set('content-type', 'text/plain')
    .send(getCollectionAsMarkdown(collectionName)); 
    }
)
.summary('Shows the full collection as a markdown document')
.description("A markdown renderer converts the markdown into HTML on the client side.")


router.get('/docHandle/:collection/:documentKey', function(req, res){
    var collectionName = req.param("collection");
    var documentKey = req.param("documentKey");
    var document = prefixModuleContext(collectionName, res).document(documentKey);
    res.send(document);
})
.error(404, 'Document not found.')
.response(['application/json'], '')
.summary('Returns any JSON as specified by the document handle(collection, documentKey).')
.description("Returns the full JSON of any document");



function tracePath(path){
    var p = path.split(".");
    console.log(p[0]);
    var doc = db._document(p[0]);
    for(var i = 1; i< p.length; i++){
        doc = doc[p[i]];
    }
    return doc;
}
router.get('/:htmltemplate', function(req, res){
    
    var htmltemplateName = req.param("htmltemplate");
    var htmlTemplateDoc = prefixModuleContext('fullPageTemplates', res).document(htmltemplateName);
    
    var mainTemplateJSON = {head: "", menu: "", body: "", footer: ""};

    var sections = htmlTemplateDoc; 
    
    eval(combineHandlebarsCompiledTemplates()); //Loading handlebars templates for the server
    
    for(var section in mainTemplateJSON){
        var sectionData = [];
        if(req.queryParams[section]!=undefined){
            sectionData.push(tracePath(req.queryParams[section]));
        }else if(sections[section]!=null){
            for(var subsection in sections[section].data){               
                sectionData.push(tracePath(sections[section].data[subsection])); //return linked document
            }
        }
        if(sectionData.length == 1){
            mainTemplateJSON[section] = Handlebars.templates[sections[section].template](sectionData[0]);
        }else if(sectionData.length > 1){
            mainTemplateJSON[section] = Handlebars.templates[sections[section].template](sectionData);
        }
    }
    
    var result = `<html>
                <head>${mainTemplateJSON.head}</head>
                <body>
                ${mainTemplateJSON.menu}${mainTemplateJSON.body}${mainTemplateJSON.footer}
                </body></html>`
    res.send(result);
})
.error(404, 'Document not found.')
.response(['text/html'], '')
.summary('Prepopulates the main page.')
.description("Returns a full HTML document with header, body and footer sections.");


///////////////////admin////////////////////


router.get('/compileHandlebarsTemplate', function(req, res){
    var templatesCollection = db._collection(module.context.collectionName("handlebarsTemplates"));
    templatesCollection.load();
    var tc = templatesCollection.all();
    while(tc.hasNext()) {
        var template = tc.next();
        template["compiled"] = Handlebars.precompile(template.raw);
        templatesCollection.update(template._key, template);
    }
    res.send("all handlebars collections have been compiled")
}
)
.response(['text/plain'], 'No useful data returned. Todo: include the full precompiled javascript file as a response.')
.summary('This call recompiles all templates')
.description("Compiles all templates in the handlebarsTemplates collection");
