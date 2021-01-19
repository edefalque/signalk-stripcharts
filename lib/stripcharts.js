"use strict";
// urlParams
//==========
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

/******************************************************************
** get specs script from URL "specs" parameter if any
**/
var specsFileName = "missing_specs.js";

if (urlParams.has("specs")) {
    specsFileName = urlParams.get("specs");
}
else {
    alert("specs parameter missing in URL parameters");
}
// dynamically load stripCharts specs file
var specs = document.createElement('script');
specs.src = "./specs/" + specsFileName + ".js";
console.log("specs file is: " + specs.src);
document.body.append(specs);  // specs declaration appended to body


/*****************************************************************/

function optionsFromUrlParms() { 
    // this function will be invoked after specs load
    // as it must be able to overide options in specs

    /*-------------------------------------------
    ** get useInfluxDB from URL parameter if any,
    ** replace "all" by "sbweio"
    **/

    if (urlParams.has("useInfluxDB")) {
        if (urlParams.get("useInfluxDB") === "true") { options.useInfluxDB = true; }
        else if (urlParams.get("useInfluxDB") === "false") { options.useInfluxDB = false; }
        else { alert("Invalid parameter useInfluxBD; parameter ignored.")}
    }

    /*-----------------------------------------------
    ** get logTypes string from URL parameter if any,
    ** replace "all" by "sbweio"
    **/

    if (urlParams.has("logTypes")) {
        options.logTypes = urlParams.get("logTypes");
    }
    if (options.logTypes == "all") {
        options.logTypes = "sbweio";
    }

    /*------------------------------------------
    ** get timeTolSec from URL parameter if any
    **/
    if (urlParams.has("timeTolSec")) {
        options.timeTolSec = urlParams.get("timeTolSec");
    }
    options.timeTolSec = parseInt(options.timeTolSec);
    if (!Number.isSafeInteger(options.timeTolSec)) {
        options.timeTolSec = 0;
        alert("options.timeTolSec is not a number, \n replaced by '" + options.timeTolSec + "'");
    }

    /*-----------------------------------------
    ** get hotdeckSec from URL parameter if any  // deprecated
    **/
    if (urlParams.has("hotdeckSec")) {
        options.hotdeckSec = urlParams.get("hotdeckSec");
    }
    options.hotdeckSec = parseInt(options.hotdeckSec);
    if (!Number.isSafeInteger(options.hotdeckSec)) {
        options.hotdeckSec = 0;
        alert("options.hotdeckSec is not a number, \n replaced by " + options.hotdeckSec);
    }

    /*-------------------------------------------------------------
    ** get policy and related parameters from URL parameter if any;
    ** if policy not provided, other related parameters are ignored
    **/
    if (urlParams.has("policy")) {
        options.subscribePolicy.policy = urlParams.get("policy");
        if (!["instant", "ideal", "fixed"].includes(options.subscribePolicy.policy)) {
            options.subscribePolicy.policy = "instant";
            alert("invalid options.subscribePolicy.policy, \n replaced by '" + options.subscribePolicy.policy +"'");  
        }
        if (["instant", "ideal"].includes(options.subscribePolicy.policy)) {
            // ==> period ignored
            if (urlParams.has("minPeriod")) {
                options.subscribePolicy.minPeriod = urlParams.get("minPeriod");
            }
            options.subscribePolicy.minPeriod = parseInt(options.subscribePolicy.minPeriod);
            if (!Number.isSafeInteger(options.subscribePolicy.minPeriod)) {
                options.subscribePolicy.minPeriod = 100;
                alert("options.subscribePolicy.minPeriod is not a number \n replaced by " + options.subscribePolicy.minPeriod);       
            }
        else {
            // "fixed"  ==> minPeriod ignored
            if (urlParams.has("period")) {
            options.subscribePolicy.period = urlParams.get("period");
            }
            options.subscribePolicy.period = parseInt(options.subscribePolicy.period);
            if (!Number.isSafeInteger(options.subscribePolicy.period)) {
            options.subscribePolicy.period = 950;
            alert("options.subscribePolicy.period is not a number, \n replaced by " + options.subscribePolicy.period);
            }           
            }
        }
    }
}

/*******************************************************
** get server address from URL parameter if any,
** else use location which page is loaded from
**/
var server = "";
if (urlParams.has("server")) {
    server = urlParams.get("server");
}
else {
    server = window.location.host;
    // alert("server param missing in URL, trying with " + server);
}


var ws = {};   // declare ws (later assigned to websocket)

var connectedDB = null;
var influxRPs = [];
var shortlistSpecified = true;

var modeIsPast = false;  // set to true while displaying influxdb from past origin (T1)
var backFromPast = false;  // set to true in pausePlay()

var minAvgInterval = 60000;
// refreshInterval between load method invocation, set later as MIN(avgInterval * intervalsPerRefresh) across all SC_objects
var refreshInterval = 20000;      // absolute max of 20sec
var refreshDisabled = true;
// Construct SC_objects from stripChartsSpecs, assemble subscriptions
var subscription = {
  context: "vessels.self",
  subscribe: []
  };
var subscribeArray = [];

var subscribePaths = [];  // assembled by stripCharts class constructor invocations, which prevent redundant subscriptions
var SC_names = [];        // assembled by stripCharts; usage: var SC_index = SC_names.indexOf("aChart");
var SC_objects = [];      // indexed as SC_names   (SC stands for stripChart)
var upperChartObj = {};
var lowerChartObj = {};
var noneChartObj = {};

var wsMsg = {};
var wsMsgCount = 0;
var timeOffset = 0;
var skTimeStarted = 0;
var timeDisconnected = 0;
var skConnected = false;
var cliTimeOnHello = 0;
var cliTimeOnMsg = 0;
var elapsedSec = 0;
var skTimeMsg = Date.now();
// NOTE: skTime* means time by reference to time received in version msg
// default = client time
var invTimStmpCnts = {};    //  counters of skipped updates with invalid timeStamps per source
var no_sourceCnt = 0;     //  counter of skipped updates with no $source and no source

// constructing control blocks and stripChart objects (after stripChartsSpecs script is loaded)

specs.onload = function() {        // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    document.getElementsByTagName("title")[0].innerHTML = stripChartsSpecs.name;

    optionsFromUrlParms();  // note: may overide some options in just-loaded specs

    // log final options


    // prepare InfluxDb according to options
    // (from stripcharts_options, then specs, then urlparms)
    
    // load influxRPs from influxDB RPs and CQs
    if (options.useInfluxDB) {
        // make clockBtn blink (until RPs & CQs loaded)
        var blinkInterval = window.setInterval(function(){
            if(clockBtn.style.visibility == 'hidden'){
                clockBtn.style.visibility = 'visible';
            }else{
                clockBtn.style.visibility = 'hidden';
            }           
        }, 300);


        connectedDB = influxLib.influxConnect(options.influxDB.dbName, server.split(":")[0], 8086);
        console.log("database name provided: " + connectedDB._options.database);

        influxLib.influxShowRetPol(connectedDB)      // promise 1
        .then(pol => {                   
                if (!options.influxDB.shortlistedRPs) { 
                    options.influxDB.shortlistedRPs = [];
                    shortlistSpecified = false;
                }
                pol.forEach(pushRP);
                influxLib.influxShowCQ(connectedDB)  // promise 2 (chained)
                .then(CQ => {
                    CQ.forEach(getSamplingFmCQ);
                    pruneRPs();   
                    // sort on sampling_ms ascending
                    influxRPs.sort(function( a,b ) { return a.sampling_ms - b.sampling_ms; });
                    influxRPs.forEach(x =>log("b","influxRPs sorted", x));
                    clearInterval(blinkInterval);
                    clockBtn.style.visibility = 'visible';   // was blinking
                    },
                    error => alert(error + "\n Error accessing influxDB CQs.")
                    );
                },
            error => alert(error + "\n Error accessing influxDB RPs.")
            );

        setTimeout(function() {
                clearInterval(blinkInterval);
                if (influxRPs.length == 0) {
                    let errMsg =
                    "Timeout(20 sec) loading RPs: Influx not reachable or started, or invalid dbname.\n options.useInfluxDB set to false.";
                    console.log(errMsg);
                    alert(errMsg);
                    options.useInfluxDB = false;
                    setInfluxButtons(options.useInfluxDB);
                };               
            },
        20000);

    }

    function pushRP(x) {
        let dur_ms = (x.duration.trim() == "0s") ? Infinity : 1000 * hms2s(x.duration);
        if ( (x.default && !options.influxDB.shortlistedRPs.includes(x.name))   // add default RP
            || !shortlistSpecified
            || options.influxDB.shortlistedRPs.includes(x.name)) {
            influxRPs.push({  name: x.name,
                            default: x.default,
                            sampling_ms: options.influxDB.SK2InfluxResolution_ms, // adjusted later by getSamplingFmCQ()
                            duration_ms: dur_ms
                        });
        }
    }

    function pruneRPs() {
        // remove non-default RPs with no corresponding CQs
        for (let i = 0; i < influxRPs.length; i++) {
            if (influxRPs[i].default || typeof influxRPs[i].CQName === "string") { continue; }
            influxRPs.splice(i,1);
        }
        return;
    }

    function getSamplingFmCQ(x) {
        let RPName = "";
        let CQSampling_ms = 0;
        // get RP name from CQ INTO clause
        const startTag1 = "INTO " + options.influxDB.dbName + '."';  // eg: 'INTO boatdata."1week".'
        const endTag1 = '".';
        RPName = getBetweenTags(x.query, startTag1, endTag1);
        if (RPName === "") return;  // bypass if different db name
    
        // extract samplingDuration from remaining string
        const startTag2 = "GROUP BY time(";    // eg: 'GROUP BY time(10s)'
        const endTag2 = "),";
        CQSampling_ms = 1000* hms2s(getBetweenTags(x.query, startTag2, endTag2));
    
        // Find corresponding RP, add sampling_ms and CQName properties, return
        for (let i = 0; i < influxRPs.length; i++) {
            if (influxRPs[i].name == RPName) {
                influxRPs[i].sampling_ms = CQSampling_ms;
                influxRPs[i].CQName = x.name;
                return;
            }
        }
        
    }

    // intialize y2Ctlx, playIcn, moonIcon
    y2CtlU.style.visibility = "hidden";
    y2CtlL.style.visibility = "hidden";
    playIcn.style.display = "none";
    moonIcon.style.display = "none";

    // set Fill and Clock button according to options.useInfluxDB
    setInfluxButtons(options.useInfluxDB);
    console.log("Options (final values): " + JSON.stringify(options));

    // instantiate chart objects
    for (var v of stripChartsSpecs.stripCharts) {
        log("s","<br>    ***** stripchart specs:<br>", v);
        // Validate each specs
        var errMsg = {
            count: 0,
            consLog: function(m) { console.log(v.stripChartName + ": " + m); this.count++ ; }
        }
        function getDefaultSpecs(axisObj, axis) {   // inherit missing y or y2 specs from StripChartsUnits
            if (!chartUnits[axisObj.unit]) {
                errMsg.consLog(axis + " axis, unknown unit: " + axisObj.unit);
                return;
            }
            let unitObj = chartUnits[axisObj.unit];
            if (!axisObj.label) { axisObj.label = unitObj.label; } 
            if (!axisObj.min) { axisObj.min = unitObj.min; } 
            if (!axisObj.max) { axisObj.max = unitObj.max; } 
            if (!axisObj.tick && unitObj.tick) { axisObj.tick = unitObj.tick; }   // tick object fully inherited by reference
        }

        // ignore skipped and dupplicates
        if (SC_names.includes(v.stripChartName)) { console.log("Dupplicate stripChart name, skipped: " + v.stripChartName); continue; }
        if (v.skip) { console.log("Skipped: " + v.stripChartName); continue; }

        // insert below all validations before invoking constructor
        try {
            if (     isNaN(v.timeWindow)
                ||  isNaN(v.avgInterval)
                || v.timeWindow/v.avgInterval > options.tablesMaxRows ) {
                errMsg.consLog("timeWindow/avgInterval invalid or > options.tablesMaxRows"); 
            }
            if (isNaN(v.avgInterval)) { errMsg.consLog("avgInterval not a number."); }
            if (isNaN(v.timeWindow)) { errMsg.consLog("avgInterval not a number."); }
            if (!v.intervalsPerRefresh) {v.intervalsPerRefresh = 1; }
            if (isNaN(v.intervalsPerRefresh)) { errMsg.consLog("intervalsPerRefresh not a number.");}

            if (!v.x) {
                errMsg.consLog("missing x axis");
            }
            else {
                if (typeof v.x.label != "string") { errMsg.consLog("x.label invalid, set to: 'h/m/s ago'");}
                if (typeof v.x.tickCount != "undefined" && isNaN(v.x.tickCount)) { errMsg.consLog("x.tickCount not a number"); }
            }
            
            if (!v.y) {
                errMsg.consLog("missing y axis");
            }
            else {
                if (typeof v.y.unit != "string") {
                    errMsg.consLog("y.unit not a string");
                    }
                else {
                    getDefaultSpecs(v.y, "y");   // inherit missing specs from StripChartsUnits
                }
                if (typeof v.y.label != "string") { v.y.label = v.y.unit; }
                if (typeof v.y.max == "undefined" || isNaN(v.y.max)) { errMsg.consLog("y.max missing or not a number"); }
                if (typeof v.y.min == "undefined" || isNaN(v.y.min)) { errMsg.consLog("y.min missing or not a number"); }    
                if (typeof v.y.tick != "undefined") {
                    if (v.y.tick.count && isNaN(v.y.tick.count)) { errMsg.consLog("v.y.tick.count not a number"); }
                    if (v.y.tick.format && typeof v.y.tick.format != "function") { errMsg.consLog("y.tick.format not a format"); }
                }
            }
            
            v.paths.forEach(function(pth, xp) {
                if (!pth.axis || pth.axis != "y2") {pth.axis = "y";}    // "y" set as default
                // check pc100 and pc0 (note: both are ignored if y/y2 unit != "Percent")
                if  ( (v.y && v.y.unit == "Percent" && pth.axis == "y") ||
                    (v.y2 && v.y2.unit == "Percent" && pth.axis == "y2") ) {
                        if (!pth.pc100 || isNaN(pth.pc100)) { errMsg.consLog("missing or invalid pc100 for path: " + pth.path); }
                        if (!pth.pc0) { pth.pc0 = 0; }
                        else { if ( isNaN(pth.pc0)) { errMsg.consLog("Invalid pc0 for path: " + pth.path); } }
                }
            })

            if (v.y2) {
                if (typeof v.y2.unit != "string") {
                    errMsg.consLog("y2.unit missing or not a string");
                    }
                else {
                    getDefaultSpecs(v.y2, "y2");   // inherit missing specs from StripChartsUnits            
                    if (typeof v.y2.label != "string") { v.y2.label = v.y2.unit; }
                    if (typeof v.y2.max == "undefined" || isNaN(v.y2.max)) { errMsg.consLog("y2.max missing or not a number"); }
                    if (typeof v.y2.min == "undefined" || isNaN(v.y2.min)) { errMsg.consLog("y2.min missing or not a number"); }    
                    if (typeof v.y2.tick != "undefined" && typeof v.y2.tick != "object") { errMsg.consLog("y2.tick not an object"); }
                    if (typeof v.y2.tick != "undefined") {
                        if (v.y2.tick.count && isNaN(v.y2.tick.count)) { errMsg.consLog("v.y2.tick.count not a number"); }
                        if (v.y2.tick.format && typeof v.y2.tick.format != "function") { errMsg.consLog("y2.tick.format not a format"); }
                    }
                }
            }

            if (errMsg.count > 0) { throw("End checking " + v.stripChartName + " specs: " + errMsg.count + " errors > Skipped."); }
            
        }
        catch(err) {
            alert("" + errMsg.count + " errors in " + v.stripChartName + " specs, skipped; check console.");
            console.log(err);
            continue;
        }
        // construct
        SC_objects.push(new stripChart(v, subscribePaths));
        SC_names.push(v.stripChartName);
        
        // compute min refreshInterval for all charts
        if ( refreshInterval > (v.avgInterval * v.intervalsPerRefresh) ) {   
            refreshInterval = v.avgInterval * v.intervalsPerRefresh;
        }
        
    }

    // construct also a minimal dummy stripChart with stripChart name "none" 
    SC_objects.push(new stripChart({ stripChartName: "none"}, {}));
    SC_names.push("none");
    // give name to "none" chart object
    noneChartObj = SC_objects[SC_names.indexOf("none")];

    for (let x of SC_objects) {
    log("s","x.name()", x.name());     
    }
    // Prepare upperView    <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    // stripChartsSpecs.initialUpperView can be either a ref to a stripChart object or a string
    if (stripChartsSpecs.initialUpperView
        && typeof stripChartsSpecs.initialUpperView === "object"
        && typeof stripChartsSpecs.initialUpperView.stripChartName === "string") {
            stripChartsSpecs.initialUpperView = stripChartsSpecs.initialUpperView.stripChartName;
        }
    // now it should be a string

    if (!SC_names.includes(stripChartsSpecs.initialUpperView)) { stripChartsSpecs.initialUpperView = "none" }

    // populate dropdown lists with SC_names and set default options 

    for (let x of SC_names) {
        let option = document.createElement("option");
        option.value = x;
        option.text = x.replace(/\_/g," ");    // "_" replaced by spaces
        selectU.add(option);
        // set default:
        if (x == stripChartsSpecs.initialUpperView) {
            option.selected = true;
            upperChartObj = SC_objects[SC_names.indexOf(x)];
        }
    }

    selectU.disabled = false;

    // Prepare lowerView    <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    // stripChartsSpecs.initialLowerView can be either a ref to a stripChart object or a string
    if (stripChartsSpecs.initialLowerView
        && typeof stripChartsSpecs.initialLowerView === "object"
        && typeof stripChartsSpecs.initialLowerView.stripChartName === "string") {
            stripChartsSpecs.initialLowerView = stripChartsSpecs.initialLowerView.stripChartName;
        }
    // now it should be a string

    if (stripChartsSpecs.initialLowerView == stripChartsSpecs.initialUpperView) { // cannot be same
        stripChartsSpecs.initialLowerView = "none";
    }

    if (!SC_names.includes(stripChartsSpecs.initialLowerView)) { stripChartsSpecs.initialLowerView = "none" }

    // populate dropdown lists with SC_names and set default options 

    for (let x of SC_names) {
        let option = document.createElement("option");
        option.value = x;
        option.text = x.replace(/\_/g," ");    // "_" replaced by spaces
        selectL.add(option);
        // set default:
        if (x == stripChartsSpecs.initialLowerView) {
            option.selected = true;
            lowerChartObj = SC_objects[SC_names.indexOf(x)];
        }
    }

    selectL.disabled = false;

    document.getElementById("main").removeAttribute("hidden");

    upperChartObj.genChart("upperView");   // associate chart to view and generate  <<<<<<<<<<<<<<<
    lowerChartObj.genChart("lowerView");   // same
    
    // first quick load attempt (actual load subject to conditions in loadView() method))
    setTimeout(function(){ 
                    refreshDisabled = true; // disable refreshment in refreshCharts()
                    upperChartObj.loadView(); 
                    lowerChartObj.loadView();
                    refreshDisabled = false; // enable refreshment in refreshCharts() again
                },
    1000);

    // refreshInterval was set in stripChartsClass invocations
    refreshInterval = refreshInterval - 50;  // just a bit faster than multiple of avgInterval
    if (refreshInterval < 500) { refreshInterval = 500; }   // absolute min
    if (refreshInterval > 10000) { refreshInterval = 10000; }   // absolute max

    // repeat load attempt every refreshInterval, unless paused
    refreshDisabled = false;
    setInterval(function () {refreshCharts();}, refreshInterval);   //  <<<<<< REFRESH <<<<<<<<<

    // trigger pushPoint, and buildNewRow() if SK Server silent for more than minAvgInterval
    setInterval(function () {
        if (wsMsgCount == 0 || ws.readyState == ws.CLOSED) { return; } // wait after hello msg
        let skT = Date.now() - timeOffset;
        if (skT - skTimeMsg < minAvgInterval - 50) { return; } // no need
        for (var x of SC_objects) {
            x.pushPoint({path_:"dummy", skTime: skT });
        }
    }, minAvgInterval - 50);

// =====================================================================
// ========   websocket on signalK: get and process delta's  ===========

ws = new WebSocket((window.location.protocol === 'https:' ? 'wss' : 'ws') + "://" + server + "/signalk/v1/stream?subscribe=none");


ws.onopen = function() {
        skConnected = true;
        log("w","webSocket ws opened on: ", ws.url);
        log("b","subscribePaths", subscribePaths);
        subscribePaths.forEach(populateSubscription);
        log("b","subscription", subscription);
        ws.send(JSON.stringify(subscription));
        // enable hangUp icon
        hangUpButton.disabled = false;
        return;
    }
ws.onerror = function(event) {
		log("e","web socket error, code", event.code);
        alert("web socket error, code: " + event.code);
        }
ws.onclose = function(event) {
        // next 2 lines needed for influxdb querying
        skTimeStarted = (skTimeStarted == 0) ? Date.now() : skTimeStarted;  
        timeDisconnected = (timeDisconnected == 0) ? Date.now() : timeDisconnected;
        skConnected = false;
		log("e","webSocket ws closed, code: ", event.code);
        console.log("SK delta invalid timeStamps, counts per source: " + JSON.stringify(invTimStmpCnts));
        console.log("SK delta with no_source: " + no_sourceCnt);
		console.log("webSocket ws closed, code: " + event.code);
        }

window.addEventListener("beforeunload", function(event) { 
        // prompt confirmation before closing window
        // will prompt only if user interaction has occured! (at least in Chrome)
        event.returnValue = "";   // this line required! (at least in Chrome)
        return;
      }
);
window.addEventListener("onunload", function(event) {
        ws.close();
        return;
      }
);

// listen to signalK's deltas


ws.onmessage = function(event) {
        wsMsgCount++;
        cliTimeOnMsg = Date.now();
        if (cliTimeOnHello == 0) { cliTimeOnHello = cliTimeOnMsg; }
        elapsedSec = (cliTimeOnMsg - cliTimeOnHello) / 1000;
        wsMsg = JSON.parse(event.data);
        // Hello msg
        if ("version" in wsMsg  && "roles" in wsMsg) {
            console.log("Hello msg @ "  + elapsedSec + " elapsedSec: " + JSON.stringify(wsMsg));
            log("w","#####wsMsg @ " + elapsedSec + " elapsedSec <br> ", wsMsg);
            if ("timestamp" in wsMsg) {
                skTimeStarted = Date.parse(wsMsg.timestamp);  // constant
                timeOffset = cliTimeOnMsg - skTimeStarted;  // constant
            }
            return;
        }
        if (skTimeStarted == 0) {    // should not happen !!
            alert("No time received from SK, using client time");
            skTimeStarted = cliTimeOnMsg;
            timeOffset = cliTimeOnMsg - skTimeStarted;  // constant, near 0
        }
        skTimeMsg = cliTimeOnMsg - timeOffset;
        // if (wsMsgCount < 100) {
            log("w","#####wsMsg @ " + elapsedSec + " elapsedSec <br> ", wsMsg);
        // }
        // stop test on demo server:
        if (((skTimeMsg - skTimeStarted) > (options.maxRunMinutes * 60000)) && server == "demo.signalk.org") {   
            console.log("Close socket on options.maxRunMinutes = " + options.maxRunMinutes);
            ws.close();
            return;
            }
        
        genPointsFromDeltas(wsMsg.updates);
        return;
}

function populateSubscription(x, ix) {
        let pathSubscr = {path: x};
        Object.assign(pathSubscr, options.subscribePolicy);
        subscription.subscribe.push(pathSubscr);
        return;
      }

function genPointsFromDeltas(updArray) {
    // extract boat data from msg; for each path, pushPoint to all stripCharts object instances (each will ignore unused paths)
    let point = {path_:"", $source_:"", skTime:0, value:0};
    for (var upd of updArray) {
        if (!("values" in upd)) {  // e.g. element with meta array instead of values array
            console.log("No values array in delta, skipped: " + JSON.stringify(wsMsg) );
            break;
        }
        // time tolerance check
        if (options.timeTolSec != 0) { 
            let timeDiff = Math.abs(skTimeMsg - Date.parse(upd.timestamp));
            if (timeDiff > options.timeTolSec*1000) {  
                invTimStmp(upd);  
                break;      // skip out-of-tolerance timestamp
            }
        }
        // Other messages:
        if (!("$source" in upd)) {
            // if no $source, use source.label if present  (this case not encountered nor tested so far)
            if ( "source" in upd && "label" in upd.source) {
                point.$source_ = upd.source.label.replace(/\W/g,'_');
                // \W matches everything that is not in A-Za-z0-9_
            }
            else {          // should not happen
                point.$source_ = "no_source";
                no_source();
            }
        }
        else {
            point.$source_ = upd.$source.replace(/\W/g,'_');
        }

        // get path and value from wsMSG.updates
        for (var delta of upd.values) {
            point.skTime = skTimeMsg;
            point.path_ = delta.path.replace(/\./g,"_");  // replace all "." with "_" in path giving path_
            point.value = delta.value;
            if (wsMsgCount < 20) {log("o","point", point)};
            // point.skUnit will be set in pushPoint()
            for (var x of SC_objects) {
                x.pushPoint(point);           // pushPoint   <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
            }
        }
    }
    
    function invTimStmp(upd) {    // count them by source and log a few of them
        let src;
        if (typeof upd.source === "object") { src = JSON.stringify(upd.source); }
        else { src = "NO SOURCE"}
        if (typeof invTimStmpCnts[src] === "number") {
            invTimStmpCnts[src]++;
            if (invTimStmpCnts[src] <= 20) {
                console.log("Invalid time stamp in delta, skipped: " +  JSON.stringify(wsMsg));
            }
        }
        else { invTimStmpCnts[src] = 1; }
        return;
    }
    function no_source() {    // count them and log a few of them
            no_sourceCnt++;
            if (no_sourceCnt <= 20) {
                console.log("No source, $source set to 'no_source': " +  JSON.stringify(wsMsg));
            }
        return;
    }

    return;
}
    
} // end of specs.onload   <<<<<<<<<<<<<<<<<<<<<<<<<<<<<

/* GLOBAL FUNCTIONS
** ****************
*/
// Return a substring delimited by 2 tags (only first occurence considered)
function getBetweenTags(str, startTag, endTag) {
    let ix = str.indexOf(startTag);
    if ( ix == -1) return "";  // bypass if db name not found
    str = str.substring(ix + startTag.length, str.length);
    ix = str.indexOf(endTag);
    return str.substring(0,ix).trim();  // result is trimmed
  }

  // convert ...h...m...s string to seconds (these are valid strings: 48h120m2s, 1h3600s, 20m0s)
  // if "0s", return Infinity  (because RP duration "0s" means infinite duration)
  function hms2s(str) {
      let h, m, s, ix;
      ix = str.indexOf("h");
      h = (ix == -1)? 0: Number(str.substring(0,ix));
      str = str.substring(ix + 1, str.length);
      if (str.length == 0) { return h*3600; }
      ix = str.indexOf("m");
      m = (ix == -1)? 0: Number(str.substring(0,ix));  // idem
      str = str.substring(ix + 1, str.length);
      if (str.length == 0) { return h*3600+m*60; }
      ix = str.indexOf("s");
      s = (ix == -1)? 0: Number(str.substring(0,ix));  // idem
      return h*3600+m*60+s;
  }

// Used as inheritance mechanism in the chartSpecs (instead of __proto__)
// inheritance of properties is shallow (first level of properties)
function derivedFrom(modelChart, derivedChart) {
    if (!derivedChart.paths) {
        // clone model paths (as paths might be modified in stripchart_class)
        derivedChart.paths = [];
        modelChart.paths.forEach(assignPath, derivedChart.paths);
        // note: 2d arg is this in invoked function
    }
    return Object.assign({}, modelChart, derivedChart);

    function assignPath(modelPath) {
         this.push(Object.assign({}, modelPath));
    }
}

// set Fill and Clock buttons according to options.useInfluxDB
function setInfluxButtons(useIfx) {
    yFillU.style.display = (useIfx) ? "inline" : "none";
    yFillL.style.display = (useIfx) ? "inline" : "none";
    clockBtn.style.display = (useIfx) ? "inline" : "none";
    pausePlayBtn.style.border = (useIfx) ? "2px solid #ff0000" : "none";
    return;
}

var logAreaDiv = document.getElementById('logArea');
var logCount = 0;
function log(types,intro, arg) {
    // log if any character in types appears in options.logTypes
    // types "": log irrespective of options.logTypes
    let logWanted = false;
    switch(types.length) {
        case 0:
            logWanted = true;
          break;
        case 1:
            logWanted = (options.logTypes.search(types) == -1) ? false : true;
          break;
        default:
            types.split("").forEach(function(type, charIx) {
                logWanted = (options.logTypes.search(type) == -1) ? logWanted : true;
            });
      }
      if (!logWanted || logCount++ > options.logMax) { return; }
      let str = "";
      if (typeof arg === "undefined") {
        str = "undefined";
        }
      else {
        if (typeof arg === "object") { str = JSON.stringify(arg); }
            else { str = arg }
        }
        logAreaDiv.innerHTML += "<br>" + intro + ": " + str;
    }

function refreshCharts() {
    if (document.visibilityState == "hidden") { return; }
    if (modeIsPast || viewPaused || refreshDisabled  ) { return; }
    if (!skConnected
        && upperChartObj._rowCountSinceRefresh == 0 
        && lowerChartObj._rowCountSinceRefresh == 0
        ) { return; }
    upperChartObj.loadView();
    lowerChartObj.loadView();
}

// also refresh on visibility change:
function handleVisibilityChange() {refreshCharts();}
document.addEventListener("visibilitychange", handleVisibilityChange, false);

// change stripChart selection on upper view
var oldUpperSize = 0;

function genUpper(selectedSC) {
    if (selectedSC == upperChartObj.name()) { return; }  // nothing to do
    refreshDisabled = true;      // disable refreshment in refreshCharts()
    oldUpperSize = upperChartObj.size();
    upperChartObj.destrChart();
    if (selectedSC == lowerChartObj.name()) {
        // if selected same as other chart
        lowerChartObj.destrChart();
        noneChartObj.setButtons("lowerView");  // will hide y/y2 buttons
        lowerChartObj = noneChartObj;
    }  
    upperChartObj = SC_objects[SC_names.indexOf(selectedSC)];  // set new current

    if (modeIsPast) {
        upperChartObj.getPastData(pickedDateMsec);
        upperChartObj.genPastChart("upperView");
    } else {
        upperChartObj.genChart("upperView");
        refreshDisabled = false;     // enable refreshment in refreshCharts() again
    }
    if (upperChartObj.size() != oldUpperSize) { lowerChartObj.resizeChart(getChartHeight()); }
      
}


// change stripChart selection on lower view
var oldLowerSize = 0;
function genLower(selectedSC) {
    if (selectedSC == lowerChartObj.name()) { return; }  // nothing to do
    refreshDisabled = true;      // disable refreshment in refreshCharts()
    oldLowerSize = lowerChartObj.size();
    lowerChartObj.destrChart();
    if (selectedSC == upperChartObj.name()) {
        // if selected same as other chart
        upperChartObj.destrChart();
        noneChartObj.setButtons("upperView");  // will hide y/y2 buttons
        upperChartObj = noneChartObj;
    }  
    lowerChartObj = SC_objects[SC_names.indexOf(selectedSC)];  // set new current

    if (modeIsPast) {
        lowerChartObj.getPastData(pickedDateMsec);
        lowerChartObj.genPastChart("lowerView");
    } else {
        lowerChartObj.genChart("lowerView");
        refreshDisabled = false;     // enable refreshment in refreshCharts() again
    }

    if (lowerChartObj.size() != oldLowerSize) { upperChartObj.resizeChart(getChartHeight()); }
    
}

function zoomIn(chart, yORy2) {
    refreshDisabled = true;      // disable refreshment in refreshCharts()
    chart.zoom(yORy2, options.zoomFactor);
    refreshDisabled = false;     // enable refreshment in refreshCharts() again
}

function zoomOut(chart, yORy2) {
    refreshDisabled = true;      
    chart.zoom(yORy2, 1/options.zoomFactor);
    refreshDisabled = false;     
}
function center(chart, yORy2) {
    refreshDisabled = true;      
    chart.center(yORy2);
    refreshDisabled = false;     
}
function reset(chart, yORy2) {
    refreshDisabled = true;      
    chart.reset(yORy2);
    refreshDisabled = false;     
}
function up(chart, yORy2) {
    refreshDisabled = true;      
    chart.upDown(yORy2, +1);  // +1 means UP
    refreshDisabled = false;     
}
function down(chart, yORy2) {
    refreshDisabled = true;      
    chart.upDown(yORy2, -1);  // -1 means Down
    refreshDisabled = false;     
}
function fillFmInflux(chartObj) {
    refreshDisabled = true;      
    if  (influxRPs.length == 0) {
        alert("Not connected to influxDB (yet).");
        return;
    }  
    chartObj.fillFmInflux(connectedDB, skTimeStarted);   // msec
    refreshDisabled = false;     // enable refreshment in refreshCharts() again
}


// simplePicker declaration
//
var pickedDate = null;
var pickedDateMsec = 0;
var skNow = new Date(Date.now() - timeOffset);

const calPicker = new SimplePicker();
calPicker.on('close', function(){
    skNow = new Date(Date.now() - timeOffset);
    calPicker.reset(new Date(skNow));
    calPicker.open();      
});
calPicker.on('submit', function(aDate, readableDate){
    if (aDate > skNow) {
        aDate = skNow;
        alert("Picked date/time too large, set to current SK time.");
    }
    pickedDate = aDate;
    pickedDateMsec = pickedDate.getTime();    
    if (influxRPs.length > 0) {
        upperChartObj.getPastData(pickedDateMsec);
        lowerChartObj.getPastData(pickedDateMsec);
    } else {
        alert("Not connected to influxDB (yet).");
    }
});

function clearAllPastRows() {
    for (let x of SC_objects) {
        if (x.name() != "none") { x._pastRows = []; }
    }
    return;
}

function flushWaitingRows() {
    // flush after clicking "Play", or returning fm past mode
     if ( SC_names.length > 0) {   // just to make sure
        refreshDisabled = true;
        upperChartObj.loadView();
        lowerChartObj.loadView();
        refreshDisabled = false;
    }
}

// resize charts on body resize event    
// Note: only heigth change handled here as width change is managed by c3.js
var currentWinHeight = window.innerHeight;
function resizeWin() {
    if (currentWinHeight == window.innerHeight || SC_names.length == 0) {return;}
    if (upperChartObj.name() != "none" ) {
        upperChartObj.resizeChart(getChartHeight());
    }
    if (lowerChartObj.name() != "none" ) {
        lowerChartObj.resizeChart(getChartHeight());
    }
    currentWinHeight = window.innerHeight;
}

function getChartHeight() {    // returns available height for one chart (returns 0 if no charts)
    var avalaibleHeigth = window.innerHeight-60;   // 60 is total height of the 2 bars
    var oneOrTwo = 2;
    if (upperChartObj.name() == "none" ) { oneOrTwo--; }
    if (lowerChartObj.name() == "none" ) { oneOrTwo--; }
    if (oneOrTwo != 0) {       
        return Math.floor(avalaibleHeigth / oneOrTwo);
    } else {
        return 0;
    }
  }
