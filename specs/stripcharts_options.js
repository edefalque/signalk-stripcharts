"use strict";
var options = {
// Note: options marked "//url parm" can be specified as url parameter as optionName=value
// any option can be superseded by providing a new value in the charts spec file, e.g.:
//   options.influxDB.dbName = "myInfluxDB";
/* Testing/debugging options
*****************************/
// logging for debuging (in window area, below charts):
logMax: 1000,   // logging and some error msgs ignored after logMax invocations

// logTypes control what is logged; is also an optional url parameter
logTypes: "",  //url param
// specifies types of info to be logged: "all" or some in "sbweio"; no logging if ""
// s for specs,
// b for control blocks generated from specs
// w for websocket messages received from signalk
// e for events (mostly buttons related and errors),
// i for influxdb related logging
// o for others

// Testing on demo.signalk.org server will be stopped after maxRunMinutes
maxRunMinutes: 20,

/* charts and User Interface options
*************************************/
// Maximum number of rows in the aggregation tables:
// - equals max number of points on a plotted line on any chart)
// - equals timeWindow/avgInterval as defined in chart
// recommendation: keep it < 1000, typical value between 200 and 800
tablesMaxRows: 2000,   

// hotdeck duration in seconds (when some data stops arriving)
hotdeckSec: 0,  // DEPRECATED, no hotdeck if 0

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

/* Signalk options
*******************/
// signalk subscription policy:
subscribePolicy: {
  // ref: http://signalk.org/specification/1.3.0/doc/subscription_protocol.html
  // see also: https://github.com/SignalK/signalk-server-node/issues/1015
  format: "delta",    // "delta" is signalk default ("full" deprecated for ws)
  policy: "fixed",  // "ideal" is signalk default   //url parm
  period: 900       // 1000 is signalk default      //url parm
},
// use only one of the following pairs:
//   - policy: "fixed", period: msec1    (recommended)
//        where msec1 is <= min(avgInterval) - 100 (min of all charts in specs file)
//   - policy: "instant", minPeriod: msec2          //url parm (minPeriod)
//        where minPeriod <= min(avgInterval) / 5


// Time reference:
// initial date/time reference is signalk Hello (version) msg timestamp;
// thereafter the client clock is used as timer for computing the elapsed time
// and controling the aggregation process;
// date/time when displayed are computed as initial sk ref + elapsed time.
// Deltas with a time stamp out of tolerance are skipped and logged to console;
// deltas time stamps are not considered for any other purpose.
// timeTolSec option specifies the tolerance; it is also an optional url parameter;
// use timeTolSec: 0 when replaying log files or when instruments provide "bad" (outdated or inconsistent) stamps;
timeTolSec: 0,  //url parm
// typically 20 sec; if 0, check is bypassed


/* InfluxDB options
********************/
useInfluxDB: false,
influxDB: {
  dbName: "boatdata",
  retentionPolicies: [
    // MUST reflect the retention policies and continuous queries.
    // 1st element MUST be rp for db (default retention policy).
    // When querying influxdb to fill a chart, 
    // rp with largest sampling_ms <= chart's avgInt will be used if any
    // hence min and max values will often be less extreme than live data,
    // while avg values should be equal;
    // if there is no such rp, the default rp will be used and plotted points will show instead of lines.
    { RP: "1day", sampling_ms: 1000 },    // default RP: sampling_ms = resolution of influx writer
    { RP: "1week", sampling_ms: 10000 },  // RP for CQ1 results: sampling_ms = group by time in CQ1
    { RP: "1month", sampling_ms: 120000 } // RP for CQ2 results: idem in CQ2 = group by time in CQ2
]
}
/***********************/
};  // end options object
