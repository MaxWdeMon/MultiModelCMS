Handlebars.registerHelper('anyJSON', function(jsonobject) { 
  function func(data, parent) {
      var result = "";
      for(var d in data) {
         if(typeof data[d] == 'object') {
            result += '<button onclick="accordionFunction('+d+')" class="w3-button w3-circle w3-left-align">'+d+'</button><button class="w3-btn w3-circle" id="addchild_'+parent+d+'"><i class="fa fa-plus"></i></button>';
            result += '<div style="margin: 10px;" class="w3-card-4 w3-container" id='+d+'>' + func(data[d], d+".") + '</div>';
          }else if(d.substring(0,1) == "_"){
            if(d=="_key"){
            result += '<label><b>Key</b></label><button class="w3-btn w3-circle" id="addchild_'+parent+d+'"><i class="fa fa-plus"></i></button>';
            result += '<input id='+parent+d+' class="w3-input w3-grey" type="text" readonly="readonly" placeholder="';
            result += data[d];
            result += '"></input>';
            }
            result += '<input id='+parent+d+' class="w3-input w3-grey" type="hidden" readonly="readonly" placeholder="';
            result += data[d];
            result += '"></input>';
          }else if(typeof data[d] == 'boolean'){
            result += '<label><b>' + d + '</b></label><button class="w3-btn w3-circle" id="addchild_'+parent+d+'"><i class="fa fa-plus"></i></button>';
            result += '<input  id='+parent+d+' class="w3-check w3-hover-grey" type="checkbox"';
            result += data[d]?'checked="checked"':'';
            result += '></input>';
          }else if(typeof data[d] == 'number'){
            result += '<label><b>' + d + '</b></label><button class="w3-btn w3-circle" id="addchild_'+parent+d+'"><i class="fa fa-plus"></i></button>';
            result += '<input  id='+parent+d+' class="w3-input w3-hover-grey" type="number" placeholder="';
            result += data[d];
            result += '"></input>'
          }else if(typeof data[d] == 'string' && data[d].length>150){
            result += '<label><b>' + d + '</b></label><button class="w3-btn w3-circle" id="addchild_'+parent+d+'"><i class="fa fa-plus"></i></button>';
            result += '<textarea   id='+parent+d+' class="w3-input w3-hover-grey" rows="10">'
            result += data[d];
            result += '</textarea>'
          }else{
            result += '<label><b>' + d + '</b></label><button class="w3-btn w3-circle" id="addchild_'+parent+d+'"><i class="fa fa-plus"></i></button>';
            result += '<input  id='+parent+d+' class="w3-input w3-hover-grey" type="text" placeholder="';
            result += data[d];
            result += '"></input>';
          }
      }
      return result;
  }
return func(jsonobject, "");
});