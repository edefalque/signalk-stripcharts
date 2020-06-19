## V0.1.0

2020-06-12
 - Update README_md v0.1.0
 - package folders structure modified
 - improve influxDB error reporting
 - various bugs solved
 - options.point.radius added
 - options.point.hotdeckSec marked deprecated and set to 0 (but still functional)
 - options is now an object with all options
 - simplepicker: time input now trailed with "GMT"
 - tested on Edge 83.0.478.45 (64-bit)) Win 10, Firefox 68.9.0-esr (64-bit) Win 10, Chromium Version 72.0.3626.121 Raspbian 9.11, Firefox-esr 52.9.0 (32-bit) Raspbian 9.11: fixed alignment in simplepicker input="time" field and a few small bugs

2020-06-03
 - when a chart type is deselected, then selected again (ie brought to view again), it keeps its zoomed, shifted or centered scale until reset button is clicked
 - zoomFactor is now an option (in stripcharts-options.js)

2020-06-02
 - fixed some x-axis label sync problems

2020-05-31
 - Implemented influxDB interface (uses a modified version of simplepicker package), see:
 https://node-influx.github.io/, https://github.com/priyank-p/simplepicker

2020-05-15
 - Missing data now "null" rather than 0; "null" values do not draw line on chart
 - Kelvin now treated as any unit for conversion to Celsius or Fahrenheit (formula -3333)

2020-05-10
 - corrected path[source] chartspecs inheritance bug (derivedFrom function modified to clone inherited paths)
 - modified path/source filtering: path specified without source in specs now collects all sources

2020-04-16
 - implemented and tested pushPoint heartbeat (make charts advance while no msg received)

## Please see [Releases](https://github.com/SignalK/signalk-stripcharts/releases) for the release notes.
