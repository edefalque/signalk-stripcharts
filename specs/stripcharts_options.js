"use strict";
var options = {
// any option can be superseded by providing a new value in the charts spec file, e.g.:
//   options.influxDB.name = "myInfluxDB";

/* charts and User Interface options
*************************************/
// Maximum number of rows in the aggregation tables:
// - equals max number of points on a plotted line on any chart
// - equals timeWindow/avgInterval as defined in chart
// if violated, corresponding chart specs skipped with error message.
// recommendation: keep it < 1000, typical value between 200 and 800
tablesMaxRows: 1500,

// display a tip with aggregation function and path[source] when hovering over a legend item
// e.g.: "MIN environment.wind.speedApparent" when hovering over 'minAWS'
pathTipOn: true,

// zoom factor applied when zooming in or out by clicking y/y2 axis buttons
zoomFactor: 1.5,
// Recommendation: 1.1 < value < 2

// plotted point radius
pointRadius: 0.5,  // 0.5 <= recommended value <= 1.5
// with 0.5, the dot will have the same thickness as a 1px (pixel) plotted line,
// hence it will show only when the line is dashed or has sparse values. 
// NOTE: lines thickness and dashed-format can be adjusted in stripcharts.css;
// look for the following code:
/*
** adjust plot lines stroke width
.c3 .c3-lines path { stroke-width: 1px, }  
**  y2-related lines have the additional "y2Plot" class  
.c3 .c3-lines.y2Plot path { stroke-width: 1px; stroke-dasharray: 10 5; }
*/

/* InfluxDB options
********************/
useInfluxDB: false,
influxDB: {                       // optional
  dbName: "boatdata",             // optional, default "boatdata"
  SK2InfluxResolution_ms: 1000,   // optional, default 1000
  // Should be equal to the 'resolution' parameter of SignalK-to-influxdb plugin
  shortlistedRPs: ["1day", "1week", "1month"]  // optional
  // allows to include only the RPs that are relevant to charting
  // default: default RP (fed by SignalK-to-influxdb plugin) and all RPs fed by CQs
  // Note: default RP automatically added if not included; included RPs ignored if not fed by a CQ
},

/* Signalk options
*******************/
// signalk subscription policy:
subscribePolicy: {
  // ref: http://signalk.org/specification/1.3.0/doc/subscription_protocol.html
  // see also: https://github.com/SignalK/signalk-server-node/issues/1015
  format: "delta",    // "delta" is signalk default ("full" deprecated for ws)
  policy: "fixed",  // "ideal" is signalk default    
  period: 900       // 1000 is signalk default       
},
// use only one of the following pairs:
//   - policy: "fixed", period: msec1    (recommended)
//        where msec1 is <= min(avgInterval) - 100 (min of all charts in specs file)
//   - policy: "instant", minPeriod: msec2
//        where minPeriod <= min(avgInterval) / 5

/* Testing/debugging options
*****************************/
// Note: the following options properties used as url parameters override their values herein:
//   - policy
//   - period
//   - minPeriod
//   - logTypes
//   - timeTolSec
// logging for debuging (in window area, below charts):
logMax: 1000,   // logging and some error msgs ignored after logMax invocations

// logTypes control what is logged; is also an optional url parameter
logTypes: "",   
// specifies types of info to be logged: "all" or some in "sbweio"; no logging if ""
// s for specs,
// b for control blocks generated from specs
// w for websocket messages received from signalk
// e for events (mostly buttons related and errors),
// i for influxdb related logging
// o for others

// Testing on demo.signalk.org server will be stopped after maxRunMinutes
maxRunMinutes: 20,

// Time reference:
// initial date/time reference is signalk Hello (version) msg timestamp;
// thereafter the client clock is used as timer for computing the elapsed time
// and controling the aggregation process;
// date/time when displayed are computed as initial sk ref + elapsed time.
// Deltas with a time stamp out of tolerance are skipped and logged to console;
// deltas time stamps are not considered for any other purpose.
// timeTolSec option specifies the tolerance; it is also an optional url parameter;
// use timeTolSec: 0 when replaying log files or when instruments provide "bad" (outdated or inconsistent) stamps;
timeTolSec: 0,   
// typically 20 sec; if 0, check is bypassed

/* DEPRECATED
*************/
// hotdeck duration in seconds (when some data stops arriving)
hotdeckSec: 0  // , no hotdeck if 0


/***********************/
};  // end options object
