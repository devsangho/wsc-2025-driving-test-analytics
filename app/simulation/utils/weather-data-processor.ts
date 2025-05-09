import { parse } from 'papaparse';

export interface WeatherData {
  date: string;
  time: string;
  air_temp: number;
  ghi: number; // Global Horizontal Irradiance (W/m²)
  dni: number; // Direct Normal Irradiance (W/m²)
  dhi: number; // Diffuse Horizontal Irradiance (W/m²)
  gti: number; // Global Tilted Irradiance (W/m²) - panel에 도달하는 total
  wind_speed_10m: number; // Wind speed at 10m (m/s)
  zenith: number; // Solar zenith angle (degrees)
  azimuth: number; // Solar azimuth angle (degrees)
}

export interface LocationInfo {
  name: string;
  latitude: number;
  longitude: number;
}

export interface SolarEnergyData {
  date: string;
  hourlyData: {
    time: string;
    irradiance: number; // W/m²
    temperature: number; // °C
    energy: number; // Wh/m²
  }[];
  totalEnergy: number; // kWh/m²
}

// WSC 경로의 주요 지점들 정보 (위도, 경도)
export const WSC_LOCATIONS: LocationInfo[] = [
  { name: 'Adelaide', latitude: -34.9285, longitude: 138.6007 },
  { name: 'Coober pedy', latitude: -29.0135, longitude: 134.7544 },
  { name: 'Alice springs', latitude: -23.6980, longitude: 133.8807 },
  { name: 'Tennant creek', latitude: -19.6472, longitude: 134.1933 },
  { name: 'Daly waters', latitude: -16.2551, longitude: 133.3892 },
  { name: 'Katherine', latitude: -14.4520, longitude: 132.2699 },
  { name: 'Darwin', latitude: -12.4634, longitude: 130.8456 },
  { name: 'Batchelor', latitude: -13.0455, longitude: 131.0283 },
  { name: 'Woomera prohibited area', latitude: -30.9487, longitude: 136.5417 },
  { name: 'Newcastle waters', latitude: -17.3792, longitude: 133.4075 },
];

/**
 * 지역별 위치 정보 반환
 */
export function getLocationByName(name: string): LocationInfo | undefined {
  return WSC_LOCATIONS.find(location => 
    location.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * 지역 날씨 데이터 파일 로드
 */
export async function loadWeatherData(locationName: string): Promise<WeatherData[]> {
  try {
    // 파일명 정규화 없이 그대로 사용 (대소문자 유지)
    const response = await fetch(`/weather/${locationName}.csv`);
    
    if (!response.ok) {
      throw new Error(`Failed to load weather data for ${locationName}`);
    }
    
    const csvText = await response.text();
    const { data } = parse<WeatherData>(csvText, { 
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    
    return data;
  } catch (error) {
    console.error(`Error loading weather data for ${locationName}:`, error);
    throw error;
  }
}

/**
 * 입력된 날짜에 대한 2023년 데이터 찾기
 * 2025년과 같은 미래 날짜라면 8/24 기준으로 날짜 매핑
 */
function mapDateTo2023(dateStr: string): string {
  const date = new Date(dateStr);
  // 입력 날짜가 2023년이 아닌 경우 매핑
  if (date.getFullYear() !== 2023) {
    // 기준일: 2023-08-24
    const referenceDate = new Date("2023-08-24");
    
    // 입력된 날짜와 기준일(원하는 출발일) 사이의 날짜 차이 계산
    const inputDate = new Date(dateStr);
    const yearStart = new Date(inputDate.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((inputDate.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000));
    
    const referenceYear = referenceDate.getFullYear();
    const referenceYearStart = new Date(referenceYear, 0, 1);
    const referenceDayOfYear = Math.floor((referenceDate.getTime() - referenceYearStart.getTime()) / (24 * 60 * 60 * 1000));
    
    // 날짜 차이를 기준일에 더함
    const daysDiff = dayOfYear - referenceDayOfYear;
    const mappedDate = new Date(referenceDate);
    mappedDate.setDate(referenceDate.getDate() + daysDiff);
    
    // 결과 반환
    return mappedDate.toISOString().split('T')[0];
  }
  return dateStr;
}

/**
 * 패널 효율을 고려하여 특정 날짜의 태양광 에너지 발전량 계산
 */
export function calculateSolarEnergy(
  weatherData: WeatherData[],
  date: string,
  panelArea: number,
  panelEfficiency: number,
  mpptEfficiency: number,
  temperature: number = 25 // 기본 온도 (°C)
): SolarEnergyData {
  // 2023년 8월 24일 기준으로 날짜 매핑
  const mappedDate = mapDateTo2023(date);
  // 원래 날짜와 다를 경우 로그 출력
  if (mappedDate !== date) {
    console.log(`Mapping date from ${date} to ${mappedDate} for weather data (8월 24일 기준)`);
  }

  // 해당 날짜의 데이터만 필터링
  let dayData = weatherData.filter(data => data.date === mappedDate);
  
  if (dayData.length === 0) {
    // 사용 가능한 날짜 리스트 가져오기
    const availableDates = Array.from(new Set(weatherData.map(data => data.date))).sort();
    if (availableDates.length === 0) {
      throw new Error(`No weather data found at all`);
    }
    
    // 매핑된 날짜와 가장 가까운 날짜 찾기
    const mappedDateObj = new Date(mappedDate);
    let closestDate = availableDates[0];
    let minDiff = Math.abs(new Date(closestDate).getTime() - mappedDateObj.getTime());
    
    for (const dateStr of availableDates) {
      const diff = Math.abs(new Date(dateStr).getTime() - mappedDateObj.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closestDate = dateStr;
      }
    }
    
    console.log(`No data for ${mappedDate}, using closest available date: ${closestDate}`);
    dayData = weatherData.filter(data => data.date === closestDate);
  }
  
  // 시간별 데이터 처리
  const hourlyData = dayData.map(data => {
    // 온도에 따른 효율 보정 (일반적으로 25°C 기준, 1°C 상승마다 0.4% 효율 감소)
    const temperatureCorrection = 1 - 0.004 * Math.max(0, data.air_temp - temperature);
    
    // 패널에 도달하는 실제 조사량(GTI)에 효율을 곱해 발전량 계산
    // GTI: Global Tilted Irradiance - 패널 표면에 도달하는 총 태양 복사량
    const actualIrradiance = data.gti || 0; // gti 값이 없으면 0으로 처리
    
    // 10분 간격이므로 1/6시간(=10분) 동안의 에너지 계산
    const energyPerHour = actualIrradiance * panelArea * panelEfficiency * mpptEfficiency * temperatureCorrection;
    const energyPerInterval = energyPerHour / 6; // 10분(1/6시간) 동안의 에너지 (Wh)
    
    return {
      time: data.time,
      irradiance: actualIrradiance,
      temperature: data.air_temp,
      energy: energyPerInterval,
    };
  });
  
  // 총 에너지 계산 (kWh)
  const totalEnergy = hourlyData.reduce((sum, data) => sum + data.energy, 0) / 1000;
  
  return {
    date,  // 원래 요청한 날짜 사용
    hourlyData,
    totalEnergy,
  };
}

/**
 * WSC 전체 경로에 대한 날짜별 태양광 발전량 추정
 * 각 주요 지점의 날씨 데이터를 기반으로 보간하여 계산
 */
export async function estimateRouteEnergyProduction(
  startDate: string,
  days: number,
  panelArea: number,
  panelEfficiency: number,
  mpptEfficiency: number
): Promise<{date: string, energyProduction: number}[]> {
  try {
    // 모든 주요 지점의 날씨 데이터 로드
    const locationDataPromises = WSC_LOCATIONS.map(async location => {
      // 위치 이름을 파일명으로 그대로 사용
      const data = await loadWeatherData(location.name);
      return { location, data };
    });
    
    const locationsData = await Promise.all(locationDataPromises);
    
    // 날짜 계산
    const result: {date: string, energyProduction: number}[] = [];
    const startDateObj = new Date(startDate);
    
    // 요청한 모든 날짜에 대한 처리
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDateObj);
      currentDate.setDate(startDateObj.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0]; // 'YYYY-MM-DD' 형식
      
      // 각 지점별 에너지 생산량 계산
      const locationsEnergy = locationsData.map(({ location, data }) => {
        try {
          const energyData = calculateSolarEnergy(
            data, 
            dateString, 
            panelArea, 
            panelEfficiency, 
            mpptEfficiency
          );
          return energyData.totalEnergy;
        } catch {
          // 데이터가 없는 경우 0으로 처리
          console.warn(`No data for ${location.name} on ${dateString}`);
          return 0;
        }
      });
      
      // 전체 지점의 평균 에너지 생산량 계산 (kWh)
      const validEnergies = locationsEnergy.filter(e => e > 0);
      const averageEnergy = validEnergies.length > 0 
        ? validEnergies.reduce((sum, e) => sum + e, 0) / validEnergies.length
        : 0;
      
      result.push({
        date: dateString, // 원래 요청한 날짜 유지
        energyProduction: averageEnergy,
      });
    }
    
    return result;
  } catch (err) {
    console.error('Error estimating route energy production:', err);
    throw err;
  }
}

/**
 * 특정 날짜의 위치별 태양광 발전량 계산
 */
export async function getLocationEnergyForDate(
  date: string,
  locationName: string,
  panelArea: number,
  panelEfficiency: number,
  mpptEfficiency: number
): Promise<SolarEnergyData> {
  // 위치 이름을 파일명으로 그대로 사용
  const weatherData = await loadWeatherData(locationName);
  
  return calculateSolarEnergy(
    weatherData,
    date,
    panelArea,
    panelEfficiency,
    mpptEfficiency
  );
}

// 아래 함수들은 향후 확장을 위해 보존됨

/**
 * 위치 사이의 거리 계산 (km, Haversine 공식 사용)
 * @param lat1 첫 번째 위치의 위도
 * @param lon1 첫 번째 위치의 경도
 * @param lat2 두 번째 위치의 위도
 * @param lon2 두 번째 위치의 경도
 * @returns 두 위치 사이의 거리 (km)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * 각도를 라디안으로 변환
 */
function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
} 