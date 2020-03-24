"use strict";
// Maximum number of rows in the aggregation tables
var tablesMaxRows = 2000;   // recommandation: keep timeWindow/avgInterval < 1000

// Testing on demo.signalk.org server will be stopped after maxRunMinutes
var maxRunMinutes = 20;

// Time reference:
// initial date/time reference is signalk version msg timestamp;
// thereafter the client clock is used as timer for computing the elapsed time
// and controling the aggregation process;
// date/time when displayed are computed as initial sk ref + elapsed time.
// Deltas with a time stamp out of tolerance are skipped and logged to console;
// deltas time stamps are not considered for any other purpose.
// timeTolSec option specifies the tolerance; it is also an optional url parameter;
// use timeTolSec = 0 when replaying log files or when instruments provide "bad" (outdated or inconsistent) stamps;
var timeTolSec = 0;    // typically 20 sec; 0 --> check is bypassed

// display a tip with aggregation function and path when hovering over a legend item
// e.g.: "MIN environment.wind.speedApparent" when hovering over 'minAWS'
var pathTipOn = true;

// logging for debuging (in window area, below charts):
var logMax = 500;   // logging and some error msgs ignored after logMax invocations

// logTypes control what is logged; is also an optional url parameter
var logTypes = "";  // "all" or some in "sbweo";  // specifies types of info to be logged; no logging if ""
// s for specs,
// b for control blocks generated from specs
// w for websocket messages received from signalk
// e for events (mostly buttons related and errors),
// o for others

// signalk subscription policy:
var subscribePolicy = {
      // ref: http://signalk.org/specification/1.3.0/doc/subscription_protocol.html
      // only the following policy has been tested:
      period: 1000,       // 1000 is signalk default
      format: "delta",    // "delta" is signalk default
      policy: "instant",  // "ideal" is signalk default
      minPeriod: 500,     // only relevant for policy='instant' (and 'ideal' ?)
    };
