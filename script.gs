var dtFrom, dtTo;
var dtFromG, dtToG;
var dtFromMs, dtToMs;
var dtFromMSK, dtToMSK;
var dtFromUTC, dtToUTC;
var dtFromKib, dtToKib;
var dtFromAnem, dtToAnem;
var description;
var currentLocale;
var startDate;
var status;

let row;
let dateTimeFrom, dateTimeTo;

var urls;
var script;

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  menu = ui.createMenu('Инциденты');
      menu.addItem('Анализ инцидента', 'analyzeSideBar').addToUi();
      menu.addItem('Расчет UpTime', 'upTimePanel').addToUi();
      menu.addItem('Инциденты за период', 'getIncedents',).addToUi();
      menu.addItem('Проверка инцидентов', 'checkIncedents').addToUi();
}


function fetchPoints(url,query){

let response=UrlFetchApp.fetch(url+encodeURIComponent(query), {'muteHttpExceptions': true});
response = response.toString();
response=JSON.parse(response);

try{
 response = response.results[0].series[0].values;
}
catch(e){
  response =  new Array();
}
return response;
}

function upTimeCalc2(month,year)
{

 upTimeCalc(12,2020);
  return {uptime:99.99, periods:5, time:'3h 45m'};
}

function upTimeCalc(month,year){

let periodBegin = new Date(year,month-1,1,3);
let periodEnd = new Date(periodBegin);
periodEnd.setMonth(periodEnd.getMonth()+1);
if(periodEnd>new Date()) periodEnd = new Date();


Logger.log(periodBegin,periodEnd);

let resstr='';

resstr+=calc(periodBegin, periodEnd,'1',0.6);
resstr+=calc(periodBegin, periodEnd,'2',0.6);
resstr+=calc(periodBegin, periodEnd,'all',0.6);

resstr+=calc(periodBegin, periodEnd,'1',1);
resstr+=calc(periodBegin, periodEnd,'2',1);
resstr+=calc(periodBegin, periodEnd,'all',1);


return {start:periodBegin.toDateString(), end:periodEnd.toDateString(), text:resstr};
}

function calc(periodBegin, periodEnd, dbName, limit) {

status = "node "+dbName+" limit "+limit;
CacheService.getScriptCache().put('uptime-status',status,5);

try {

//sSpreadsheetApp.getActiveSpreadsheet().toast(status,'Uptime processing');

var url = 'https://influxapi.egamings.com/query?q=';

let db12='"nagios"."autogen"."telia.rtdb.elastic4_fundist_org.api.time.avg"';
let db1='"nagios"."autogen"."telia.rtdb.elastic4_fundist_org.api.time.api.and.apiprod.avg"';
let db2='"nagios"."autogen"."telia.rtdb.elastic4_fundist_org.api.time.apiprod2.fundist.org.avg"';
dbs={'1':db1, '2':db2, 'all':db12};

let db = dbs[dbName];

let zeroLimit=0.1
let durZeroTotal=0;
let cntZeroTotal=0;

let query = 'SELECT time,value FROM '+db+' WHERE time>=\''+periodBegin.toISOString()+'\' AND time<\''+periodEnd.toISOString()+'\' AND value >'+limit;
Logger.log(query);

let allPoints = fetchPoints(url,query);

let start,startTime,begin,beginTime, end, finish, endTime, finishTime;
let dur1,dur2,dur3;
let p=0;
let durTotal=0;
let cntTotal=0;






//---------------------------------------------------


try{

query = "SELECT time,value FROM "+db+" WHERE  time >= '"+periodBegin.toISOString()+"' AND time < '"+periodEnd.toISOString()+"' AND value<"+zeroLimit;

let zeroPoints = fetchPoints(url,query);
//console.log('Zeros',zeroPoints);
p=0;
while(p<zeroPoints.length) {
    start = zeroPoints[p];
    startTime=start[0];
    q = "SELECT time,value FROM "+db+
    " WHERE  time < '"+startTime+"' ORDER BY time DESC LIMIT 1";
    begin = fetchPoints(url,q)[0];
    beginTime=begin[0];
    q = "SELECT time,value FROM "+db+
    " WHERE  time > '"+startTime+"' AND value>"+zeroLimit+" ORDER BY time ASC LIMIT 1";
    end = fetchPoints(url,q)[0];
    endTime=end[0];

    finish=start;
    finishTime=startTime;
    while(p<zeroPoints.length){
        if(zeroPoints[p][0] > endTime){
            break;
        }
        finish = zeroPoints[p];
        finishTime=finish[0];
        p++;
    }
dur1=((Date.parse(startTime) - Date.parse(beginTime)) * (-start[1]+zeroLimit)) / (-start[1]+begin[1]);
//console.log(Date.parse(startTime),Date.parse(beginTime), (start[1]) , (begin[1]));
dur2=((Date.parse(endTime) - Date.parse(finishTime)) * (-finish[1]+zeroLimit)) / (-finish[1]+end[1]);
dur3=(Date.parse(finishTime) - Date.parse(startTime));
//console.log('begin:',beginTime,' start:',startTime,' finish:',finishTime,' end:',endTime);
//console.log(dur1,' + ', dur3,' + ',dur2,' = ', (dur1+dur2+dur3)/1000);
durZeroTotal += (dur1+dur2+dur3);
cntZeroTotal++;
}
}
catch(e){
//console.log('no zero points ',e);
}


//---------------------------------------------------

p=0;

while(p<allPoints.length) {
    start = allPoints[p];
    startTime=start[0];
    q = "SELECT time,value FROM "+db+
    " WHERE  time < '"+startTime+"' ORDER BY time DESC LIMIT 1";
    begin = fetchPoints(url,q)[0];
    beginTime=begin[0];
    q = "SELECT time,value FROM "+db+
    " WHERE  time > '"+startTime+"' AND value<"+limit+" ORDER BY time ASC LIMIT 1";
    end = fetchPoints(url,q)[0];
    endTime=end[0];

    finish=start;
    finishTime=startTime;
    while(p<allPoints.length){
        if(allPoints[p][0] > endTime){
            break;
        }
        finish = allPoints[p];
        finishTime=finish[0];
        p++;
    }


dur1=((Date.parse(startTime) - Date.parse(beginTime)) * (start[1]-limit)) / (start[1]-begin[1]);
//console.log(Date.parse(startTime),Date.parse(beginTime), (start[1]) , (begin[1]));
dur2=((Date.parse(endTime) - Date.parse(finishTime)) * (finish[1]-limit)) / (finish[1]-end[1]);
dur3=(Date.parse(finishTime) - Date.parse(startTime));
//Logger.log('begin:',beginTime,' start:',startTime,' finish:',finishTime,' end:',endTime);
//console.log(dur1,' + ', dur3,' + ',dur2,' = ', (dur1+dur2+dur3)/1000);
durTotal += (dur1+dur2+dur3);
cntTotal++;
}

durTotal+=durZeroTotal;
cntTotal+=cntZeroTotal;


var result = new Date(durTotal);
var uptime = Math.round((1-durTotal/(Date.parse(periodEnd) - Date.parse(periodBegin)))*100000)/1000;
Logger.log(durTotal/1000,cntTotal);
Logger.log(result.getUTCDate()-1,'d ',result.getUTCHours(),'h ',result.getMinutes(),'m ', result.getSeconds(),'s');
Logger.log('uptime:',uptime);




return '<b>node: '+dbName+' limit: '+limit+'</b><br/>'+Math.floor(durTotal/1000)+'('+Math.floor(durZeroTotal/1000)+') '+cntTotal+'('+cntZeroTotal+')'+'<br/>'+
(result.getUTCDate()-1)+'d '+result.getUTCHours()+'h '+result.getMinutes()+'m '+result.getSeconds()+'s <br/>'+'<b>uptime '+uptime+'</b><br/><hr/>';

} catch(e)
{
  return '<b>node: '+dbName+' limit: '+limit+'</b><br/> ERROR:  '+ e.message+'<br/>'+e.stack+'<br/>';
}

}


function upTimePanel(){

description = 'Uptime calculation';

currentLocale = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetLocale().replace("_","-");

/* code = HtmlService.createTemplateFromFile('Uptime').getCode();
description=code;
*/


var html = HtmlService.createTemplateFromFile('Uptime').evaluate();

      html.setTitle('Uptime calc').setWidth(300);

  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .showSidebar(html);


};

function checkIncedents(){

  const sheet = SpreadsheetApp.getActiveSheet()
  row = sheet.getActiveCell().getRow();

  dateTimeFrom = sheet.getRange(row, 2).getValues();
  dateTimeTo = sheet.getRange(row, 3).getValues();

  description = 'Check those incidents!';

  var html = HtmlService.createTemplateFromFile('checkPanel').evaluate();

      html.setTitle('Incidents checker').setWidth(300);

  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .showSidebar(html);
}

function getTimeFromSheet(){
  const sheet = SpreadsheetApp.getActiveSheet()
  const row = sheet.getActiveCell().getRow();
  const state = 'Success!'

  const dateTimeFrom1 = sheet.getRange(row, 2).getValue();
  const dateTimeTo1 = sheet.getRange(row, 3).getValue();
  const host = sheet.getRange(row, 5).getValue();

  const result =`${dateTimeFrom1}, ${dateTimeTo1}, ${host}`
  return result;
}

function getIncedents(){

description = 'Getting all those incedents here!';

var html = HtmlService.createTemplateFromFile('Incidents').evaluate();

      html.setTitle('Incidents').setWidth(300);

  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .showSidebar(html);

}

function getStatus()
{
  status = CacheService.getScriptCache().get('uptime-status');
  if(status == null) status='';
  return status;
}


function writeResultToSheet(month, year, data)
{

  data= JSON.parse(data);

 Logger.log("%d %d %s",month, year, data);

  let spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName("HAtest");

  SpreadsheetApp.setActiveSheet(spreadsheet.getSheetByName("HAtest"));

  i = ((year-2021)*12+month)*4;
  sheet.insertRows(i,4);

  sheet
    .getRange(i-4,1,1,33).copyFormatToRange(sheet.getSheetId(),1,33,i,i);

  sheet
    .getRange(i+1,1,3,33).shiftRowGroupDepth(1);

  sheet.getRange(i,1).setValue("01."+month+"."+year);
  for(n=0;n<data.length;n++)
  {
    for(t=0;t<data[n].length;t++){
    sheet
    .getRange(i,2+n*8+t*4,1,4)
    .setValues([[data[n][t].duration,data[n][t].count,data[n][t].uptime,'=INDIRECT("R[0]C[-1]";FALSE)-INDIRECT("R[-4]C[-1]";FALSE)']]);

    for(l=0;l<data[n][t].top3.length;l++){
    sheet.getRange(i+1+l,2+n*8+t*4,1,1).setValue(data[n][t].top3[l]);
    }
   }
  }
};

const writeIncedents = function (array){
  let spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getActiveSheet();

  try{
    //let sourceRange = sheet.getRange(sheet.getLastRow(),2, array.length, array[0].length)
    let targetRange = sheet.getRange(sheet.getLastRow()+1,2, array.length, array[0].length)

    //targetRange.copyFormatToRange(sheet.getSheetId(), sheet.getLastColumn() + 2, sheet.getLastColumn() + 2 + array.length, sheet.getLastRow() + 1, sheet.getLastRow() + array[0].length + 1);
    targetRange.setValues(array);
  }
  catch(e){  var ui = SpreadsheetApp.getUi();
    Logger.log(e);
  }

}

function analyzeSideBar() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = sheet.getActiveCell();
  var ui = SpreadsheetApp.getUi();

  try{

  var row = sheet.getActiveCell().getRow();

  var delta = 10*60*60*1000;
  var options = {year:'numeric',month:'numeric',day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric'};

  description=sheet.getRange(row, 4).getDisplayValue();
  dtFrom = sheet.getRange(row, 2).getValue().getTime();
  dtTo = sheet.getRange(row, 3).getValue().getTime();

  dtFromG=dtFrom;
  dtToG = dtTo;

  if(dtTo - dtFrom<900000) //10*60*1000
  {
    var centr = (dtTo + dtFrom)/2;
    dtFromG = centr - 450000;
    dtToG = centr + 450000;
  }

  dtFromMSK = new Date(dtFrom).toLocaleString("ru",options);
  dtToMSK = new Date(dtTo).toLocaleString("ru",options);

  //delta = (dtTo-dtFrom)/10;

  delta=0;
  if(dtTo - dtFrom<120000) delta=60000;

  dtFromKib = new Date(dtFrom - delta).toISOString();
  dtToKib = new Date(dtTo + delta).toISOString();

  delta = 30*60*1000;

  dt = new Date(dtFrom-delta);
  dtFromAnem = encodeURI(dt.getUTCFullYear()+'-'+(dt.getUTCMonth()+1)+'-'+dt.getUTCDate()+'+'+dt.getUTCHours()+':'+dt.getUTCMinutes()+':'+dt.getUTCSeconds());

  dt = new Date(dtTo+delta);
  dtToAnem = encodeURI(dt.getUTCFullYear()+'-'+(dt.getUTCMonth()+1)+'-'+dt.getUTCDate()+'+'+dt.getUTCHours()+':'+dt.getUTCMinutes()+':'+dt.getUTCSeconds());

  str="";
  for(c=1;c<=10;c++)
  {
   str = str +" "+sheet.getRange(row,c).getDisplayValue();
  }

  urls = str.match(/(http|https):\/\/[a-z0-9\-\.]+\.[a-z]{2,3}\/\S*/igm);
  if(urls==null) urls=[];
  }
  catch(e)
  {
    description="Ошибка "+e.message;
  }


  var html = HtmlService.createTemplateFromFile('Panel').evaluate();

      html.setTitle('Анализ инцидента '+sheet.getRange(row, 1).getDisplayValue())
      .setWidth(300);

  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .showSidebar(html);

}



