// You may overide some options here ...
options.useInfluxDB = true;
// Signal k subscribePolicy set to "instant"
// (provides better results when filtering on sources and same path sources "compete")
options.subscribePolicy.policy= "instant";
options.subscribePolicy.minPeriod= 100;

//=================== Filtering sources, an example ======================= 
// Before running those charts, on the server:
//   - enable connection 'aava-n2k.data' in SignalK Dashboard, menu Server/Connections
//   - disable all other connections
//   - restart the server
// Have a look on menu Data Browser
// Note: On real data such charts may help in calibrating some instruments

const Speeds_10min =
    { stripChartName: "Speeds_10min",
        timeWindow: 10*60,          // 10min
        avgInterval: 1,           // 1 sec
        x: { label: "min/sec ago", tickCount: 11 },
        y: { unit: "Knot" },  // Meters_per_second
        paths: 
        [
            { path: "navigation.speedThroughWater", AVG: "STW", MIN: "", MAX: "" },       
            { path: "navigation.speedOverGround[aava-n2k.data.43]", AVG: "SOG-a" },
            { path: "navigation.speedOverGround[aava-n2k.data.160]", AVG: "SOG-b" },
            { path: "environment.wind.speedTrue", AVG: "TWS" },
        ]
    };

const Sp_10min_dup = derivedFrom(Speeds_10min,
    { stripChartName: "Sp_10min_dup",
    }
);

const Speeds_2h = derivedFrom(Speeds_10min,
    { stripChartName: "Speeds_2h",
        timeWindow: 2*60*60,      // 2h
        avgInterval: 10,          // 10 sec
        x: { label: "hrs/min ago", tickCount: 13 }
    }
);

const Batt_temp = derivedFrom(Speeds_10min,
    { stripChartName: "Batt_temp",
        y: { unit: "Celsius" }, 
        paths: 
        [
            { path: "electrical.batteries.1.temperature", AVG: "TEMP" },
        ]
    }
);

// ===================== stripCharts set ============================
// define stripChartsSpecs as a set of selectable stripCharts
// identify the two charts that will display at startup (optional)

    const  stripChartsSpecs = {
        name: "influx test",    // shows in tab title
        stripCharts: [
            Speeds_10min,
            Sp_10min_dup,
            Batt_temp
        ],
        initialUpperView: Speeds_10min,  
        initialLowerView: Sp_10min_dup  
};


