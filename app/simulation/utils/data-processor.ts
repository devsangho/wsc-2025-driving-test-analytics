import { parse } from 'papaparse';

export interface SimulationDataPoint {
  timestamp: Date;
  mpptInputVoltage: number;
  mpptInputCurrent: number;
  mpptOutputVoltage: number;
  mpptOutputCurrent: number;
  irradiance: number;
  xTilt: number;
  yTilt: number;
  temperature: number;
}

export interface ProcessedDataSegment {
  startTimestamp: Date;
  endTimestamp: Date;
  durationSeconds: number;
  averageIrradiance: number;
  averagePower: number;
  energyGenerated: number; // in Wh
  distanceTraveled: number; // in km
}

export interface SimulationResults {
  dailySegments: {
    date: string;
    segments: ProcessedDataSegment[];
    totalEnergyGenerated: number; // in kWh
    totalDistanceTraveled: number; // in km
  }[];
  totalDays: number;
  totalDistanceTraveled: number; // in km
  averageDistancePerDay: number; // in km
  remainingCharge: number; // in percent
  estimatedArrivalDate: Date;
}

interface CSVRow {
  Timestamp: string;
  MPPT1_InputVoltage: number;
  MPPT1_InputCurrent: number;
  MPPT1_OutputVoltage: number;
  MPPT1_OutputCurrent: number;
  MS60S_CompensatedIrradiance: number;
  MS60S_XTilt: number;
  MS60S_YTilt: number;
  MS60S_InternalTemp: number;
  [key: string]: string | number | undefined;
}

/**
 * Processes CSV data from the solar car readings
 * @param csvData Raw CSV data as string
 * @param segmentDurationSeconds Duration of each segment in seconds (default: 10)
 */
export async function processCSVData(
  csvData: string,
  segmentDurationSeconds: number = 10,
  batteryCapacityKWh: number = 20,
  avgSpeedKmh: number = 80
): Promise<SimulationResults> {
  // Parse CSV data
  const { data } = parse<CSVRow>(csvData, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  // Convert to strongly typed data points
  const dataPoints: SimulationDataPoint[] = data.map((row) => ({
    timestamp: new Date(row.Timestamp),
    mpptInputVoltage: Number(row.MPPT1_InputVoltage || 0),
    mpptInputCurrent: Number(row.MPPT1_InputCurrent || 0),
    mpptOutputVoltage: Number(row.MPPT1_OutputVoltage || 0),
    mpptOutputCurrent: Number(row.MPPT1_OutputCurrent || 0),
    irradiance: Number(row.MS60S_CompensatedIrradiance || 0),
    xTilt: Number(row.MS60S_XTilt || 0),
    yTilt: Number(row.MS60S_YTilt || 0),
    temperature: Number(row.MS60S_InternalTemp || 0),
  }));

  // Sort data by timestamp
  dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Group data into segments of specified duration
  const segments: ProcessedDataSegment[] = [];
  let segmentStart = dataPoints[0].timestamp;
  let segmentEnd = new Date(segmentStart.getTime() + segmentDurationSeconds * 1000);
  
  let currentSegmentPoints: SimulationDataPoint[] = [];
  
  for (const point of dataPoints) {
    if (point.timestamp <= segmentEnd) {
      currentSegmentPoints.push(point);
    } else {
      if (currentSegmentPoints.length > 0) {
        segments.push(processSegment(currentSegmentPoints, segmentStart, segmentEnd, avgSpeedKmh));
      }
      
      // Start a new segment
      segmentStart = segmentEnd;
      segmentEnd = new Date(segmentStart.getTime() + segmentDurationSeconds * 1000);
      currentSegmentPoints = [point];
    }
  }
  
  // Add the last segment if there are points
  if (currentSegmentPoints.length > 0) {
    segments.push(processSegment(currentSegmentPoints, segmentStart, segmentEnd, avgSpeedKmh));
  }

  // Group segments by day
  const dailySegments = groupSegmentsByDay(segments);
  
  // Calculate simulation results
  const totalDistanceTraveled = dailySegments.reduce(
    (sum, day) => sum + day.totalDistanceTraveled, 
    0
  );
  
  const totalEnergyGenerated = dailySegments.reduce(
    (sum, day) => sum + day.totalEnergyGenerated, 
    0
  );
  
  // Calculate energy requirements for the distance
  const energyRequirementKmPerKWh = 5; // km per kWh, adjust based on vehicle efficiency
  const totalEnergyRequired = totalDistanceTraveled / energyRequirementKmPerKWh;
  
  // Calculate remaining charge
  const batteryUsedPercent = Math.max(0, Math.min(100, 
    ((totalEnergyRequired - totalEnergyGenerated) / batteryCapacityKWh) * 100
  ));
  const remainingCharge = Math.max(0, 100 - batteryUsedPercent);
  
  // Calculate estimated arrival
  const averageDistancePerDay = totalDistanceTraveled / dailySegments.length;
  const totalRaceDistanceKm = 3022; // World Solar Challenge distance
  const daysRequired = Math.ceil(totalRaceDistanceKm / averageDistancePerDay);
  
  // Calculate arrival date
  const startDate = new Date(dataPoints[0].timestamp);
  const estimatedArrivalDate = new Date(startDate);
  estimatedArrivalDate.setDate(startDate.getDate() + daysRequired);

  return {
    dailySegments,
    totalDays: daysRequired,
    totalDistanceTraveled,
    averageDistancePerDay,
    remainingCharge,
    estimatedArrivalDate,
  };
}

/**
 * Process a segment of data points
 */
function processSegment(
  points: SimulationDataPoint[], 
  startTime: Date, 
  endTime: Date,
  avgSpeedKmh: number
): ProcessedDataSegment {
  const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
  
  // Calculate average irradiance
  const averageIrradiance = points.reduce((sum, point) => sum + point.irradiance, 0) / points.length;
  
  // Calculate average power (voltage * current)
  const powers = points.map(point => Math.max(0, point.mpptInputVoltage * point.mpptInputCurrent));
  const averagePower = powers.reduce((sum, power) => sum + power, 0) / powers.length;
  
  // Calculate energy generated in this segment (in Wh)
  const energyGenerated = (averagePower * durationSeconds) / 3600;
  
  // Calculate distance traveled based on average speed (in km)
  const distanceTraveled = (avgSpeedKmh * durationSeconds) / 3600;

  return {
    startTimestamp: startTime,
    endTimestamp: endTime,
    durationSeconds,
    averageIrradiance,
    averagePower,
    energyGenerated,
    distanceTraveled,
  };
}

/**
 * Groups segments by day
 */
function groupSegmentsByDay(segments: ProcessedDataSegment[]) {
  const dailySegments: {
    date: string;
    segments: ProcessedDataSegment[];
    totalEnergyGenerated: number;
    totalDistanceTraveled: number;
  }[] = [];
  
  // Group by day
  const segmentsByDay = new Map<string, ProcessedDataSegment[]>();
  
  for (const segment of segments) {
    const date = segment.startTimestamp.toISOString().split('T')[0];
    if (!segmentsByDay.has(date)) {
      segmentsByDay.set(date, []);
    }
    segmentsByDay.get(date)!.push(segment);
  }
  
  // Calculate totals for each day
  for (const [date, daySegments] of segmentsByDay.entries()) {
    const totalEnergyGenerated = daySegments.reduce(
      (sum, segment) => sum + segment.energyGenerated, 
      0
    ) / 1000; // Convert to kWh
    
    const totalDistanceTraveled = daySegments.reduce(
      (sum, segment) => sum + segment.distanceTraveled, 
      0
    );
    
    dailySegments.push({
      date,
      segments: daySegments,
      totalEnergyGenerated,
      totalDistanceTraveled,
    });
  }
  
  // Sort by date
  dailySegments.sort((a, b) => a.date.localeCompare(b.date));
  
  return dailySegments;
}

/**
 * Loads the CSV data from a URL
 */
export async function loadCSVFromURL(url: string): Promise<string> {
  const response = await fetch(url);
  return await response.text();
}

/**
 * Gets the CSV data URL
 */
export function getCSVDataURL(fileName: string): string {
  return `/api/csv?file=${fileName}`;
} 