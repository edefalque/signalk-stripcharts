/* This file contains unit conversions declaration and functions
 * for converting skUnit-based values to values in chart units.
 * All sk unit names are same as in the Signalk documentation, with spaces replaced by "_".
 * File also contains the units expected to be used on the charts, with default y and y2 axes specifications.
*/
const skUnits = [ 	    // not used so far
		"Kelvin", "Pascal", "Meter", "Radian", "Radian_per_second",  
		"Meters_per_second", "Hertz",  "Ratio", "Cubic_meter",
		"Cubic_meter_per_second", "Joule", "Coulomb", "Volt", "Ampere", "Watt"
	];
const chartUnits = {
//	Chart specs are validated against this list;
//    also includes default properties for y and y2 axes
//	  e.g. Angle_degree: { label: "Angle degrees", min: -180, max:180, tick: {count: 13, format: d3.format(".0f") }
//    Note: tick and format usually not required as c3 defaults are usually suitable
//    If tick not specified in chart specs, tick specified here (if any) is FULLY inherited (by reference)
	Meters_per_second: { label: "m/s", min: 0, max: 10, tick: {format: d3.format(".0f") } },	// , tick: { count: 6 }
	Knot: { label: "knots", min: 0, max: 20, tick: {format: d3.format(".0f") } },
	Kilometers_per_hour: { label: "km/h", min: 0, max: 40, tick: {format: d3.format(".0f") } },
	Miles_per_hour: { label: "m/h", min: 0, max: 30, tick: {format: d3.format(".0f") } },
	Direction_Degree: { label: "DIRECTION", min: 0, max: 360, tick: { count: 13, format: d3.format(".0f") } },
	Angle_Degree: { label: "ANGLE", min: -180, max: +180, tick: { count: 13, format: d3.format(".0f") } },
	Degree: { label: "degrees", min: 0, max: 360, tick: { count: 13, format: d3.format(".0f") } },
	Meter: { label: "meters", min: 0, max: 50, tick: {format: d3.format(".0f") } },
	Fathom: { label: "fathoms", min: 0, max: 30, tick: {format: d3.format(".0f") } },
	Foot: { label: "feet", min: 0, max: 150, tick: {format: d3.format(".0f") } },
	Revolutions_per_minute: { label: "RPM", min: 0, max: 3000, tick: {format: d3.format(".0f") } },
	Bar: { label: "bar", min: 0, max: 6, tick: {format: d3.format(".1f") } },				// for engine oil pressure etc
	Millibar: { label: "mbar", min: 950, max: 1070, tick: {format: d3.format(".0f") } },	// for the atmospheric pressure
	Pounds_per_square_inch: { label: "psi", min: 0, max: 100, tick: {format: d3.format(".0f") } },
	Celsius: { label: "°C", min: 0, max: 110, tick: {format: d3.format(".0f") } },
	Fahrenheit: { label: "°F", min: 32, max: 212, tick: {format: d3.format(".0f") } },

	Percent: { label: "%", min: 0, max: 110, tick: {format: d3.format(".0f") } }
	// Percent` usage is explained in the engine.js example

};
	
const path_skUnit  =   {   // note path property names obtained by replacing "." by "_"

	navigation_speedOverGround: "Meters_per_second",
	navigation_speedThroughWater: "Meters_per_second",
	navigation_courseOverGroundTrue: "Radian",
	navigation_courseOverGroundMagnetic: "Radian",
	navigation_headingTrue: "Radian",
	navigation_headingMagnetic: "Radian",
	navigation_leewayAngle: "Radian",

	performance_velocityMadeGood: "Meters_per_second",
	performance_polarSpeed: "Meters_per_second",
	performance_polarSpeedRatio: "Ratio",
	performance_beatAngle: "Radian",
	performance_beatAngleVelocityMadeGood: "Radian",
	performance_beatAngleTargetSpeed: "Meters_per_second",
	performance_gybeAngle: "Radian",
	performance_gybeAngleVelocityMadeGood: "Meters_per_second",
	performance_gybeAngleTargetSpeed: "Radian",

	environment_wind_speedApparent: "Meters_per_second",
	environment_wind_speedTrue: "Meters_per_second",   // over water
	environment_wind_speedOverGround: "Meters_per_second",
	environment_wind_directionTrue: "Radian",
	environment_wind_directionMagnetic: "Radian",
	environment_wind_angleApparent: "Radian",
	environment_wind_angleTrueWater: "Radian",
	environment_depth_belowTransducer: "Meter",
	environment_depth_belowKeel: "Meter",
	environment_depth_belowSurface: "Meter",
	environment_outside_temperature: "Kelvin",
	environment_water_temperature: "Kelvin",	
	environment_outside_pressure: "Pascal",
	
	propulsion_port_revolutions: "Hertz",
	propulsion_port_temperature: "Kelvin",
	propulsion_port_oilPressure: "Pascal",
	propulsion_port_coolantTemperature: "Kelvin",
	propulsion_starboard_exhaustTemperature: "Kelvin",
	
	propulsion_starboard_revolutions: "Hertz",
	propulsion_starboard_temperature: "Kelvin",
	propulsion_starboard_oilPressure: "Pascal",
	propulsion_starboard_coolantTemperature: "Kelvin",
	propulsion_starboard_exhaustTemperature: "Kelvin",
	}

const skUnitsConversion = {
	Meters_per_second2Knot: 1.943844,
	Meters_per_second2Kilometers_per_hour: 3.6,
	Meters_per_second2Miles_per_hour: 2.236936,
	Meter2Fathom: 0.546807,
	Meter2Foot: 3.28084,
	Radian2Degree: 57.29578,
	Radian2Direction_Degree: 57.29578,   // 0° to 360°
	Radian2Angle_Degree: 57.29578,       // -180° to +180°
	Radian_per_second2Degrees_per_second: 57.29578,
	Hertz2Revolutions_per_minute: 60,
	Pascal2Pounds_per_square_inch: 0.000145038,
	Pascal2Bar: 0.00001,
	Pascal2Millibar: 0.01,
	Kelvin2Fahrenheit: -2222,	// formula
	Kelvin2Celsius: -3333		// formula
	}

// function returns multiplier for simple "multiplicative" unit conversions or a formula selector (negative integer) for the other conversions
function getConvMultiplier (path, chartUnit) {
	let pathIdxVal = path.indexOf("[");
	if (pathIdxVal != -1) { path = path.slice(0,pathIdxVal); }  //strip "[$sourceDev]"
	let path_ = path.replace(/\./g,"_");  
	if ( chartUnit == path_skUnit[path_] ) { return 1; }
	let multiplier = 0;
	if (typeof 	path_skUnit[path_] !== "string") {alert("unit.js: undefined unit for: " + path_);}
	let convKey = path_skUnit[path_] + "2" + chartUnit;
	if (typeof skUnitsConversion[convKey] == "number")
		{ multiplier = skUnitsConversion[convKey]; }
	// else if (chartUnit == "Fahrenheit")  { multiplier = -2222; }  // negative value for special formula
	//// insert here new units with "non-multiplicative" conversion as needed
	else { console.log("Missing conversion factor/formula: " + convKey); }
	return multiplier;    // missing defaults to 0
}  
		
// Perform simple linear and formula-based conversions
function convertAny(value, tuple) {  // negative tuple[0] identifies special formulas
	let result = 0;	
	switch(tuple[0]) {
		case -1111:	// reserved for sign inversion (not used so far)
			result = -value;
			break;
		case -2222: 	// Kelvin to °F
			result = (value - 273.15) * 9/5 + 32; 
			break;
		case -3333: 	// Kelvin to °C
			result = value - 273.15; 
			break;
		default:
			 result = value * tuple[0] + tuple[1];
		}
	return result;
}	
  		
