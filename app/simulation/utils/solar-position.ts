/**
 * Solar position calculation utilities
 * Based on NOAA solar calculations: https://www.esrl.noaa.gov/gmd/grad/solcalc/
 */

import { LocationInfo } from './weather-data-processor';

export interface SolarPosition {
  azimuth: number;      // Solar azimuth angle (degrees from North, clockwise)
  elevation: number;    // Solar elevation angle (degrees from horizon)
  sunrise: number;      // Sunrise time (hour of day, 0-24)
  sunset: number;       // Sunset time (hour of day, 0-24)
  solarNoon: number;    // Solar noon time (hour of day, 0-24)
}

/**
 * Calculate solar position for a specific location, date and time
 * @param location Location information (latitude/longitude)
 * @param date Date for calculation
 * @param hour Hour of day (0-24)
 * @returns Solar position data
 */
export function calculateSolarPosition(
  location: LocationInfo,
  date: Date,
  hour: number = 12
): SolarPosition {
  // Convert dates to Julian day
  const julianDay = calculateJulianDay(date);
  
  // Calculate current time as decimal hours
  const time = hour;
  
  // Calculate solar position variables
  const { declination, equationOfTime } = calculateSolarVariables(julianDay);
  
  // Calculate sunrise, sunset and solar noon
  const sunrise = calculateSunriseTime(location.latitude, declination, equationOfTime, location.longitude);
  const sunset = calculateSunsetTime(location.latitude, declination, equationOfTime, location.longitude);
  const solarNoon = calculateSolarNoonTime(equationOfTime, location.longitude);
  
  // Calculate solar azimuth and elevation
  const hourAngle = calculateHourAngle(time, equationOfTime, location.longitude);
  const elevation = calculateSolarElevation(location.latitude, declination, hourAngle);
  const azimuth = calculateSolarAzimuth(hourAngle, location.latitude, declination, elevation);
  
  return {
    azimuth,
    elevation,
    sunrise,
    sunset,
    solarNoon
  };
}

/**
 * Calculate Julian day from date
 * @param date Date object
 * @returns Julian day
 */
function calculateJulianDay(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScript months are 0-based
  const day = date.getDate();
  
  const jd = 367 * year - Math.floor(7 * (year + Math.floor((month + 9) / 12)) / 4) - 
      Math.floor(3 * (Math.floor((year + (month - 9) / 7) / 100) + 1) / 4) + 
      Math.floor(275 * month / 9) + day + 1721028.5;
  
  return jd;
}

/**
 * Calculate solar declination and equation of time
 * @param julianDay Julian day number
 * @returns Object with declination and equationOfTime
 */
function calculateSolarVariables(julianDay: number): { declination: number, equationOfTime: number } {
  // Days since J2000.0 epoch
  const jc = (julianDay - 2451545) / 36525;
  
  // Mean obliquity of the ecliptic
  const epsilon = 23.439 - 0.0000004 * jc;
  
  // Mean solar longitude
  const meanLongitude = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360;
  
  // Mean anomaly of the Sun
  const meanAnomaly = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
  
  // Eccentricity of Earth's orbit
  const eccentricity = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);
  
  // Sun's equation of center
  const c = (1.914602 - jc * (0.004817 + 0.000014 * jc)) * Math.sin(toRadians(meanAnomaly)) +
      (0.019993 - 0.000101 * jc) * Math.sin(toRadians(2 * meanAnomaly)) +
      0.000289 * Math.sin(toRadians(3 * meanAnomaly));
  
  // Sun's true longitude
  const trueLongitude = meanLongitude + c;
  
  // Sun's apparent longitude
  const omega = 125.04 - 1934.136 * jc;
  const lambda = trueLongitude - 0.00569 - 0.00478 * Math.sin(toRadians(omega));
  
  // Solar declination
  const declination = toDegrees(Math.asin(Math.sin(toRadians(epsilon)) * Math.sin(toRadians(lambda))));
  
  // Equation of time (minutes)
  const y = Math.tan(toRadians(epsilon/2)) * Math.tan(toRadians(epsilon/2));
  const eqTime = 4 * toDegrees(
      y * Math.sin(2 * toRadians(meanLongitude)) -
      2 * eccentricity * Math.sin(toRadians(meanAnomaly)) +
      4 * eccentricity * y * Math.sin(toRadians(meanAnomaly)) * Math.cos(2 * toRadians(meanLongitude)) -
      0.5 * y * y * Math.sin(4 * toRadians(meanLongitude)) -
      1.25 * eccentricity * eccentricity * Math.sin(2 * toRadians(meanAnomaly))
  );
  
  return {
    declination,
    equationOfTime: eqTime
  };
}

/**
 * Calculate hour angle for given time
 * @param time Local time (hours, 0-24)
 * @param eqTime Equation of time (minutes)
 * @param longitude Location longitude (degrees)
 * @returns Hour angle (degrees)
 */
function calculateHourAngle(time: number, eqTime: number, longitude: number): number {
  // Hour angle = 15° per hour away from solar noon
  // Negative before solar noon, positive after solar noon
  const solarTime = time + eqTime/60 + longitude/15;
  return 15 * (solarTime - 12);
}

/**
 * Calculate solar elevation
 * @param latitude Location latitude (degrees)
 * @param declination Solar declination (degrees)
 * @param hourAngle Hour angle (degrees)
 * @returns Solar elevation (degrees)
 */
function calculateSolarElevation(latitude: number, declination: number, hourAngle: number): number {
  const elevation = toDegrees(
    Math.asin(
      Math.sin(toRadians(latitude)) * Math.sin(toRadians(declination)) +
      Math.cos(toRadians(latitude)) * Math.cos(toRadians(declination)) * Math.cos(toRadians(hourAngle))
    )
  );
  return elevation;
}

/**
 * Calculate solar azimuth
 * @param hourAngle Hour angle (degrees)
 * @param latitude Location latitude (degrees)
 * @param declination Solar declination (degrees)
 * @param elevation Solar elevation (degrees)
 * @returns Solar azimuth (degrees, clockwise from North)
 */
function calculateSolarAzimuth(hourAngle: number, latitude: number, declination: number, elevation: number): number {
  let azimuth = toDegrees(
    Math.acos(
      (Math.sin(toRadians(declination)) - Math.sin(toRadians(elevation)) * Math.sin(toRadians(latitude))) /
      (Math.cos(toRadians(elevation)) * Math.cos(toRadians(latitude)))
    )
  );
  
  // Correct azimuth based on hour angle
  if (hourAngle > 0) {
    azimuth = 360 - azimuth;
  }
  
  return azimuth;
}

/**
 * Calculate sunrise time
 * @param latitude Location latitude (degrees)
 * @param declination Solar declination (degrees)
 * @param eqTime Equation of time (minutes)
 * @param longitude Location longitude (degrees)
 * @returns Sunrise time (hours, 0-24)
 */
function calculateSunriseTime(latitude: number, declination: number, eqTime: number, longitude: number): number {
  // Calculate the hour angle at sunrise
  const hourAngleSunrise = toDegrees(
    Math.acos(
      -Math.tan(toRadians(latitude)) * Math.tan(toRadians(declination))
    )
  );
  
  // Convert to solar time
  return 12 - hourAngleSunrise/15 - eqTime/60 - longitude/15;
}

/**
 * Calculate sunset time
 * @param latitude Location latitude (degrees)
 * @param declination Solar declination (degrees)
 * @param eqTime Equation of time (minutes)
 * @param longitude Location longitude (degrees)
 * @returns Sunset time (hours, 0-24)
 */
function calculateSunsetTime(latitude: number, declination: number, eqTime: number, longitude: number): number {
  // Calculate the hour angle at sunset
  const hourAngleSunset = toDegrees(
    Math.acos(
      -Math.tan(toRadians(latitude)) * Math.tan(toRadians(declination))
    )
  );
  
  // Convert to solar time
  return 12 + hourAngleSunset/15 - eqTime/60 - longitude/15;
}

/**
 * Calculate solar noon time
 * @param eqTime Equation of time (minutes)
 * @param longitude Location longitude (degrees)
 * @returns Solar noon time (hours, 0-24)
 */
function calculateSolarNoonTime(eqTime: number, longitude: number): number {
  // Solar noon occurs when the sun is highest in the sky
  return 12 - eqTime/60 - longitude/15;
}

/**
 * Convert degrees to radians
 * @param degrees Angle in degrees
 * @returns Angle in radians
 */
function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * Convert radians to degrees
 * @param radians Angle in radians
 * @returns Angle in degrees
 */
function toDegrees(radians: number): number {
  return radians * 180 / Math.PI;
} 