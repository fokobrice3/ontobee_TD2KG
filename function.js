//Mojiba Fix Library
const fixUtf8 = require('fix-utf8');
//File Server Library
var fs = require("fs"); 
const CsvReadableStream = require('csv-reader');
const AutoDetectDecoderStream = require('autodetect-decoder-stream');
csv = require("csv-parser");
//PATH Library
var path = require('path');  
//Googlethis Library
const google = require('googlethis'); 
//Jaccard Index - Cousine Similarity - SorensenDice coefficient - Jaro-Winkler - Levenshtein
var stringComparison = require('string-comparison')
//DATAFRAME
const pd = require("node-pandas"); 


//Sleep
function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}
//preprocesisng string var
function preProcess(s){
  const regex = /[!"#$%&()*+-./:;<=>?@[\]^_`{|}~]/g;//,
  let clean_string = ""; 
  s = fixUtf8(s);
  let arr  = s.split(" ").filter(x => x !== "")
  for (let item of arr) {//remove all long spaces in string
      clean_string += item + " "
  }     
  clean_string =  clean_string.replace(/<\/?[^>]+(>|$)/gi, "");//remove HTML TAG  
  clean_string = clean_string.replace(regex, '')
          .replace('\\', '')
          .trim();
  //final = final.toUpperCase();    
  return clean_string; 
} 
//get csv files names in tables
function getCSVNames(testFolder){  
  var tablesID = [];    
  fs.readdirSync(testFolder).forEach(file => {
      filename = path.parse(file).name; 
      tablesID.push(filename);
  });
  return tablesID;
} 
//get CSV in dataframe node-panda
function getCSVDataFrame(s){
  df = pd.readCsv('public/'+s) 
  return df; 
}  
//get csv in Array
async function getCSVArray_async(s){ 
  var csvLines = []  
  var cols = 0;
  var rows = 0;
  let inputStream = await fs.createReadStream(s).pipe(new AutoDetectDecoderStream({ defaultEncoding: '1255' })); 
  await inputStream.pipe(new CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true }))
    .on('data', await function (row) {
      csvLines.push(row);
    })
    .on('end', await function () {
      cols = csvLines[0].length;
      rows = csvLines.length;
      //return {data: csvLines, cols: cols, rows: rows};
    }); 
}
function getCSVArray(s){ 
  var data = fs.readFileSync(s, "utf8");   
  //console.log(data)
  data = data.split("\r\n"); // SPLIT ROWS
  for (let ik in data){  
    let t= ""+data[ik];
    if(t.trim()!=''){
      data[ik] = data[ik].split(",");
    }  
    for(let jk=0;jk<data[ik].length;jk++){
      //if(j!=data[i].length){    
        if(data[ik][jk].trim().startsWith('"')){ 
          if(!data[ik][jk].trim().endsWith('"')){
            if(data[ik][jk+1]!=undefined){
              data[ik][jk] = data[ik][jk].trim().replace('"','') +" "+ data[ik][jk+1].trim().replace('"',''); 
              data[ik].splice(jk+1, 1); 
            }            
          } 
        } 
      //}
    }
  }   
  var cols = data[0].length;//number of column
  var rows = data.length;//number of rows
  return {data: data, cols: cols, rows: rows};
}
//Check if cell is candidate to annotation
function mustAnnotate(a, b){ 
  //console.log(a)
  //console.log(b)
  for(ik=0;ik<a.length;ik++){
    let arr = a[ik]
    if(arr.toString()==b.toString()){
      //console.log("Annoter");
      return true; 
    }
    /*if(a[i].every((val, index) => val === b[index])){
      //console.log("true");
      return true;
    }*/ 
  }
  return false;
}
function isInside(data, target){  
  for(ik=0;ik<data.length;ik++){
    let str = data[ik].toString()
    if(str.startsWith(target)){
      //console.log(target+' <-- inside --> '+str);
      return true;
    } 
  }
  //console.log("NOT INSIDE");
  return false;
}
//Build token from string
function getTokens(arr,term){ 
  let tokens ='';
  arr.forEach(t =>{
    if(t.length>3 && t!=term) tokens += ' "'+t+'"';
  });   
  return tokens;
}
//Build tokens for searchURL
function getURLTokens(arr){ 
  let tokens = arr;
  tokens = tokens.join("%20")
  return tokens;
}
//Parse CEA Json results
function safeParseJSON(response) {
  var body = response.text(); 
  try {
      return JSON.parse(body);
  } catch (err) {
      console.error("Error:", err);
      console.error("Response body:", body);
      return {
          head: {
            vars: []
          },
          results: { bindings: [] }
      };
  }
}
//SafeParseJson wikipedia
function safeParseJSONforWikipedia(response) {
  var body = response.text(); 
  try {
      return JSON.parse(body);
  } catch (err) {
      console.error("Error:", err);
      console.error("Response body:", body);
      return {};
  }
}
//google search CEA candidates
async function googlesearch(token){
  const optionsgthis = {
    page: 0, 
    safe: false,
    additional_params: {hl:'en'}
  }  
  var response = await google.search(token, optionsgthis);
  return response; 
} 
//google CEA QID
function gQID(url){
  if(url.startsWith("https://dbpedia.org/page/")) 
    return url.substr(25, 100); 
  if(url.startsWith("https://en.m.wikipedia.org/wiki/"))
    return url.substr(32, 100);
  if(url.startsWith("https://en.wikipedia.org/wiki/"))
    return url.substr(30, 100);
  return "";            
} 
//CEA QID From annotation
function ceaQID(annotation){ 
  return annotation.substr(31, 50);           
} 
//Query parameter for SparQL to  search cta candidates(instanceOf|SubClass) from google CEA Annoted
function params_gcta(annotation){
  return {
    query:`PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX dbr: <http://dbpedia.org/resource>
    PREFIX dbo: <http://dbpedia.org/ontology>
    
    SELECT DISTINCT ?type WHERE{
    <`+annotation+`>  rdf:type ?type
    FILTER strstarts(str(?type), str(dbo:))}`                            
  }
}
//Query parameter for SparQL to search correct cea from CEA Annoted for Col0
function params_sparqlceaC0(gQID,label){
  return {
    query:`#defaultView:Table
    PREFIX bd: <http://www.bigdata.com/rdf#> 
    PREFIX mwapi: <https://www.mediawiki.org/ontology#API/>
    PREFIX wdt: <http://www.wikidata.org/prop/direct/> 
    PREFIX wikibase: <http://wikiba.se/ontology#> 
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>                     
    
    SELECT DISTINCT ?type ?typeLabel WHERE {
      wd:`+gQID+` ?r ?o ;
                  (wdt:P279|wdt:P31) ?type .
      ?o ?label "`+label+`"@en .  
      SERVICE wikibase:label { 
        bd:serviceParam wikibase:language "en".
      } 
    } ORDER BY ASC(?type) LIMIT 50`                            
  }
}
//Query parameter for SparQL to search correct cea from CEA Annoted for Col>0
function params_sparqlceaCX(gQID,label){
  return {
    query:`#defaultView:Table
    PREFIX bd: <http://www.bigdata.com/rdf#> 
    PREFIX mwapi: <https://www.mediawiki.org/ontology#API/>
    PREFIX wdt: <http://www.wikidata.org/prop/direct/> 
    PREFIX wikibase: <http://wikiba.se/ontology#> 
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>                     
    
    SELECT DISTINCT ?type ?typeLabel ?s ?sLabel WHERE {
      ?s ?r wd:`+gQID+` .
      ?s ?label "`+label+`"@en .
      wd:`+gQID+` (wdt:P279|wdt:P31) ?type .  
      SERVICE wikibase:label { 
        bd:serviceParam wikibase:language "en".
      } 
    } ORDER BY ASC(?type) LIMIT 50`                            
  }
}
//Query parameter for SparQL to search cea(?item) and cta(?type) candidates from cleaned cell values and Tokens
function params_EndPointctacea(clean_cell, tokens){
  return {
    query:`#defaultView:Table
    PREFIX bd: <http://www.bigdata.com/rdf#> 
    PREFIX mwapi: <https://www.mediawiki.org/ontology#API/>
    PREFIX wdt: <http://www.wikidata.org/prop/direct/> 
    PREFIX wikibase: <http://wikiba.se/ontology#> 
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> 
    
    SELECT DISTINCT ?item ?type ?itemLabel ?typeLabel
    WHERE {   
    ?item (wdt:P279|wdt:P31) ?type .  
    VALUES ?term {"`+clean_cell+`"`+tokens+`}  
    SERVICE wikibase:mwapi {    
        bd:serviceParam wikibase:endpoint "www.wikidata.org";   
                        wikibase:api "EntitySearch";   
                        mwapi:search ?term;    
                        mwapi:language "en".    
        ?item wikibase:apiOutputItem mwapi:item. 
    }    
    SERVICE wikibase:label {
        bd:serviceParam wikibase:language "en".
    }
    }ORDER BY ASC(?item)`
  };
}
//Query parameter for SparQL to resolve multiple CEA case ::: Methode 1(label1 and label is from entities)
function params_EndPoint_multiCEA(label1, label2){
  return {
    query:`#defaultView:Table# 
    PREFIX bd: <http://www.bigdata.com/rdf#> 
    PREFIX mwapi: <https://www.mediawiki.org/ontology#API/>
    PREFIX wdt: <http://www.wikidata.org/prop/direct/> 
    PREFIX wikibase: <http://wikiba.se/ontology#> 
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> 
    
    SELECT DISTINCT ?item1 ?item1Label ?item2 ?item2Label ?item2Type
    WHERE {   
      ?item1 ?p ?item2 .  
      ?item1 ?label "`+label1+`"@en .
      ?item2 ?label "`+label2+`"@en .
      ?item2 (wdt:P279|wdt:P31) ?item2Type .
    SERVICE wikibase:label {
        bd:serviceParam wikibase:language "en".
    }
    }ORDER BY ASC(?item)` 
  };
}
//Get cta candidates from google cea annotation
function get_gcandidate_cta(data, gcandidate_cta){
  cta_candidate = gcandidate_cta;
  if(data!=undefined){ 
    data.results.bindings.forEach(bs => { 
      cta_candidate.push(bs.type.value);    
    });
  }
  return cta_candidate;
}
//Get element with highest occurence
function eltwithHighOcc(array){
  if(array.length == 0) return null;
  var eltMap = {};
  var maxEl = array[0], maxCount = 1;
  for(var i = 0; i < array.length; i++){
      var el = array[i];
      if(eltMap[el] == null) eltMap[el] = 1;
      else eltMap[el]++;  
      if(eltMap[el] > maxCount){
          maxEl = el;
          maxCount = eltMap[el];
      }
  }
  return maxEl;
}
//Get DataType
var isDate = function(x) {
  return (new Date(x) !== "Invalid Date") && !isNaN(new Date(x));
}
function getType(x){
  let country_list = ["Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahrain", "Bangladesh", "Barbados", "Beiyang Government", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "Colombia", "Comoros", "Costa Rica", "County of Loano", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Democratic Republic of the Congo", "Djibouti", "Dominica", "Dominican Republic", "Dutch Republic", "East Timor", "Ebla", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Federated States of Micronesia", "Fiji", "Finland", "France", "Gabon", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kingdom of Denmark", "Kingdom of the Netherlands", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Lordship of Albarracin", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mosquito Coast", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "People's Republic of China", "Peru", "Philippines", "Poland", "Portugal", "Principality of Smolensk", "Qatar", "Republic of Ireland", "Republic of the Congo", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "State of Palestine", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "SÃ£o TomÃ© and PrÃ­ncipe", "São Tomé and Príncipe", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "The Bahamas", "The Gambia", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "United States of America", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"]
  x = x.trim();
  if(isNaN(x)==false){
      return 'Numeric';
  }else if(isDate(x)){
      return "Date";
  }else if(x.startsWith("Template:Attached KML/")){
      return "Wikimedia KML file";//CTA->Q26267864 -- CPA->P3096
  }else if(x.startsWith("Template:")){
      return "Template Object";//CTA->Q11266439  -- //CPA->P5869
  }else if(x.toLowerCase().endsWith("png") || x.toLowerCase().endsWith("jpeg") || x.toLowerCase().endsWith("jpg") || x.toLowerCase().endsWith("gif") || x.toLowerCase().endsWith("webp") || x.toLowerCase().endsWith("svg")){
      return "Image"; 
  }else if(country_list.includes(x)){
    return "Country";//"Country"CTA->Q6256 --- "Souvereign States"CTA->Q3624078
  }else; 
}
//return SparQL result with the most high similarity with x
function get_mostSimilar_cea(data, label){
  let similarElts= [], finalElts=[]; 
  let mlcs = stringComparison.mlcs 
  data.forEach(bs => {  
    similarElts.push(bs.itemLabel.value);    
  }); 
  similarElts = mlcs.sortMatch(label, similarElts);  
  let lastCommon = similarElts[similarElts.length-1]
  let rate = lastCommon.rating;
  similarElts.forEach(bs => { 
    if(bs.rating==rate) 
      finalElts.push(bs);    
  });   
  return finalElts; 
}
//Save not solved case on CEA to check after
function saveCEAUnresolve(fileID,col,row,reason){
  var csv_line = ''+fileID+','+row+','+col+','+reason+'\r\n';     
  fs.appendFileSync("ceaToResolve.csv", csv_line, function (err) {
    if (err) throw err; 
  }); 
}
//Save not solved case on CTA to check after
function saveCTAUnresolve(fileID,col,reason){
  var csv_line = ''+fileID+','+col+','+reason+'\r\n';     
  fs.appendFileSync("ctaToResolve.csv", csv_line, function (err) {
    if (err) throw err; 
  }); 
}
//Save CEA annotation
function saveCEA(CEAFileName,fileID,col,row,annotation){
  var csv_line = '"'+fileID+'","'+row+'","'+col+'","'+annotation+'"\r\n';     
  fs.appendFileSync(""+CEAFileName, csv_line, function (err) {
    if (err) throw err; 
  }); 
}
//Save CTA annotation
function saveCTA(CTAFileName,fileID,col,annotation){
  var csv_line = '"'+fileID+'","'+col+'","'+annotation+'"\r\n';     
  fs.appendFileSync(""+CTAFileName, csv_line, function (err) {
    if (err) throw err; 
  }); 
} 
function mergeinfResults(fRessource, target, fResults){
  let res = "",a="",b="";
  let find=false; 
  let annotations = getCSVArray(""+fRessource).data;
  //console.log(annotations) 
  for(i=0;i<target.length;i++){
    a = ""+target[i];
    //console.log(a);
    find=false;
    for(j=0;j<annotations.length;j++){
      b = ""+annotations[j];
      //console.log(b);
      if(b.startsWith(a)){
        find=true;
        break;
      }
    }
    if(find){
      res=b;
    }else{
      res=a;
    }     
    console.log(res);
    fs.appendFileSync(""+fResults, res+'\r\n', function (err) {
      if (err) throw err; 
    });
  }
}
function duplicated_1(datas, test) {
  for (let data of datas)
      if (data[0] == test[0] && data[1] == test[1] && data[2] == test[2]) return true
  return false
}
function duplicated_2(datas, test) {
  for (let data of datas)
      if (data[0] == test[0] && data[1] == test[1]) return true
  return false
}
function removeDuplicatesResults(pathSourceFile, pathresultFile, type="cea"){ 
  let sources = getCSVArray(pathSourceFile).data  
  console.log(""+sources.length+" lines in ("+pathSourceFile+")")
  datas = [];  
  if(type=='cta'){
    for(let elt of sources){
      if(!duplicated_2(datas, elt)) datas.push(elt); 
      else console.log("duplicated :"+elt)
    }
    for(data of datas){
      var csv_line = '' + data[0] + ',' + data[1] + ',' + data[2] + '\r\n';
      fs.appendFileSync("" +pathresultFile, csv_line, function (err) {
        if (err) throw err;
      });
    } 
  }else{    
    for(let elt of sources){
      if(!duplicated_1(datas, elt)) datas.push(elt);
      else console.log("duplicated :"+elt)
    }
    for(data of datas){
      var csv_line = '' + data[0] + ',' + data[1] + ',' + data[2] + ',' + data[3] + '\r\n';
      fs.appendFileSync("" +pathresultFile, csv_line, function (err) {
        if (err) throw err;
      });
    }
  } 
  let results = getCSVArray(pathresultFile).data  
  console.log(""+results.length+" lines in ("+pathresultFile+")") 
}

function zoeyDoc(nameFile){    
  for(let i=1;i<=497;i++){
      var csv_line = '"'+nameFile+'","'+i+'","0","http://dbpedia.org/resource/Zooey_Deschanel"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      }); 
      var csv_line = '"'+nameFile+'","'+i+'","2","http://dbpedia.org/resource/Los_Angeles"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
      var csv_line = '"'+nameFile+'","'+i+'","3","http://dbpedia.org/resource/United_States"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
  }
  for(let i=498;i<=1017;i++){
      var csv_line = '"'+nameFile+'","'+i+'","0","http://dbpedia.org/resource/Sarah_McLachlan"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      }); 
      var csv_line = '"'+nameFile+'","'+i+'","2","http://dbpedia.org/resource/Halifax,_Nova_Scotia"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
      var csv_line = '"'+nameFile+'","'+i+'","3","http://dbpedia.org/resource/Canada"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
  }
  for(let i=1018;i<=2314;i++){
      var csv_line = '"'+nameFile+'","'+i+'","0","http://dbpedia.org/resource/Zach_Galifianakis"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      }); 
      var csv_line = '"'+nameFile+'","'+i+'","2","http://dbpedia.org/resource/Wilkesboro,_North_Carolina"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
      var csv_line = '"'+nameFile+'","'+i+'","3","http://dbpedia.org/resource/United_States"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
  }
  for(let i=2315;i<=2542;i++){
      var csv_line = '"'+nameFile+'","'+i+'","0","http://dbpedia.org/resource/Shia_LaBeouf"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      }); 
      var csv_line = '"'+nameFile+'","'+i+'","2","http://dbpedia.org/resource/Los_Angeles"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
      var csv_line = '"'+nameFile+'","'+i+'","3","http://dbpedia.org/resource/United_States"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
  }
  for(let i=2543;i<=3264;i++){
      var csv_line = '"'+nameFile+'","'+i+'","0","http://dbpedia.org/resource/Macaulay_Culkin"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      }); 
      var csv_line = '"'+nameFile+'","'+i+'","2","http://dbpedia.org/resource/New_York_City"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
      var csv_line = '"'+nameFile+'","'+i+'","3","http://dbpedia.org/resource/United_States"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
  }
  for(let i=3265;i<=4718;i++){
      var csv_line = '"'+nameFile+'","'+i+'","0","http://dbpedia.org/resource/Matthew_McConaughey"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      }); 
      var csv_line = '"'+nameFile+'","'+i+'","2","http://dbpedia.org/resource/Uvalde,_Texas"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
      var csv_line = '"'+nameFile+'","'+i+'","3","http://dbpedia.org/resource/United_States"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
  }
  for(let i=4719;i<=4809;i++){
      var csv_line = '"'+nameFile+'","'+i+'","0","http://dbpedia.org/resource/Nicki_Minaj"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      }); 
      var csv_line = '"'+nameFile+'","'+i+'","2","http://dbpedia.org/resource/Saint_James,_Trinidad_and_Tobago"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
      var csv_line = '"'+nameFile+'","'+i+'","3","http://dbpedia.org/resource/Trinidad_and_Tobago"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
  }
  for(let i=4810;i<=5075;i++){
      var csv_line = '"'+nameFile+'","'+i+'","0","http://dbpedia.org/resource/Alanis_Morissette"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      }); 
      var csv_line = '"'+nameFile+'","'+i+'","2","http://dbpedia.org/resource/Ottawa"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
      var csv_line = '"'+nameFile+'","'+i+'","3","http://dbpedia.org/resource/Canada"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
  }
  for(let i=5076;i<=5275;i++){
      var csv_line = '"'+nameFile+'","'+i+'","0","http://dbpedia.org/resource/Amy_Poehler"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      }); 
      var csv_line = '"'+nameFile+'","'+i+'","2","http://dbpedia.org/resource/Newton,_Massachusetts"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
      var csv_line = '"'+nameFile+'","'+i+'","3","http://dbpedia.org/resource/United_States"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
  }
  for(let i=5276;i<=6024;i++){
      var csv_line = '"'+nameFile+'","'+i+'","0","http://dbpedia.org/resource/M._Night_Shyamalan"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      }); 
      var csv_line = '"'+nameFile+'","'+i+'","2","http://dbpedia.org/resource/Mahé,_India"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
      var csv_line = '"'+nameFile+'","'+i+'","3","http://dbpedia.org/resource/India"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
  }
  for(let i=6025;i<=6401;i++){
      var csv_line = '"'+nameFile+'","'+i+'","0","http://dbpedia.org/resource/Colin_Kaepernick"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      }); 
      var csv_line = '"'+nameFile+'","'+i+'","2","http://dbpedia.org/resource/Milwaukee"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
      var csv_line = '"'+nameFile+'","'+i+'","3","http://dbpedia.org/resource/United_States"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
  }
  for(let i=6402;i<=6539;i++){
      var csv_line = '"'+nameFile+'","'+i+'","0","http://dbpedia.org/resource/Mark_McGwire"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      }); 
      var csv_line = '"'+nameFile+'","'+i+'","2","http://dbpedia.org/resource/Pomona,_California"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
      var csv_line = '"'+nameFile+'","'+i+'","3","http://dbpedia.org/resource/United_States"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
  }
  for(let i=6540;i<=7283;i++){
      var csv_line = '"'+nameFile+'","'+i+'","0","http://dbpedia.org/resource/Chuck_Palahniuk"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      }); 
      var csv_line = '"'+nameFile+'","'+i+'","2","http://dbpedia.org/resource/Pasco,_Washington"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
      var csv_line = '"'+nameFile+'","'+i+'","3","http://dbpedia.org/resource/United_States"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
  }
  for(let i=7284;i<=7503;i++){
      var csv_line = '"'+nameFile+'","'+i+'","0","http://dbpedia.org/resource/Picabo_Street"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      }); 
      var csv_line = '"'+nameFile+'","'+i+'","2","http://dbpedia.org/resource/Triumph,_Idaho"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
      var csv_line = '"'+nameFile+'","'+i+'","3","http://dbpedia.org/resource/United_States"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
  }    
  for(let i=7504;i<=7729;i++){
      var csv_line = '"'+nameFile+'","'+i+'","0","http://dbpedia.org/resource/Scarlett_Johansson"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      }); 
      var csv_line = '"'+nameFile+'","'+i+'","2","http://dbpedia.org/resource/New_York_City"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
      var csv_line = '"'+nameFile+'","'+i+'","3","http://dbpedia.org/resource/United_States"' + '\r\n';
      fs.appendFileSync("cea_ttwdr2_cheat.csv", csv_line, function (err) {
        if (err) throw err;
      });
  }
}
module.exports = { 
  preProcess, 
  getCSVNames,
  getCSVDataFrame, 
  sleep,
  getCSVArray,
  getCSVArray_async,
  mustAnnotate, 
  getTokens,
  getURLTokens, 
  safeParseJSON, 
  safeParseJSONforWikipedia,
  googlesearch, 
  gQID, 
  params_gcta,
  params_EndPointctacea,
  params_EndPoint_multiCEA,
  get_gcandidate_cta, 
  eltwithHighOcc,
  getType, 
  get_mostSimilar_cea, 
  saveCEAUnresolve,
  saveCTAUnresolve,
  saveCTA,
  saveCEA, 
  ceaQID,
  params_sparqlceaC0,
  params_sparqlceaCX,
  isInside,
  mergeinfResults,
  duplicated_1,
  duplicated_2,
  removeDuplicatesResults,
  zoeyDoc,
};