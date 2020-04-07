//=================== Filtering sources, an example ======================= 
// Before running those charts, on the server:
//   - enable connection 'aava-n2k.data' in SignalK Dashboard, menu Server/Connections
//   - disable all other connections
//   - restart the server
// Have a look on menu Data Browser
// Note: On real data such charts may help in calibrating some instruments

const Speeds_per_source =
    { stripChartName: "Speed_per_source",
        timeWindow: 600,          // 10min
        avgInterval: 2,           // 2 sec
        x: { label: "min/sec ago", tickCount: 11 },
        y: { unit: "Knot" },
        paths: 
        [
            { path: "navigation.speedOverGround[aava-n2k.data.43]", AVG: "SOG-a" },
            { path: "navigation.speedOverGround[aava-n2k.data.160]", AVG: "SOG-b" },
            { path: "navigation.speedThroughWater", AVG: "STW" }
        ]
    };

const Speeds_ALL_sources = derivedFrom(Speeds_per_source,
    { stripChartName: "Speeds_ALL_sources",
        paths: 
        [
            { path: "navigation.speedOverGround", AVG: "SOG" },  // all sources averaged
            { path: "navigation.speedThroughWater", AVG: "STW" }
        ]
    }
);
    
const Directions_per_source = derivedFrom(Speeds_per_source,
    { stripChartName: "Directions_per_source",
        y: { unit: "Direction_Degree" },
        paths: 
        [
            { path: "navigation.courseOverGroundTrue[aava-n2k.data.43]", AVG: "COG-a" },
            { path: "navigation.courseOverGroundTrue[aava-n2k.data.160]", AVG: "COG-b" },
            { path: "navigation.headingTrue", AVG: "HDG" }
        ]

    }
);

const Direction_ALL_sources = derivedFrom(Directions_per_source,
    { stripChartName: "Direction_ALL_sources",
        paths: 
        [
            { path: "navigation.courseOverGroundTrue", AVG: "COG" }, // all sources averaged
            { path: "navigation.headingTrue", AVG: "HDG" }
        ]
    }
);

// ===================== stripCharts set ============================
// define stripChartsSpecs as a set of selectable stripCharts
// identify the two charts that will display at startup (optional)

    const  stripChartsSpecs = {
        name: "Filtering sources",    // shows in tab title
        stripCharts: [
            Speeds_per_source,
            Speeds_ALL_sources,
            Directions_per_source,
            Direction_ALL_sources
        ],
        initialUpperView: Speeds_per_source,    // one of the stripCharts
        initialLowerView: Speeds_ALL_sources    // another one
};

// You may overide some options here ...
// When filtering on sources, minPeriod should be << avgInterval.
// This will decrease chance a "fast" source mask another one when filtering on sources
// (a 'large' minPeriod may result in some horizontal "hotdecking" plot segments).
subscribePolicy.minPeriod = 20;

