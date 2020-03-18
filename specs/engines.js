"use strict";
// specifications for several concurrent charts (2 of them displayed at once)
// Note: all durations in seconds

//=================== Engine starboard 24h =======================
// this chart specification shows an example of "Percent" used as y-unit;
// this allows to plot values with different units along a same y axis;
// the values are converted to percents by providing 2 references:
//      - the value in original unit equivalent to  0%
//      - the value in original unit equivalent to 100%
// "Percent" can also be used with y2 axis

const engineStarboard = "starboard";  // set value as per actual signalk schema engine id
const enginePort = "port";            // idem

const Engine_Starb_24h =
	{ stripChartName: "Engine_Starb_24h",
        timeWindow: 24*60*60,     	// 24h
        avgInterval: 120,      		// 120 sec
        x: { label: "hrs/min ago", tickCount: 13 },
        y: { unit: "Percent" },  // reference signalk values for 0% and 100% provided in paths below
        y2: { unit: "Revolutions_per_minute", min: 0, max: 2500 },
        // grid (optional) exactly as in https://c3js.org/reference.html#grid-x-show etc. (no validation!):
        grid: { x: { show: true, lines: [] },    // vertical grid lines, no additional labelled lines
                y: { show: false,                // no horizontal grid lines
                  lines: [          // additional labelled and styled horizontal lines
                    {value: 6, text: "OilPress alert (0.3bar)", position: "middle", class: "redLine" },
                    // 'value: 6' because 6% = 0.3bar/5bar
                    // The available classes (colors) are defined in stripCharts.css:
                    //      redLine, greenLine, blueLine, violetLine, orangeLine, greyLine
                    {value: 70, text: "OilPress at cruising RPM (3.5bar)", position: "middle", class: "greenLine"},
                    // 70% = 0.7 = (3.5bar-pc0)/(pc100-pc0) = 3.5bar/5bar  (see path below)
                    {value: 80, text: "WaterTemp at cruising RPM (90°C)", position: "middle", class: "greenLine"},
                    // 80% = 0.8 = (90°-pc0)/(pc100-pc0) = (90°-50°)/(100°-50°)   (see path below)
                    {value: 100, text: "WaterTemp alert (100°C)", position: "middle", class: "redLine"}
                  ]
                }
        },   
        paths: 
        [
            { path: "propulsion." + engineStarboard + ".temperature", MAX: "maxWaterTemp", pc0: 50, pc100: 100 }, // 50°C > 100°C
            // 0% = 50° Celsius, 100% = 100° Celsius
            // Note: Signalk Kelvin degrees are implicitely converted to Celsius degrees
            { path: "propulsion." + engineStarboard + ".oilPressure", MIN: "minOilPress", pc0: 0 , pc100: 5e5 },  // 0 bar > 5 bar
            // pc100 is in signalk units: 5e5 Pascal = 5 bar
            { path: "propulsion." + engineStarboard + ".revolutions", axis: "y2", AVG: "RPM" } 
        ]
	}
;

//=================== Engine port 24h =======================

const Engine_Port_24h = derivedFrom(Engine_Starb_24h,
	{ stripChartName: "Engine_Port_24h",
        paths: 
        [
            { path: "propulsion." + enginePort + ".temperature", MAX: "maxWaterTemp", pc0: 50, pc100: 100 },
            { path: "propulsion." + enginePort + ".oilPressure", MIN: "minOilPress", pc0: 0 , pc100: 5e5 },
            { path: "propulsion." + enginePort + ".revolutions", axis: "y2", AVG: "RPM" } 
        ]
	}
);
//=================== Engine port 24h WITHOUT GRID =======================
// (exemple of removing a property from a derived chart definition)

const Eng_Port_24h_noGrid = derivedFrom(Engine_Port_24h,
	{ stripChartName: "Eng_Port_24h_noGrid",
	}
);
delete Eng_Port_24h_noGrid.grid;        // any optional property can be deleted

// ===================== selectable stripCharts ============================
// define stripChartsSpecs as a set of selectable stripCharts;
// identify the two charts that will be displayed at startup (optional)

const  stripChartsSpecs = {
	name: "Engines",    // shows in tab title
	stripCharts: [
		Engine_Starb_24h,
		Engine_Port_24h,
		Eng_Port_24h_noGrid
	],
	initialUpperView: Engine_Starb_24h,
	initialLowerView: Engine_Port_24h
};

// =====================      Color palette     ============================
// no color palette provided: colors chosen by c3 library