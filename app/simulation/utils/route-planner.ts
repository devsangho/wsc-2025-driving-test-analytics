/**
 * 라우트 플래너 - 경로 계획 생성 및 관리
 */

import { loadTerrainData } from "./terrain-utils";
import { estimateRouteEnergyProduction } from "./weather-data-processor";
import { 
  ControlStop, 
  DailyItinerary, 
  RouteItinerary, 
  SimulationParameters 
} from "./route-planner-types";
import { RouteSegmentPlanner } from "./route-segment-planner";
import { calculateMorningCharge } from "./energy-calculator";

/**
 * 컨트롤 스탑 데이터 로드
 */
export async function loadControlStops(): Promise<ControlStop[]> {
  try {
    const response = await fetch("/control_stops.json");
    if (!response.ok) {
      throw new Error("Failed to load control stops data");
    }

    const data = await response.json();
    return data.control_stops as ControlStop[];
  } catch (error) {
    console.error("Error loading control stops:", error);
    throw error;
  }
}

/**
 * 경로 계획 생성 (컨트롤 스탑 및 배터리 충전 반영)
 * @param startDate 출발 일자
 * @param params 시뮬레이션 파라미터
 * @returns 경로 계획 결과
 */
export async function createRouteItinerary(
  startDate: string,
  totalDistance: number = 3022, // WSC 기본 거리
  averageSpeed: number = 80,
  drivingHoursPerDay: number = 8,
  energyEfficiency: number = 10, // 10 km/kWh
  panelArea: number = 4,
  panelEfficiency: number = 0.22,
  mpptEfficiency: number = 0.98,
  controlStopDuration: number = 0.5, // 기본 30분 정차
  lowBatteryThreshold: number = 25, // 배터리 임계값 (%)
  chargingTimeForLowBattery: number = 2, // 배터리 충전 시간 (시간)
  maxDays: number = 30, // 최대 시뮬레이션 일수 제한
  mass: number = 300, // 차량 질량 (kg)
  defaultSlope: number = 0, // 기본 경사도 (지형 데이터를 사용할 수 없을 때 사용)
  frontalArea: number = 0.95, // 전면적 (m^2)
  dragCoefficient: number = 0.14 // 공기저항계수
): Promise<RouteItinerary> {
  // 시뮬레이션 파라미터 설정
  const params: SimulationParameters = {
    startDate,
    totalDistance,
    averageSpeed, 
    drivingHoursPerDay,
    energyEfficiency,
    panelArea,
    panelEfficiency,
    mpptEfficiency,
    controlStopDuration,
    lowBatteryThreshold,
    chargingTimeForLowBattery,
    maxDays,
    mass,
    defaultSlope,
    frontalArea,
    dragCoefficient
  };
  
  // 필요한 데이터 로드
  const controlStops = await loadControlStops();
  const terrainData = await loadTerrainData();
  
  // 세그먼트 플래너 생성
  const segmentPlanner = new RouteSegmentPlanner();
  
  // 결과 초기화
  const dailyItinerary: DailyItinerary[] = [];
  
  // 초기 상태 설정
  let currentKm = 0;
  let remainingDistance = totalDistance;
  let batteryLevel = 100; // 배터리 잔량 (%, 100%로 시작)
  let currentDay = 0;
  const startDateObj = new Date(startDate);

  // 진행 상황 모니터링을 위한 변수
  let previousRemainingDistance = remainingDistance;
  let stuckCounter = 0;

  // 일일 계획 생성 루프
  while (remainingDistance > 0 && currentDay < maxDays) {
    // 현재 날짜 생성
    const currentDate = new Date(startDateObj);
    currentDate.setDate(startDateObj.getDate() + currentDay);
    const dateString = currentDate.toISOString().split("T")[0];
    currentDay++;

    // 하루 시작 시 배터리 잔량 저장
    const startBatteryLevel = batteryLevel;
    
    // 하루 세그먼트 계획 생성
    const dayPlan = await segmentPlanner.planDailySegments(
      dateString,
      currentKm,
      remainingDistance,
      batteryLevel,
      controlStops,
      terrainData,
      params
    );
    
    // 결과 업데이트
    if (dayPlan.segments.length > 0) {
      dailyItinerary.push({
        day: currentDay,
        date: dateString,
        segments: dayPlan.segments,
        startKm: dayPlan.segments[0].startKm,
        endKm: dayPlan.segments[dayPlan.segments.length - 1].endKm,
        totalDistance: dayPlan.totalDistance,
        energyProduction: 0, // 나중에 업데이트
        energyConsumption: dayPlan.dailyEnergyConsumption,
        startBatteryLevel: startBatteryLevel,
        endBatteryLevel: dayPlan.batteryLevel,
        totalChargingTime: dayPlan.dailyChargingTime,
        reachedMaxDays: currentDay >= maxDays
      });
      
      // 상태 업데이트
      currentKm = dayPlan.currentKm;
      remainingDistance = dayPlan.remainingDistance;
      batteryLevel = dayPlan.batteryLevel;
    } else {
      console.warn(`No segments created for day ${currentDay}, ending simulation`);
      break;
    }
    
    // 진행 상황 확인하여 무한 루프 감지
    if (Math.abs(remainingDistance - previousRemainingDistance) < 0.001) {
      stuckCounter++;
      if (stuckCounter >= 3) {
        console.error("No progress made in route planning for 3 consecutive days, aborting");
        break;
      }
    } else {
      stuckCounter = 0;
    }
    previousRemainingDistance = remainingDistance;
    
    // 다음날 아침 충전 적용
    if (remainingDistance > 0) {
      batteryLevel = await calculateMorningCharge(
        dateString,
        batteryLevel,
        panelArea,
        panelEfficiency,
        mpptEfficiency
      );
    }
    
    // 목표 거리에 도달했으면 시뮬레이션 종료
    if (currentKm >= totalDistance) {
      console.log(`Reached destination (${totalDistance}km), finishing simulation`);
      remainingDistance = 0;
      break;
    }
  }
  
  // 최대 일수 초과 시 경고 로그
  if (currentDay >= maxDays) {
    console.warn(`Route planning reached the maximum allowed days (${maxDays})`);
    
    // 마지막 날에 최대 일수 도달 표시
    if (dailyItinerary.length > 0) {
      const lastDay = dailyItinerary[dailyItinerary.length - 1];
      lastDay.reachedMaxDays = true;
    }
  }
  
  // 주행 거리가 0인 날 제거
  const filteredDailyItinerary = dailyItinerary.filter(day => day.totalDistance > 0);
  
  // 각 날짜별 태양광 발전량 계산
  const energyProductionPromises = filteredDailyItinerary.map(day => 
    estimateRouteEnergyProduction(
      day.date,
      8 / 24, // 주행 시간(8시간) 비율
      panelArea,
      panelEfficiency,
      mpptEfficiency
    )
  );
  
  const energyProductionResults = await Promise.all(energyProductionPromises);
  
  // 발전량 정보 업데이트
  for (let i = 0; i < filteredDailyItinerary.length; i++) {
    if (i < energyProductionResults.length) {
      const dayProduction = energyProductionResults[i].reduce(
        (sum, data) => sum + data.energyProduction,
        0
      ) * mpptEfficiency;
      
      filteredDailyItinerary[i].energyProduction = dayProduction;
    }
  }
  
  // 총계 계산
  const totalEnergyProduction = filteredDailyItinerary.reduce(
    (sum, day) => sum + day.energyProduction,
    0
  );
  
  const totalEnergyConsumption = filteredDailyItinerary.reduce(
    (sum, day) => sum + day.energyConsumption,
    0
  );
  
  const totalChargingHours = filteredDailyItinerary.reduce(
    (sum, day) => sum + day.totalChargingTime,
    0
  );
  
  // 평균 배터리 레벨 계산
  const dayEndBatteryLevels = filteredDailyItinerary.map(day => day.endBatteryLevel);
  const averageBatteryLevel = dayEndBatteryLevels.length > 0 ?
    dayEndBatteryLevels.reduce((sum, level) => sum + level, 0) / dayEndBatteryLevels.length : 0;
  
  // 예상 도착일
  const lastDayIndex = filteredDailyItinerary.length - 1;
  const estimatedArrivalDate = lastDayIndex >= 0 ?
    new Date(filteredDailyItinerary[lastDayIndex].date) : new Date();
  
  // 도착 예상 시간 (마지막 날의 마지막 세그먼트 종료 시간)
  let estimatedArrivalTime = "18:00:00"; // 기본값
  if (lastDayIndex >= 0 && filteredDailyItinerary[lastDayIndex].segments.length > 0) {
    const lastSegment = filteredDailyItinerary[lastDayIndex].segments[
      filteredDailyItinerary[lastDayIndex].segments.length - 1
    ];
    if (lastSegment.endTime) {
      estimatedArrivalTime = lastSegment.endTime;
    }
  }
  
  // 최종 결과 반환
  return {
    totalDays: filteredDailyItinerary.length,
    totalDistance,
    dailyItinerary: filteredDailyItinerary,
    controlStops,
    totalEnergyProduction,
    totalEnergyConsumption,
    estimatedArrivalDate,
    estimatedArrivalTime,
    totalChargingTime: totalChargingHours,
    averageBatteryLevel
  };
}

// 다음 함수들을 사용하기 쉽게 re-export
export { loadTerrainData } from './terrain-utils';
export type { DailyItinerary, RouteItinerary, RouteSegment, ControlStop } from './route-planner-types';
