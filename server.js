var fetch = require('sync-fetch')
var fs = require("fs"); 
var path = require('path');   
var stringComparison = require('string-comparison')
var natural = require('natural');  
var tokenizer = new natural.WordTokenizer();
const my_cf = require('./function.js');  
 
var url_searchEntity_wd = "https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&limit=120&language=en&limit=50&search="; 
var url_getEntity_wd = "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en&props=labels|descriptions|aliases|datatype|claims&ids=";  
var URL_wd = new URL("https://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org");
var URL_wd2 = new URL("https://dbpedia.org/sparql");
 
var dir_tables = 'public/tables/';
var dir_targets = 'public/targets/';
var cta_file = 'cta_ontores.csv';
var cea_file = 'cea_ontores.csv'; 
var cpa_file = 'cea_ontores.csv'; 
var i=0;j=0;k=0; 
var previous_cell = '' 
var tables_Names = my_cf.getCSVNames(dir_tables);
var cea_target = my_cf.getCSVArray(dir_targets+'cea_target.csv'); 
var cta_target = my_cf.getCSVArray(dir_targets+'cta_target.csv');  
var cpa_target = my_cf.getCSVArray(dir_targets+'cpa_target.csv');  

async function main(){
    for(i=0;i<tables_Names.length;i++){   
        let file_arr =  my_cf.getCSVArray(dir_tables+''+tables_Names[i]+'.csv');  
        console.log("File("+i+") : "+tables_Names[i]); 
        let nb_col = file_arr.cols;
        let nb_row = file_arr.rows; 
        await _annotate(file_arr,nb_row,nb_col);  
        //break;
    }
}
async function _annotate(file_arr,nb_row,nb_col){
    let cos = stringComparison.cosine, mlcs = stringComparison.mlcs;
    let params = {}, metadata={}, SparQLdata={};
    for(j=0;j<nb_col;j++){//Cols        
        for(k=1;k<nb_row;k++){//Rows
             
        }
        if(annote_cta){
        } 
   }
}
main();
