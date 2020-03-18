"use strict";
//=================== Wind 10 min & 2 hours =======================

const Wind_10min = 
    { stripChartName: "Wind_10min",   // stripChartName MUST be same as the containing object name
        timeWindow: 600,            // 10min
        avgInterval: 2,             // 2 sec
        intervalsPerRefresh: 2,     // default 1
        x: { label: "min/sec ago", tickCount: 11 },   // a tick every min (10, + 1 for zero)
        y: { unit: "Knot" },
        y2: { unit: "Angle_Degree" },
        paths: 
        [
            { path: "environment.wind.speedTrue", AVG: "TWS" },
            { path: "environment.wind.speedApparent", AVG: "AWS" },
            { path: "environment.wind.angleApparent", axis: "y2", AVG: "AWA" }      
        ]
    }
;

const Wind_2h = derivedFrom(Wind_10min,  // 1st level inheritance
    { stripChartName: "Wind_2h",
        timeWindow: 2*60*60,       // 2h
        avgInterval: 10,           // 10 sec
        intervalsPerRefresh: 1,    // overide inherited value 2 !
        x: { label: "hrs/min ago", tickCount: 13 }  // a tick every 10 min (12, + 1 for zero)
    }
);


// ===================== stripCharts set ============================

const  stripChartsSpecs = {
    name: "Wind",    // shows in tab title
    stripCharts: [
        Wind_10min,
        Wind_2h
    ],
    initialUpperView: Wind_10min,    // one of the stripCharts
    initialLowerView: Wind_2h     // idem
};

// ===================== Color palette ============================
// Object with colors for legends, lines, etc.;
// method colorFor(legend) returns a string with the color code or name
// Note: if no colorPalette is provided, colors will be chosen by c3 library
const colorPalette = {
	// Picked from https://www.w3schools.com/colors/colors_picker.asp   (see "Hue")
	// Using hsl (hue, saturation, lightness) notation, fully saturated colors are selected
	// For AVG lines, lightness is 50%
	// MAX lines are lighter (approx +25%)
	// MIN lines are darker (approx -20%) 
	// Apparent wind speeds/angles are greenish
		AWS: 	  "hsl(120, 100%, 50%)",
		maxAWS: "hsl(120, 100%, 75%)",
		minAWS: "hsl(120, 100%, 30%)",
		AWA: 	  "hsl(51, 100%, 50%)",
		maxAWA: "hsl(120, 100%, 75%)",
		minAWA: "hsl(120, 100%, 30%)",
	// True wind speeds/angles are blueish
		TWS: 	  "hsl(215, 100%, 50%)", 
		maxTWS: "hsl(215, 100%, 75%)",
		minTWS: "hsl(215, 100%, 30%)",
		polBA: "hsl(215, 100%, 90%)",
		polGA: "hsl(215, 100%, 90%)",
		TWA: 	  "hsl(215, 100%, 50%)", 
		maxTWA: "hsl(215, 100%, 75%)",
		minTWA: "hsl(215, 100%, 30%)",
	// True Wind directions are Cyan-ish
		TWD: 	  "hsl(180, 100%, 50%)", 
		maxTWD: "hsl(180, 100%, 80%)",
		minTWD: "hsl(180, 100%, 30%)",
	// Boat water speeds/headings are redish
		STW: 	  "hsl(0, 100%, 50%)",
		maxSTW: "hsl(0, 100%, 75%)",
		minSTW: "hsl(0, 100%, 30%)",
		polS: "hsl(0, 100%, 90%)",
		HDT: 	  "hsl(0, 100%, 50%)",
		maxHDT: "hsl(0, 100%, 75%)",
		minHDT: "hsl(0, 100%, 30%)",
	// Boat speeds/directions Over Ground are purple-ish
		SOG: 	  "hsl(300, 100%, 50%)",
		maxSOG: "hsl(300, 100%, 75%)",
		minSOG: "hsl(300, 100%, 30%)",
		COG: 	  "hsl(300, 100%, 50%)",
		maxCOG: "hsl(300, 100%, 75%)",
		minCOG: "hsl(300, 100%, 30%)",
	// VMG is goldish
		VMG: 	  "hsl(51, 100%, 50%)",
		maxVMG: "hsl(51, 100%, 75%)",
		minVMG: "hsl(51, 100%, 30%)",
	// depths redish
		DEPTH:    "hsl(0, 100%, 50%)",
		maxDEPTH: "hsl(0, 100%, 75%)",
		minDEPTH: "hsl(0, 100%, 35%)",
	// Sea water temperatures brownish
		WTEMP:    "hsl(25, 100%, 40%)",
		maxWTEMP: "hsl(25, 100%, 55%)",
		minWTEMP: "hsl(25, 100%, 25%)",

	colorFor: function(legend) {
		if (this.hasOwnProperty(legend)) {
			return this[legend];
		}
		else  {
			console.log( "no color in palette for: " + legend);
			return "Grey";	// Note: would an empty string be returned, c3 would choose a color for you
		}
	}
}
