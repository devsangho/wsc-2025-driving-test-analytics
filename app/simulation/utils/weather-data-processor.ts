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
  { name: 'Coober Pedy', latitude: -29.0135, longitude: 134.7544 },
  { name: 'Alice Springs', latitude: -23.6980, longitude: 133.8807 },
  { name: 'Tennant Creek', latitude: -19.6472, longitude: 134.1933 },
  { name: 'Daly Waters', latitude: -16.2551, longitude: 133.3892 },
  { name: 'Katherine', latitude: -14.4520, longitude: 132.2699 },
  { name: 'Darwin', latitude: -12.4634, longitude: 130.8456 },
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
    // 파일명 정규화 (첫 글자를 대문자로, 나머지는 소문자로)
    const words = locationName.toLowerCase().split(' ');
    const capitalizedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1));
    const normalizedName = capitalizedWords.join(' ');
    const response = await fetch(`/weather/${normalizedName}.csv`);
    
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
 * 2025년과 같은 미래 날짜라면 월/일이 동일한 2023년 날짜를 반환
 */
function mapDateTo2023(dateStr: string): string {
  const date = new Date(dateStr);
  // 2023년이 아닌 경우, 같은 월/일의 2023년 데이터 사용
  if (date.getFullYear() !== 2023) {
    const month = date.getMonth();
    const day = date.getDate();
    const mappedDate = new Date(2023, month, day);
    return mappedDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
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
  // 2023년으로 날짜 매핑 (필요한 경우)
  const mappedDate = mapDateTo2023(date);
  // 원래 날짜와 다를 경우 로그 출력
  if (mappedDate !== date) {
    console.log(`Mapping date from ${date} to ${mappedDate} for weather data`);
  }

  // 해당 날짜의 데이터만 필터링
  let dayData = weatherData.filter(data => data.date === mappedDate);
  
  if (dayData.length === 0) {
    // 해당 날짜에 데이터가 없는 경우, 첫 번째 날짜의 데이터를 사용
    const availableDates = Array.from(new Set(weatherData.map(data => data.date))).sort();
    if (availableDates.length === 0) {
      throw new Error(`No weather data found at all`);
    }
    
    // 첫 번째 사용 가능한 날짜의 데이터 사용
    const firstAvailableDate = availableDates[0];
    console.log(`No data for ${mappedDate}, using data from ${firstAvailableDate} instead`);
    dayData = weatherData.filter(data => data.date === firstAvailableDate);
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
      // 첫 글자를 대문자로, 나머지는 소문자로 정규화
      const words = location.name.toLowerCase().split(' ');
      const capitalizedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1));
      const normalizedName = capitalizedWords.join(' ');
      const data = await loadWeatherData(normalizedName);
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
  // 첫 글자를 대문자로, 나머지는 소문자로 정규화
  const words = locationName.toLowerCase().split(' ');
  const capitalizedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1));
  const normalizedName = capitalizedWords.join(' ');
  const weatherData = await loadWeatherData(normalizedName);
  
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