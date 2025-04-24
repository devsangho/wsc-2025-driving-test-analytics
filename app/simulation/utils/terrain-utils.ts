/**
 * 지형 정보 처리 및 경사도 계산 유틸리티
 */

// 지형 데이터 타입 정의
export interface TerrainPoint {
  latitude: number;
  longitude: number;
  elevation: number;
  city: string;
  weather_loc: string;
  distance_km: number;
  difference_km: number;
}

// CSV 데이터 파싱
export async function loadTerrainData(): Promise<TerrainPoint[]> {
  try {
    const response = await fetch('/map.csv');
    const text = await response.text();
    
    // CSV 파싱
    const lines = text.split('\n');
    const headers = lines[0].split(',');
    
    const data: TerrainPoint[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',');
      
      if (values.length === headers.length) {
        data.push({
          latitude: parseFloat(values[0]),
          longitude: parseFloat(values[1]),
          elevation: parseFloat(values[2]),
          city: values[3],
          weather_loc: values[4],
          distance_km: parseFloat(values[5]),
          difference_km: parseFloat(values[6])
        });
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error loading terrain data:', error);
    throw error;
  }
}

/**
 * 특정 거리 지점의 경사도 계산
 * @param terrainData 지형 데이터 배열
 * @param distanceKm 현재 거리 (km)
 * @param sampleDistance 기울기를 계산할 구간 거리 (km)
 * @param defaultSlope 지형 데이터가 없거나 계산할 수 없을 때 사용할 기본 경사도 (%)
 * @returns 해당 지점의 경사도 (%)
 */
export function calculateSlope(
  terrainData: TerrainPoint[],
  distanceKm: number,
  sampleDistance: number = 1.0,
  defaultSlope: number = 0
): number {
  if (!terrainData || terrainData.length === 0) {
    return defaultSlope; // 기본값
  }
  
  // 현재 위치에 가장 가까운 지점 찾기
  let currentIndex = 0;
  let minDistance = Math.abs(terrainData[0].distance_km - distanceKm);
  
  for (let i = 1; i < terrainData.length; i++) {
    const distance = Math.abs(terrainData[i].distance_km - distanceKm);
    if (distance < minDistance) {
      minDistance = distance;
      currentIndex = i;
    }
  }
  
  // 현재 지점 기준으로 샘플 거리만큼 앞의 지점 찾기
  let forwardIndex = currentIndex;
  while (
    forwardIndex < terrainData.length - 1 && 
    terrainData[forwardIndex].distance_km - terrainData[currentIndex].distance_km < sampleDistance
  ) {
    forwardIndex++;
  }
  
  // 경사도 계산
  if (forwardIndex > currentIndex) {
    const elevationDiff = terrainData[forwardIndex].elevation - terrainData[currentIndex].elevation;
    const distanceDiff = terrainData[forwardIndex].distance_km - terrainData[currentIndex].distance_km;
    
    if (distanceDiff > 0) {
      // 경사도 = 높이 차이 / 거리 차이 * 100 (%)
      return (elevationDiff / (distanceDiff * 1000)) * 100;
    }
  }
  
  // 앞으로의 구간이 없거나 계산할 수 없는 경우, 이전 구간으로 계산
  if (currentIndex > 0) {
    const elevationDiff = terrainData[currentIndex].elevation - terrainData[currentIndex - 1].elevation;
    const distanceDiff = terrainData[currentIndex].distance_km - terrainData[currentIndex - 1].distance_km;
    
    if (distanceDiff > 0) {
      return (elevationDiff / (distanceDiff * 1000)) * 100;
    }
  }
  
  // 모든 계산이 불가능한 경우 기본값 반환
  return defaultSlope;
}

/**
 * 구간 경사도 계산
 * @param terrainData 지형 데이터 배열
 * @param startDistance 시작 거리 (km)
 * @param endDistance 종료 거리 (km)
 * @returns 해당 구간의 평균 경사도 (%)
 */
export function calculateSegmentSlope(
  terrainData: TerrainPoint[],
  startDistance: number,
  endDistance: number
): number {
  if (!terrainData || terrainData.length === 0 || startDistance >= endDistance) {
    return 0;
  }
  
  // 시작점과 끝점에 해당하는 지형 데이터 찾기
  let startPoint: TerrainPoint | null = null;
  let endPoint: TerrainPoint | null = null;
  
  let startDiff = Number.MAX_VALUE;
  let endDiff = Number.MAX_VALUE;
  
  for (const point of terrainData) {
    const diffStart = Math.abs(point.distance_km - startDistance);
    const diffEnd = Math.abs(point.distance_km - endDistance);
    
    if (diffStart < startDiff) {
      startDiff = diffStart;
      startPoint = point;
    }
    
    if (diffEnd < endDiff) {
      endDiff = diffEnd;
      endPoint = point;
    }
  }
  
  if (startPoint && endPoint) {
    const elevationDiff = endPoint.elevation - startPoint.elevation;
    const distanceDiff = endPoint.distance_km - startPoint.distance_km;
    
    if (distanceDiff > 0) {
      // 경사도 = 높이 차이 / 거리 차이 * 100 (%)
      return (elevationDiff / (distanceDiff * 1000)) * 100;
    }
  }
  
  return 0;
} 