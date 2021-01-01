//=================== Filtering sources, an example ======================= 
// Before running those charts, on the server:
//   - enable connections 'aava-n2k.data' and 'Plaka log' in SignalK Dashboard, menu Server/Connections
//   - disable all other connections
//   - restart SignalK
// Sources avalaible by path can be seen in Signal K Data Browser
//   or by clicking 'Enumerate paths' from Stripcharts startup menu
// Note: On real data such charts may help in calibrating some instruments

const Speeds_per_source =
    { stripChartName: "Speed_per_source",
        timeWindow: 600,          // 10min
        avgInterval: 2,           // 2 sec
        x: { label: "min/sec ago", tickCount: 11 },
        y: { unit: "Knot" },
        paths: 
        [
            { path: "navigation.speedOverGround[Plaka log.II]", AVG: "SOG-Plaka" },
            { path: "navigation.speedOverGround[aava-n2k.data.160]", AVG: "SOG-aava" },
            { path: "navigation.speedThroughWater", AVG: "STW" }
        ]
    };

const Speeds_ALL_sources = derivedFrom(Speeds_per_source,
    { stripChartName: "Speeds_ALL_sources",
        paths: 
        [
            { path: "navigation.speedOverGround", AVG: "SOG-all" },  // all sources averaged
            { path: "navigation.speedThroughWater", AVG: "STW" }
        ]
    }
);
    
const Directions_per_source = derivedFrom(Speeds_per_source,
    { stripChartName: "Directions_per_source",
        y: { unit: "Direction_Degree" },
        paths: 
        [
            { path: "navigation.courseOverGroundTrue[Plaka log.II]", AVG: "COG-Plaka" },
            { path: "navigation.courseOverGroundTrue[aava-n2k.data.160]", AVG: "COG-aava" },
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

