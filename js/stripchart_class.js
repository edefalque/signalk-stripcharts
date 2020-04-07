/* Data structures of a stripChart object (this)
/* *********************************************

Note: the stripChart objects exist whether they are displayed or not,
  while a c3 chart object is explicitely destroyed when removed from display
  and re-generated when selected again for display.

Buffers accumulating data point values:
=======================================

1. Array of objects (one element per path):
      this._aggregators[i]= {AVG:0, COUNT:0, MAX:0, MIN:0, lastAVG:0, lastMAX:0, lastMIN: 0, lastStamp: 0}; 
      aggregates point values during an avgInterval

2. this._rows, array of rows (one row per avgInterval): 
      [ [value, value, value, value, ...],
        ...,
        ...
      ]
    Every avgInterval (msec) the oldest row is popped and the new one is unshifted;
    this._rowsLegends is also unshifted.
    This is done for every chart object (whethter selected or not for display).
    The so-prepared array is used as argument of the c3 generate and load methods.
    The load method is invoked every (intervalsPerRefresh*avgInterval)
    when the chart is visible and not paused provide that at least one
    new row has been inserted since the last refresh.
    The load method (aka refresh) is also invoked right away when:
    - the chart is selected for display
    - the window or tab is changed to visible
    - the chart is unpaused

Control blocks:
===============
Note:
-In specs: { path: "navigation.speedThroughWater[source1]", ...
- becomes: { path: "navigation.speedThroughWater", $source="source1", ... (see collectValidPaths() function)

3. this._paths = [
      { path: "navigation.speedThroughWater", $source="source1", skip: false,   axis: "y", AVG: "STW1", MAX: "", MIN: "" },
      { path: "navigation.speedThroughWater", $source="source2", skip: false,   axis: "y", AVG: "STW2", MAX: "", MIN: "" },
      { path: "environment.wind.speedApparent", skip: false, axis: "y", AVG: "", MAX: "maxAWS", MIN: "minAWS" },
        ...
      { path: "environment.depth.belowTransducer", skip: false, axis: "y2", AVG: "", MAX: "", MIN: "minDEPTH" }
    ]

3. Object this._path_Index, mapping each path line to an index for this._paths:
     
      {"navigation_speedThroughWater$source1":0,     // note: dots and hyphens replaced by "_" in path names & sources
       "navigation_speedThroughWater$source2":1,
       "environment_wind_speedApparent":2,
      ...}

4. Array this._aggrSelectors, containing what is to be charted for each path_, e.g.:

      this._aggrSelectors[0]: {"AVG":true,"MAX":false,"MIN":false}    // path 0
      this._aggrSelectors[1]: {"AVG":true,"MAX":false,"MIN":false}    // path 1
      this._aggrSelectors[2]: {"AVG":false,"MAX":true,"MIN":true}     // path 2
      ...
        
5. this._rowsLegends: a single "row" of data labels to be passed to the charting library as first element of the data array:

      ["STW1","STW2","maxAWS","minAWS", ... ,"minDepth"]


6. this._pathTips: aggregation function and path tips corresponding to the legends
      [ "AVG navigation_speedThroughWater[source1]",
        "AVG navigation_speedThroughWater[source2]",
        "MAX environment_wind_speedApparent",
         ..., "MIN environment_depth_belowTransducer"
      ]

7. this._axes: an object specifying the corresponding axis:

      { SOG:"y" , maxSOG:"y" , maxAWS:"y" , ..., minDepth:"y2" }

8. this._y2Classes: an array with all y2 line classes: 
       
      ["c3-lines-minDEPTH", "c3-lines-...]

9. this._convTuples: an array of tuples specifying the coefficients for a linear conversion of a row element;
    if tuple is [a,b], conversion is as follows: y or y2 = point_value * a + b;
    if a is negative, this may identify a specific conversion formula (see stripChartsUnits.js);
    so far b is not 0 only with y or y2 unit specified as "Percent" and pc0 != 0.

    Example:
      [ [1.943844, 0], ... , [-2222, 0], ... , [0.546807, 0] ]    

    Note: -2222 means °C to °F conversion
    (see getConvMultiplier, ConvertAny functions in stripChartsUnits.js)
*/
 
"use strict";
class stripChart {
  constructor(SCelem, subscribePaths) {
    
    this._SCname = SCelem.stripChartName;
    
    if (this._SCname == "none") { return; }
    
    this._avgInterval = SCelem.avgInterval * 1000;   // sec to msec
    this._timeWindow = (SCelem.timeWindow + SCelem.avgInterval)  * 1000;  // better x axis presentation
    this._rowsMaxLength = this._timeWindow/this._avgInterval;  // actual number of charted points along timeWindow
    this._intervalsPerRefresh = SCelem.intervalsPerRefresh;
    
    this._x = { label: { position: 'inner-right' },
                tick: { format: function (z) { return  formatxTick(z, SCelem.avgInterval * 1000) } }
              }
    this._x.label.text = SCelem.x.label +   "  .  .  .  .  .  ";  //  shift label left
    this._xOriginalLabel = SCelem.x.label + "  .  .  .  .  .  ";  //  shift label left
    this._x.max = this._rowsMaxLength;
    if (typeof SCelem.x.tickCount == "number") { this._x.tick.count = SCelem.x.tickCount; }
    // note: in stripCharts specs, x has tickCount property, while y and y2 use tick object (as c3.js)
    
    this._y = {  inner: true, label: { position: 'outer-top' }, padding: {top:0, bottom:0} }
    this._y.label.text = SCelem.y.label;
    this._maxInit = {};
    this._minInit = {};
    if (typeof SCelem.y.max == "number") { this._y.max = SCelem.y.max; this._maxInit["y"] = SCelem.y.max; }
    if (typeof SCelem.y.min == "number") { this._y.min = SCelem.y.min; this._minInit["y"] = SCelem.y.min; }    
    if (typeof SCelem.y.tick == "object") {  // typically, tick: {count: 9, format: d3.format(".1f") }
      this._y.tick = {};
      Object.assign(this._y.tick, SCelem.y.tick);  
    }

    this._y2 = {};
    this._y2PathsCount = 0;
    if (typeof SCelem.y2 !== "undefined") {   // if y2 axis wanted
        this._y2 = { inner: true, show: true, label:{ position: 'outer-top' }, padding: {top:0, bottom:0} };
        this._y2.label.text = SCelem.y2.label;
        if (typeof SCelem.y2.max == "number") { this._y2.max = SCelem.y2.max; this._maxInit["y2"] = SCelem.y2.max; }
        if (typeof SCelem.y2.min == "number") { this._y2.min = SCelem.y2.min; this._minInit["y2"] = SCelem.y2.min;}    
        if (typeof SCelem.y2.tick == "object") {  // typically, tick: {count: 9, format: d3.format(".1f") }
          this._y2.tick = {};
          Object.assign(this._y2.tick, SCelem.y2.tick); 
        }
    }
    /*
    else {    // empty place-holder axis
        this._y2 = { inner: true, show: true, label:{ position: 'outer-top', text: ' ' }, padding: {top:0, bottom:0},
            min: 0, max: 1.1, tick: { count: 1, values: [1.1], format: d3.format(',d') } };   // no tick values displayed
        // this assignment also later if no unskipped "y2" pathes present (see genChart())
    }
    */

    this._grid = { x: {show: false, lines: []}, y: {show: false, lines: []} };
    if (SCelem.grid) {
      if (SCelem.grid.x) {
        this._grid.x.show = (SCelem.grid.x.show) ?  SCelem.grid.x.show: false;
        if (SCelem.grid.x.lines) {
          Object.assign(this._grid.x.lines, SCelem.grid.x.lines)
        }
      }
      if (SCelem.grid.y) {
        this._grid.y.show = (SCelem.grid.y.show) ?  SCelem.grid.y.show: false;
        if (SCelem.grid.y.lines) {
          Object.assign(this._grid.y.lines, SCelem.grid.y.lines)
        }
      }
    }
     
    this._paths = SCelem.paths;
    this._has$source = false;  // will be set to true if any path specified with $source
    this._path_Index = {};
    this._aggrSelectors = [];
    this._rowsLegends = [];
    this._pathTips = [];
    this._colorPalette = {};
    this._validPathsNbr = 0;
    this._axes = {};
    this._y2Classes = [];    //  "c3-lines-XXX"  will be pushed for all y2 data
    this._convTuples = [];
    
    this._paths.forEach(collectValidPaths, this);
	
	if (typeof colorPalette != "undefined") {	// if the colorPalette object exists
		// set colors for collected legends, resulting in (e.g.)
		// this._colorPalette = {SOG: "hsl(300, 100%, 50%)", maxSOG: "hsl(300, 100%, 65%)", ..., minDepth: "hsl(25, 100%, 25%)"}
		// Note: missing colors will be "Grey"
    	for (var xLeg of this._rowsLegends) {
			this._colorPalette[xLeg] = colorPalette.colorFor(xLeg);
		}
	}		// else c3 library will choose the colors
    
    this._paths = this._paths.filter(Boolean);   //remove null elements
    
    this._aggregators = [];   // aggregates (i.e. AVG, MIN, MAX) point values during an 'avgInterval', one element per path
    var aggrInit = {AVG:0, COUNT:0, MAX:0, MIN:0, lastAVG:0, lastMAX:0, lastMIN:0, lastStamp: 0};
    for ( var i = 0; i < this._validPathsNbr; i++) {     // initialize this._aggregators array
          this._aggregators.push({});
          Object.assign(this._aggregators[i], aggrInit);
    }
    

    this._rows = [];
    
    this._lastPointTime = 0;   // skTime (msec) of last point received
    this._lastRowTime = 0;      // skTime (msec) when last row was added to this._rows
    this._rowCount = 0;
    this._rowCountSinceRefresh = 0;
    this._chartHeight = Math.floor(window.innerHeight/2 - 100);

    this._chartSpecs = {
            // customization: ref https://c3js.org/reference.html
            bindto: "#viewx",   // will be provided as generate method parameter
            transition: { duration: 0 },
            size: { height: this._chartHeight },    // will be later adjusted as needed
            legend: { position: 'bottom' },         // 'bottom' (default), 'right' and 'inset' are supported
              // 'right' and 'inset' would maximize chart height
              // e.g. legend: { position: 'inset', inset: { anchor: 'top-left', x: 400, y: 0, step: 1 } },
            data: { rows: this._rows, axes: this._axes, colors: this._colorPalette, type: 'spline' },   
            spline: { interpolation: { type: 'cardinal' } },		//  consider only: 'linear', 'cardinal' [default], 'monotone'
            grid: this._grid,
            axis: {	
                x: this._x,
                y: this._y,
                y2: this._y2
            },
            tooltip: { format: { value: d3.format(".3n") } },
            zoom: { enabled: false, type: 'scroll' },
            // zoom.type can be 'drag', but then tooltip does not show (https://github.com/c3js/c3/issues/2501)
            point: { show: true, r: 0,
              select: { r: 8 },      // select sensitivity radius
              focus: { expand: { r: 3, enabled: true } } 
            }
    };

    log("s","this._chartSpecs", this._chartSpecs);

    log("b","################################## SC ########################################","");
    log("b","this._SCname", this._SCname);
    log("b","this._path_Index", this._path_Index); 
    for (var x of this._paths) { log("b","this._paths[i]",x); }
    log("b","this._has$source", this._has$source); 
    for (var x of this._aggrSelectors) { log("b","this._aggrSelectors[i]",x); }
    log("b","this._rowsLegends", this._rowsLegends);
    log("b","this._pathTips", this._pathTips);
    log("b","this._axes", this._axes);
    log("b","this._y2Classes", this._y2Classes);  
    log("b","subscribePaths", subscribePaths);
    log("b","this._convTuples", this._convTuples);
    log("b","this._aggregators", this._aggregators);
    log("b","this._colorPalette", this._colorPalette);
    log("b","################################## END SC ########################################","");

    function collectValidPaths(zPath, iPth, pathsArray) { 
    //  Collect valid paths (stripped from source suffix) in subscribePaths global array, ignoring dupplicates.
    //  Also, prepares the stripChartsClass instance control blocks

      // separate source from path, if any
      if (zPath.path.indexOf("[")>0 && zPath.path.indexOf("]") > zPath.path.indexOf("[")) {
          zPath.$source = zPath.path.slice(zPath.path.indexOf("[")+1, zPath.path.indexOf("]"));
          zPath.path = zPath.path.slice(0,zPath.path.indexOf("["));
          this._has$source = "true";
      }
      else { zPath.$source = ""; }

      if (!zPath.axis || zPath.axis != "y2") {zPath.axis = "y";}    // "y" is default    
      
      if ( !zPath.path || (!zPath.AVG && !zPath.MAX && !zPath.MIN) || zPath.skip) {
        delete pathsArray[iPth];    // replace subscription element by null, will be removed later
        return;    
      }
      
      if (!subscribePaths.includes(zPath.path)) {    // global: do not subscribe twice to a path
        subscribePaths.push(zPath.path);
      }  

      // add property with pathname$source (dots replaced by "_") as property name and index as value
      if (zPath.$source == "") {
          this._path_Index[(zPath.path).replace(/\./g,"_")] = this._validPathsNbr;
      }
      else {
          this._path_Index[(zPath.path + "$" + zPath.$source.replace(/-/g,"_")).replace(/\./g,"_")] = this._validPathsNbr;
      }
      
      this._validPathsNbr++;
      if (zPath.axis == "y2") { this._y2PathsCount++; }

      // add specified legends to rowsLegends array and axis to rowsAxes, update aggrSelectors
      let aggrSpecs = {AVG: false, MAX: false, MIN: false};
      
      log("o", "zPath.axis", zPath.axis);
      log("o", "SCelem[zPath.axis].unit", SCelem[zPath.axis].unit);
      
      let tuple = [1, 0];
      if (SCelem[zPath.axis].unit == "Percent") {
        tuple[0] = 100 / (zPath.pc100 - zPath.pc0);
        tuple[1] = -100 * zPath.pc0 /(zPath.pc100 - zPath.pc0);
      }
      else {
        tuple[0] = getConvMultiplier(zPath.path, SCelem[zPath.axis].unit);
        tuple[1] = 0;
      }
      if (zPath.AVG) {   //  i.e. if AVG missing or AVG="" (everything without a "Value" is false, incl. "")
         aggrSpecs.AVG = true;
         fillCtlBlocks(this, zPath, tuple, zPath.AVG, "AVG");
         }
      else { aggrSpecs.AVG = false; 
        }
      if (zPath.MAX) {
         aggrSpecs.MAX = true;
         fillCtlBlocks(this, zPath, tuple, zPath.MAX, "MAX");
        } 
        else { aggrSpecs.MAX = false; }
      if (zPath.MIN) {
         aggrSpecs.MIN = true; 
         fillCtlBlocks(this, zPath, tuple, zPath.MIN, "MIN"); 
         } 
        else { aggrSpecs.MIN = false; }
      this._aggrSelectors.push(aggrSpecs);
      return;
    }
  function fillCtlBlocks(this1, zPath, tuple, x, fn) {
    this1._rowsLegends.push(x);
    if (pathTipOn) {
      if (this1._has$source) {
        this1._pathTips.push(fn + " " + zPath.path + "[" +zPath.$source + "]");
      }
      else {
        this1._pathTips.push(fn + " " + zPath.path);
      }
    }
    this1._axes[x] = zPath.axis;
    if (zPath.axis == "y2") { this1._y2Classes.push("c3-lines-" + x); }
    this1._convTuples.push(tuple);
    return;
  }
}


  name() {
    return this._SCname;
  }
  
  size() {
    if (this._SCname == "none") {
        return 0;
    }
    else {
        return this._chartSpecs.size.height;
    }
  }
  
  genChart(view) {
    this.view = view;
    this.setButtons(view);
      
    if (this._SCname == "none") { return; }
    
    if (typeof this._chartSpecs == "undefined") { alert(this._SCname + ": undefined chartSpecs!"); return; }  
    
    this._chartSpecs.bindto = "#" + view;
    this._chartSpecs.size.height = getChartHeight();
    
    if (this._rows.length < this._rowsMaxLength) {   // fill the rows array if not full yet
    				var row = [];
            var i;
            for (i = 0; i < this._rowsLegends.length; i++)  {
            row.push(0);
    				}
            for (i = this._rows.length; i < this._rowsMaxLength; i++) {
                this._rows.push(row);
            }
      }
      
    if (this._y2PathsCount == 0)  { // set empty place-holder y2 axis when no "y2" data to be charted
    this._chartSpecs.axis.y2 = { inner: true, show: true, label:{ position: 'outer-top', text: ' ' }, padding: {top:0, bottom:0},
          min: 0, max: 1.1, tick: { count: 1, values: [1.1], format: d3.format(',d') } };   // no tick values displayed
    }
  
    this._rows.unshift(this._rowsLegends);
    this._chartSpecs.data.rows = this._rows;
    
    this._chart = c3.generate(this._chartSpecs);      // <<<<<<<<<<<<    generate
    this._chartSpecs.data.rows.shift();    // always after generate (and load) in order to remove legends row
        
    // add "y2Plot" class to y2-related "c3-lines-XXX" of this view (see .y2Plot in stripCharts.css)
    // note: alternatively adding "y2Plot" class to y2-related "c3-target-XXX" does not work (!!!???) 
        // Note (not tested): could alternatively be done by setting additional data.classes in C3 specs, e.g.:
        //    data: { classes: { AWS: "yPlot", ... DEPTHmin: "y2Plot" }  }    (see C3js Reference)
        //  This will add c3-target-yPlot and c3-target-y2Plot classes in corresponding .c3-target-XXX elements.
        //  Modify StripCharts.css accordingly
        if (this._y2Classes.length > 0) {
          var x, y;
          for (x of this._y2Classes) {
              var elemList = document.getElementById(view).getElementsByClassName(x);
              for (y of elemList) { y.classList.add("y2Plot"); }
          }
        }

    // set or reset pauseLabel depending on ws status and pause status
    if  (wsWasOpen && ws.readyState == ws.CLOSED) {
        this.setPauseLabel("Disconnected on");
    } else if (chartPaused) {
        this.setPauseLabel("Paused on");
    } else {
        this.resetPauseLabel();
    }

    // creating pathTip events
    if (pathTipOn) {
        var thisView = document.getElementById(this.view);
        var tipDiv = document.createElement("div");
        tipDiv.className = "pathTip";
        thisView.appendChild(tipDiv);
        this._pathTips.forEach(createTipEvent, this);
    }

    function createTipEvent(tip, iTip) {
        let legendGItem = thisView.querySelectorAll("g.c3-legend-item-" + this._rowsLegends[iTip])[0];
        if (legendGItem) {
          legendGItem.onmouseover = function() {
            tipDiv.innerHTML = tip;
            tipDiv.style.visibility = "visible";
          }
          legendGItem.onmouseout = function() {tipDiv.style.visibility = "hidden";}
          return;
          }
    }
  }

  setButtons(view) {
        // make yCtl and y2Ctl buttons visible/hidden as applicable
        // Note: both hidden for "none"
        var select = {};  
        var yCtl = {};
        var y2Ctl = {};
        if (view == "upperView") {
            select = document.getElementById("selectUpper");
            yCtl = document.getElementById("yUpperCtl");
            y2Ctl = document.getElementById("y2UpperCtl");
        }
        else {
            select = document.getElementById("selectLower");
            yCtl = document.getElementById("yLowerCtl");
            y2Ctl = document.getElementById("y2LowerCtl");
        }
        select.value = this.name();
        if (this.name() == "none") {
            yCtl.style.visibility = "hidden";
            y2Ctl.style.visibility = "hidden";
        }
        else {
            yCtl.style.visibility = "visible";
            if (this._y2PathsCount > 0)  { 
              y2Ctl.style.visibility = "visible";
            }
            else {
                y2Ctl.style.visibility = "hidden";
            }
      }
  }

  
  pushPoint(point) {
        // point = {path_:"a_Path", $source_:"a_source", skTime:msec, value:aNumber}
        
        if (this._SCname == "none") { return; }

        this._lastPointTime = point.skTime;

        if (this._lastRowTime == 0) {
          // initialize _lastRowTime from first received point in order to generate 1st row after first 0.5 sec
          this._lastRowTime = point.skTime - this._avgInterval + 500;
        }
        //  if avgInterval ended, generate one row, add it to this._rows, init all (AVG/MAX/COUNT), set this._lastRowTime
        if ((point.skTime - this._lastRowTime) > this._avgInterval) {   // time to generate newRow
            let newRow = buildNewRow(this._aggregators, this._aggrSelectors, this._convTuples, this._lastRowTime);
            this._lastRowTime = this._lastRowTime + this._avgInterval;
            this._rowCount++;
            log("o","=====newRow " + this._rowCount + " @ " + formatxTick(this._rowCount, this._avgInterval), newRow);
            this._rowCountSinceRefresh++;
            if (this._rows.unshift(newRow) > this._rowsMaxLength) {this._rows.pop();} // unshift, and pop as needed
            for (var z of this._aggregators) { z.COUNT = 0 }
        }

        let pathIx;
        if (this._has$source) {
            pathIx = this._path_Index[point.path_+ "$" + point.$source_];  // first serve path with specified $source
            if (pathIx === undefined) { pathIx = this._path_Index[point.path_]; } // then path without $source
        }
        else { pathIx = this._path_Index[point.path_]; }

        if (pathIx === undefined) {return;}     // this SC is not interested in this path_
        
  	    avgMaxMin(this._aggregators[pathIx]);
        log("o","this._aggregators[" + pathIx + "]" , this._aggregators[pathIx]);

    function avgMaxMin(obj) {
      // compute obj.AVG, obj.MAX, obj.MIN
      obj.COUNT++;
      if (obj.COUNT == 1) {
          obj.AVG = point.value;
          obj.MAX = point.value;
          obj.MIN = point.value;
      }
      else {
          obj.AVG = (obj.AVG * (obj.COUNT-1) + point.value) / obj.COUNT;
          if (point.value > obj.MAX) { obj.MAX = point.value; }
          if (point.value < obj.MIN) { obj.MIN = point.value; }
      }
      // save last delta AVG, MAX, MIN and time for future hot-deck as needed
      obj.lastAVG = obj.AVG;
      obj.lastMAX = obj.MAX;
      obj.lastMIN = obj.MIN
      obj.lastStamp = point.skTime;
      return;
      }
      
    function buildNewRow (aggregators, aggrSelectors, convTuples, lastRowTime) {
          let row = [];
          let pushCount = 0;
          aggregators.forEach(function(z, iz) {
            log("o","aggregators[" + iz + "]", z);
            hotdeck(z);   // hotdeck as needed  (replace missing point aggregates with previous AVG, MAX, MIN)
    //      Now, build newRow as (e.g.):
    //      [z[0].AVG, z[1].MIN, z[1].MAX, z[2].AVG, z[3].MAX, z[3].MIN]
    //      AVG/MAX/MIN inserted or ignored depending on chosen options stored in aggrSelectors[]
            if (aggrSelectors[iz].AVG) { row.push(convertAny(z.AVG, convTuples[pushCount++])); }
            if (aggrSelectors[iz].MAX) { row.push(convertAny(z.MAX, convTuples[pushCount++])); }
            if (aggrSelectors[iz].MIN) { row.push(convertAny(z.MIN, convTuples[pushCount++])); }
          });
        return row;
        
        function hotdeck(obj) {
        // hotdeck: if no delta received: use recent data (lastxxx); if no recent data force 0
        // obj example:  SOG = {AVG:0, MAX:0, COUNT:0, lastAVG:0, lastMAX:0, lastStamp: 0};
          if (obj.lastStamp == 0 || obj.lastStamp >= lastRowTime) {return;}    // no hotdeck
          if ((lastRowTime - obj.lastStamp) < hotdeckSec*1000) {    // lastDelta not too old: hotdeck
            log("o", "hotdecked, AVG", obj.lastAVG );
            obj.AVG = obj.lastAVG;
            obj.MAX = obj.lastMAX;
            obj.MIN = obj.lastMIN;
          } 
          else {         // no obj data received for a long time (instrument or signalK down?)
            obj.AVG = 0;
            obj.MAX = 0;
            obj.MIN = 0;
          }
          return;
        }
    }   
  }
  
  chartLoad() {    // called by setTimeout(), setInterval() and flushWaitingRows()
           
        if (this._SCname == "none") { return; }
        
        if (typeof this._chart === "undefined" || this._rowCount == 0) { return; }
                              // this_chart was not generated or no data
        if  ( (this._rowCountSinceRefresh >= 1 ) &&           // at least one new row 
              (    this._rowCount <= 5                        // fast refresh at start
                || this._rowCountSinceRefresh >= this._intervalsPerRefresh  // normal rate
                || ws.readyState == ws.CLOSED                 // last refresh after ws closing
              )
            )
            {
              
              this._rows.unshift(this._rowsLegends);   // add legends
              this._chart.load({ rows: this._rows });
              this._rows.shift();  // remove legends
              this._rowCountSinceRefresh = 0;

      
            }
  }
  


  resizeChart(chartHeight) {
      
    if (this._SCname == "none") { return; }
    
    if (!chartHeight) {return;}
    this._chartHeight = chartHeight;
    this._chart.resize({height:chartHeight});
  }
  
  destrChart() {
      
    if (this._SCname == "none" || typeof this._chart == "undefined") { return; }
    
    // "If you have a ref to the chart make sure to call destroy as follows: chart = chart.destroy();"
    this._chart = this._chart.destroy();
    
    // hide yCtl and y2Ctl buttons
    
    if (this._chartSpecs.bindto == "#upperView") {
        document.getElementById("yUpperCtl").style.visibility = "hidden";
        document.getElementById("y2UpperCtl").style.visibility = "hidden";
    }
    else {
        document.getElementById("yLowerCtl").style.visibility = "hidden";
        document.getElementById("y2LowerCtl").style.visibility = "hidden";
    }
  }

  zoomIn(yORy2) {
    const zoomFactor = 1.5;
    let currentMin = this._chart.axis.min()[yORy2];
    let currentMax = this._chart.axis.max()[yORy2];
    if (yORy2 == "y") {
      this._chart.axis.range({ min:{y: currentMin/zoomFactor}, max:{y: currentMax/zoomFactor} });
    }
    else {
    this._chart.axis.range({ min:{y2: currentMin/zoomFactor}, max:{y2: currentMax/zoomFactor} });
    }
    return;
  }
  zoomOut(yORy2) {
    const zoomFactor = 1.5;
    let currentMin = this._chart.axis.min()[yORy2];
    let currentMax = this._chart.axis.max()[yORy2];
    if (yORy2 == "y") {
      this._chart.axis.range({ min:{y: currentMin*zoomFactor}, max:{y: currentMax*zoomFactor} });
    }
    else {
    this._chart.axis.range({ min:{y2: currentMin*zoomFactor}, max:{y2: currentMax*zoomFactor} });
    }
    return;
  }

  center(yORy2) {
    let currentMin = this._chart.axis.min()[yORy2];
    let currentMax = this._chart.axis.max()[yORy2];
    let currentMid = (currentMax + currentMin) / 2;  
    // compute newMid as average of y-related values of last row
    var iValue = 0;
    var newMid = 0;
    var count = 0;
    var z;
    for (z in this._axes) {
      if (this._axes[z] == yORy2) {   // only values related to yORy2 axis
        newMid += this._rows[0][iValue];
        count++;
      }
      iValue++;
    }
    newMid /= count;
    let delta =  Math.round(newMid - currentMid);   // (try to) keep integer ticks
    if (yORy2 == "y") {
      this._chart.axis.range({ min:{y: currentMin + delta}, max:{y: currentMax + delta} });
    }
    else {
    this._chart.axis.range({ min:{y2: currentMin + delta}, max:{y2: currentMax + delta} });
    }
    return;
  }
  
  reset(yORy2) {
    let initialMin = this._minInit[yORy2];
    let initialMax = this._maxInit[yORy2];
    if (yORy2 == "y") {
      this._chart.axis.range({ min:{y: initialMin}, max:{y: initialMax} });
    }
    else {
    this._chart.axis.range({ min:{y2: initialMin}, max:{y2: initialMax} });
    }
    return;
  }

  
  upDown(yORy2, dir) {   // Up if dir == +1, Down if dir == -1
    let currentMin = this._chart.axis.min()[yORy2];
    let currentMax = this._chart.axis.max()[yORy2];
    let range = currentMax - currentMin;
    if (yORy2 == "y") {
      if (this._y.tick && this._y.tick.count) {   // everything with a "value" is true
          var step = -dir * range / (this._y.tick.count - 1);    
        }
        else {
          var step = -dir * range / 10;
        } 
      this._chart.axis.range({ min:{y: currentMin + step}, max:{y: currentMax + step} });
    }
    else {
      if (this._y2.tick && this._y2.tick.count) {   // everything with a "value" is true
          var step = -dir * range / (this._y2.tick.count - 1);    
        }
        else {
          var step = -dir * range / 10;
        } 
      this._chart.axis.range({ min:{y2: currentMin + step}, max:{y2: currentMax + step} });

    }
      return;
  }

  setPauseLabel(prefix) {
      if (this.name() == "none") {return;}
      //let pauseText = "no text";
      let d = new Date(this._lastRowTime);
      let pauseText = prefix + " " + d.toUTCString() + " . . . . . ";
      this._chart.axis.labels({x: pauseText});
  }
  resetPauseLabel() {
    if (this.name() == "none") {return;}
    let label = this._xOriginalLabel; 
    this._chart.axis.labels({x: label});
  }

}   // end stripcharts-class constructor

function formatxTick(z, avgInterv) {  
  // depending on axis scale, time will be shown as (e.g.) 2d5h or 5h26m or 9m12s (also in tooltips)
  let msec = z * avgInterv; 
  let d = Math.floor(msec / 86400000);
  let rh = msec - d * 86400000;
  let h = Math.floor(rh / 3600000);
  let rm = rh - h * 3600000;
  let m = Math.floor(rm / 60000);
  let rs = rm - m * 60000;
  let s = Math.floor(rs / 1000);
  let rmsec = rs - s * 1000;
  // rounding up for last time unit displayed in string; eg "1d2h35m" will be displayed "1d3h"
  h = (d > 0 && m >= 30)? h++ : h;
  m = (h > 0 && s >= 30)? m++ : m;
  s = (rmsec >= 500)? s++ : s;  // rounding also seconds based on msec  
// initial version 
  return (  ""  + ((d > 0)? d + "d": "" )
    + ( (h > 0)? h + "h": "" )
    + ( (m > 0 && d < 1)? m + "m": "" )
    + ( (s > 0 && d < 1 && h < 1)? s + "s": "" )  // some overlap occurs in ticks labels when starting a chart
    );
// "culling" version when rows not fully filled at initialization
/*      let sec = msec / 1000;
  return (  ""  + ((d > 0)? d + "d": "" )
    + ( (h > 0)? h + "h": "" )
    + ( (d == 0 && m > 0)? m + "m": "" )
    + ( (sec > 0 && sec < 10)? s + "s": "" )     // note: tooltips title also affected
    + ( (sec >= 10  && sec < 40)? s + "" : "" ) // similar "culling" for "h", "m" desirable for large scale charts?
    + ( (sec >= 40 && sec < 3600 && s > 0)? s + "s": "" )			
    );
*/
}


