"use strict";
// This example shows some advanced features:
//      - plot paths with different SK units as "Percent" on the same y or y2 axis
//      - vertical and horizontal grid lines for visual improvements

//=================== Engine starboard 24h =======================
// This chart shows:
//      - y axis: cooling water temperature and oil pressure
//      - y2 axis: revolution per minutes (y2 axis)
// "Percent" is used as y-unit;
// this allows to plot values with different SK units along a same y axis;
// the SK values are converted to percents by providing 2 references in the path specification:
//      - the value in sk unit equivalent to  0%
//      - the value in sk unit equivalent to 100%
// "Percent" can also be used with y2 axis.
//
// This chart specification also shows how to draw some lines to improve legibility.
// Horizontal lines are provided for the following reference levels:
//      -  OilPress alert (0.3bar)
//      -  OilPress at cruising RPM (3.5bar)
//      -  WaterTemp at cruising RPM (90°C)
//      -  WaterTemp alert (100°C)
// Vertical lines are also provided as visual references

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
                    // 'value: 6' because 6% = 0.3bar/5bar (see pc100 reference in path below)
                    // The available classes (colors) are defined in stripCharts.css:
                    //      redLine, greenLine, blueLine, violetLine, orangeLine, greyLine
                    {value: 70, text: "OilPress at cruising RPM (3.5bar)", position: "middle", class: "greenLine"},
                    // 70% = 0.7 = 3.5bar/5bar  (see path below)
                    {value: 80, text: "WaterTemp at cruising RPM (90°C)", position: "middle", class: "greenLine"},
                    // 80% = 0.8 = (90°-50°)/(100°-50°)   (because 100° is 100% and 50° is 0%)
                    {value: 100, text: "WaterTemp alert (100°C)", position: "middle", class: "redLine"}
                  ]
                }
        },   
        paths: 
        [
            { path: "propulsion." + engineStarboard + ".temperature", MAX: "maxWaterTemp",
                pc0: 50 + 273.15, pc100: 100 + 273.15 },   // 50°C -> 100°C (converted to Kelvin, the SK unit)
            { path: "propulsion." + engineStarboard + ".oilPressure", MIN: "minOilPress", pc0: 0 , pc100: 5e5 },  // 0 bar -> 5 bar
            // 5 bar converted to the signalk unit: 5e5 Pascal = 5 bar
            { path: "propulsion." + engineStarboard + ".revolutions", axis: "y2", AVG: "RPM" } 
        ]
	}
;
//=================== Engine starboard 2h =======================

const Engine_Starb_2h = derivedFrom(Engine_Starb_24h,
	{ stripChartName: "Engine_Starb_2h",
        timeWindow: 2*60*60,     	// 2h
        avgInterval: 10      		// 10 sec
        }
);
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
//=================== Engine port 2h =======================

const Engine_Port_2h = derivedFrom(Engine_Port_24h,
	{ stripChartName: "Engine_Port_2h",
        timeWindow: 2*60*60,     	// 2h
        avgInterval: 10      		// 10 sec
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
                Engine_Starb_2h,
		Engine_Port_24h,
		Engine_Port_2h,
		Eng_Port_24h_noGrid
	],
	initialUpperView: Engine_Starb_2h,
	initialLowerView: Engine_Port_2h
};

// =====================      Color palette     ============================
// no color palette provided: colors chosen by c3 library