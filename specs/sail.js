"use strict";
// specifications for several concurrent charts (2 of them displayed at once)
// Note: all durations in sec

//=================== Wind speeds 10min, 2h, 24h =======================

const Wind_speeds_10min = 
    // for javascript variables naming rules see https://javascript.info/variables#variable-naming
    { stripChartName: "Wind_speeds_10min",   // use preferably the same as the containing object name
        timeWindow: 10*60,          // 10min = 10 * 60
        avgInterval: 2,             // 2 sec
        intervalsPerRefresh: 2,     // default 1
        x: { label: "min/sec ago", tickCount: 11 },   // a tick every min (10, + 1 for zero)
        y: { unit: "Knot" },
        paths: 
        [
            { path: "environment.wind.speedTrue", AVG: "TWS" },
            { path: "environment.wind.speedApparent", AVG: "AWS" }      
        ]
    }
;

const Wind_speeds_2h = derivedFrom(Wind_speeds_10min,  // 1st level inheritance
    { stripChartName: "Wind_speeds_2h",
        timeWindow: 2*60*60,       // 2h
        avgInterval: 10,           // 10 sec
        intervalsPerRefresh: 1,    // overide inherited value 2 !
        x: { label: "hrs/min ago", tickCount: 13 }  // a tick every 10 min (12, + 1 for zero)
    }
);

const Wind_speeds_24h = derivedFrom(Wind_speeds_2h,    // 2d level inheritance
    { stripChartName: "Wind_speeds_24h",
    skip: false,
        timeWindow: 24*60*60,      // 24h
        avgInterval: 120,          // 120 sec
        paths: 
        [
            { path: "environment.wind.speedTrue", MAX: "maxTWS", MIN: "minTWS" },
            { path: "environment.wind.speedApparent",  MAX: "maxAWS", MIN: "minAWS" }      
        ]
    }
);

//=================== Wind angles 10min, 2h, 24h ======================= 

const Wind_angles_10min =
    { stripChartName: "Wind_angles_10min",
        timeWindow: 600,          // 10min
        avgInterval: 2,           // 2 sec
        intervalsPerRefresh: 2,   // default 1
        x: { label: "min/sec ago", tickCount: 11 },   // a tick every min (10, + 1 for zero)
        y: { unit: "Angle_Degree" },
        paths: 
        [
            { path: "environment.wind.angleTrueWater", AVG: "TWA" },
            { path: "environment.wind.angleApparent", AVG: "AWA" },     
            { path: "performance.beatAngle", AVG: "polBA" },      
            { path: "performance.gybeAngle", AVG: "polGA" }      
        ]
    };

const Wind_angles_2h = derivedFrom(Wind_angles_10min,
    { stripChartName: "Wind_angles_2h",
        timeWindow: 2*60*60,      // 2h
        avgInterval: 10,          // 10 sec
        intervalsPerRefresh: 1,
        x: { label: "hrs/min ago", tickCount: 13 },
    }
);

const Wind_angles_24h = derivedFrom(Wind_angles_2h,
    { stripChartName: "Wind_angles_24h",
        timeWindow: 24*60*60,     // 24h
        avgInterval: 120,         // 120 sec
        paths: 
        [
            { path: "environment.wind.angleTrueWater", MAX: "maxTWA", MIN: "minTWA" },
            { path: "environment.wind.angleApparent", MAX: "maxAWA", MIN: "minAWA" }      
        ]
    }
);

//=================== Boat speeds 10min, 2h, 24h ======================= 

const Boat_speeds_10min =
    { stripChartName: "Boat_speeds_10min",
        timeWindow: 600,          // 10min
        avgInterval: 2,           // 2 sec
        intervalsPerRefresh: 2,   // default 1
        x: { label: "min/sec ago", tickCount: 11 },   // a tick every min (10, + 1 for zero)
        y: { unit: "Knot" },
        paths: 
        [
            { path: "navigation.speedOverGround", AVG: "SOG" },
            { path: "navigation.speedThroughWater", AVG: "STW" },      
            { path: "performance.velocityMadeGood", AVG: "VMG" },     
            { path: "performance.polarSpeed", AVG: "polS" } 
        ]
    };

const Boat_speeds_2h = derivedFrom(Boat_speeds_10min,
    { stripChartName: "Boat_speeds_2h",
        timeWindow: 2*60*60,      // 2h
        avgInterval: 10,          // 10 sec
        intervalsPerRefresh: 1,
        x: { label: "hrs/min ago", tickCount: 13 },
    }
);

const Boat_speeds_24h = derivedFrom(Boat_speeds_2h,
    { stripChartName: "Boat_speeds_24h",
        timeWindow: 24*60*60,     // 24h
        avgInterval: 120,         // 120 sec
        paths: 
        [
            { path: "navigation.speedOverGround", MAX: "maxSOG", MIN: "minSOG" },
            { path: "navigation.speedThroughWater", MAX: "maxSTW", MIN: "minSTW" }     
        ]
    }
);

//=================== Wind/boat directions 10min, 2h, 24h ======================= 

const Wind_boat_dir_10min =
    { stripChartName: "Wind_boat_dir_10min",
        timeWindow: 600,          // 10min
        avgInterval: 2,           // 2 sec
        intervalsPerRefresh: 2,   // default 1
        x: { label: "min/sec ago", tickCount: 11 },   // a tick every min (10, + 1 for zero)
        y: { label: "Degrees True", unit: "Direction_Degree" },
        paths: 
        [
            { path: "environment.wind.directionTrue", AVG: "TWD" },
            { path: "navigation.courseOverGroundTrue", AVG: "COG" },      
            { path: "navigation.headingTrue", AVG: "HDT" }      
        ]
    };

const Wind_boat_dir_2h = derivedFrom(Wind_boat_dir_10min,
    { stripChartName: "Wind_boat_dir_2h",
        timeWindow: 2*60*60,      // 2h
        avgInterval: 10,          // 10 sec
        intervalsPerRefresh: 1,
        x: { label: "hrs/min ago", tickCount: 13 },
    }
);

const Wind_boat_dir_24h = derivedFrom(Wind_boat_dir_2h,
    { stripChartName: "Wind_boat_dir_24h",
        timeWindow: 24*60*60,    // 24h
        avgInterval: 120,        // 120 sec
    }
);

// ===================== stripCharts set ============================
// define stripChartsSpecs as a set of selectable stripCharts
// identify the two charts that will display at startup (optional)

    const  stripChartsSpecs = {
        name: "Sail",    // shows in tab title
        stripCharts: [
            Wind_speeds_10min,
            Wind_speeds_2h,
            Wind_speeds_24h,
            Wind_angles_10min,
            Wind_angles_2h,
            Wind_angles_24h,
            Boat_speeds_10min,
            Boat_speeds_2h,
            Boat_speeds_24h,
            Wind_boat_dir_10min,
            Wind_boat_dir_2h,
            Wind_boat_dir_24h
        ],
        initialUpperView: Wind_speeds_10min,    // one of the stripCharts
        initialLowerView: Wind_angles_10min     // idem
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
		AWA: 	  "hsl(120, 100%, 50%)",
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
