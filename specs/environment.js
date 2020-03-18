"use strict";
// specifications for several concurrent charts (2 of them displayed at once)
// Note: all durations in seconds
//Environment:
//  water (depth, waterTemp)
//  air (temp, pressure)
//=================== Water 10min, 2h, 24h =======================

const Water_10min =
	{ stripChartName: "Water_10min",
		timeWindow: 600,        	// 10min
		avgInterval: 2,         	// 2 sec
		intervalsPerRefresh: 2,   	// default 1
		x: { label: "min/sec ago", tickCount: 11 },   // a tick every min (10, + 1 for zero)
		y: { unit: "Meter" },
		y2: { unit: "Celsius", min: -5, max: 30 },    // here default min & max for "Celsius" unit are superceded
		paths: 
		[
			{ path: "environment.depth.belowTransducer", MIN: "minDepth" },  
			{ path: "environment.water.temperature", axis: "y2", AVG: "waterTemp" }  
		]
	}
;

const Water_2h = derivedFrom(Water_10min,
	{ stripChartName: "Water_2h",
		timeWindow: 2*60*60,     	// 2h
		avgInterval: 10,      		// 10 sec
		intervalsPerRefresh: 1,		// overide inherited value 2 !!!
		x: { label: "hrs/min ago", tickCount: 13 },
	}
);

const Water_24h = derivedFrom(Water_2h,
	{ stripChartName: "Water_24h",
		timeWindow: 24*60*60,     	// 24h
		avgInterval: 120,      		// 120 sec
	}
);
	//=================== Air 2h, 24h =======================

const Air_2h = 
	{ stripChartName: "Air_2h",
		timeWindow: 2*60*60,    	// 2h
		avgInterval: 10,      		// 10 sec
		x: { label: "hrs/min ago", tickCount: 13 },
		y: { unit: "Millibar" },
		y2: { unit: "Celsius", min: -5, max: 35 },
		paths: 
		[
			{ path: "environment.outside.pressure", AVG: "atmPr" },  
			{ path: "environment.outside.temperature", axis: "y2", AVG: "airTemp" }  
		]

	}
;

const Air_24h = derivedFrom(Air_2h,
	{ stripChartName: "Air_24h",
		timeWindow: 24*60*60,     	// 24h
		avgInterval: 120,      		// 120 sec
	}
);

// ===================== selectable stripCharts ============================
// define stripChartsSpecs as a set of selectable stripCharts
// identify the two charts that will display at startup (optional)

const  stripChartsSpecs = {
	name: "Environment",    // shows in tab title
	stripCharts: [
		Water_10min,
		Water_2h,
		Water_24h,
		Air_2h,
		Air_24h
	],
	initialUpperView: Water_2h,    	// one of the stripCharts
	initialLowerView: Air_2h     	// idem
};

// no color palette provided: colors chosen by c3 library