/**
 * 라우트 세그먼트 플래너 - 일일 경로 세그먼트 계획 및 배터리 관리
 */

import { ControlStop, RouteSegment, SimulationParameters } from "./route-planner-types";
import { 
  calculateSegmentEnergyConsumption, 
  calculateSegmentEnergyProduction,
  updateBatteryLevel
} from "./energy-calculator";
import { TerrainPoint } from "./terrain-utils";

// 배터리 용량 상수 (가정)
const BATTERY_CAPACITY = 5.0; // kWh

/**
 * 일일 세그먼트 계획 결과 인터페이스
 */
interface DailySegmentPlanResult {
  segments: RouteSegment[];
  currentKm: number;
  remainingDistance: number;
  batteryLevel: number;
  totalDistance: number;
  dailyEnergyConsumption: number;
  dailyChargingTime: number;
}

/**
 * 경로 세그먼트 플래너 클래스
 * 일일 경로 세그먼트 및 배터리 관리 로직을 담당
 */
export class RouteSegmentPlanner {
  /**
   * 하루의 경로 세그먼트 및 배터리 관리 계획 생성
   */
  async planDailySegments(
    dateString: string,
    currentKm: number,
    remainingDistance: number,
    batteryLevel: number,
    controlStops: ControlStop[],
    terrainData: TerrainPoint[],
    params: SimulationParameters
  ): Promise<DailySegmentPlanResult> {
    // 결과 초기화
    const segments: RouteSegment[] = [];
    let totalDistance = 0;
    let dailyEnergyConsumption = 0;
    let dailyChargingTime = 0;
    
    // 하루 주행을 위한 변수 (아침 10시 시작)
    let remainingDrivingHours = params.drivingHoursPerDay;
    let currentBatteryLevel = batteryLevel;
    let currentPosition = currentKm;
    let dayCompleted = false;
    let currentTime = 10.0; // 10:00 AM 시작
    
    // 컨트롤 스탑 필터링 (현재 위치 이후의 스탑만)
    let upcomingControlStops = controlStops.filter(
      stop => stop.distance > currentPosition
    ).sort((a, b) => a.distance - b.distance);
    
    // 하루 주행 계획 루프
    while (remainingDrivingHours > 0 && !dayCompleted && remainingDistance > 0) {
      // 다음 컨트롤 스탑 결정
      const nextControlStop = upcomingControlStops.length > 0 ? upcomingControlStops[0] : null;
      const distanceToNextStop = nextControlStop ? nextControlStop.distance - currentPosition : Infinity;
      
      // 세그먼트 거리 계산 
      // 1. 다음 컨트롤 스탑까지 거리
      // 2. 배터리 부족 예상 지점까지 거리 
      // 3. 남은 주행 시간으로 갈 수 있는 거리
      // 4. 도착점까지 남은 거리
      // 위 중 가장 작은 값을 선택
      const maxSegmentDistance = params.averageSpeed * remainingDrivingHours;
      
      // 현재 배터리로 갈 수 있는 최대 거리 계산
      // 25% 이하로 떨어지기 전까지 주행 가능한 거리 계산
      const energyPerKm = 1 / params.energyEfficiency; // kWh/km
      const batteryEnergyAvailable = (currentBatteryLevel - params.lowBatteryThreshold) / 100 * BATTERY_CAPACITY;
      const maxBatteryDistance = batteryEnergyAvailable / energyPerKm;
      
      // 세그먼트 거리 결정 (가장 제한적인 요소 선택)
      const segmentDistance = Math.min(
        distanceToNextStop,
        maxBatteryDistance > 0 ? maxBatteryDistance : Infinity,
        maxSegmentDistance,
        remainingDistance
      );
      
      // 세그먼트 주행 시간 계산
      const segmentDrivingTime = segmentDistance / params.averageSpeed;
      
      if (segmentDrivingTime <= 0) {
        console.warn("세그먼트 주행 시간이 0이하, 세그먼트 생성 중단");
        break;
      }
      
      // 세그먼트 시작 및 종료 위치
      const segmentStartKm = currentPosition;
      const segmentEndKm = currentPosition + segmentDistance;
      
      // 세그먼트 에너지 소비량 계산
      const energyConsumption = calculateSegmentEnergyConsumption(
        segmentDistance,
        params.averageSpeed,
        params.mass,
        terrainData,
        segmentStartKm
      );
      
      // 세그먼트 에너지 생산량 계산
      const energyProduction = calculateSegmentEnergyProduction(
        segmentDrivingTime,
        8, // 일반적인 일일 주행 시간 값
        params.drivingHoursPerDay,
        params.mpptEfficiency
      );
      
      // 배터리 상태 업데이트 계산
      const batteryUpdate = updateBatteryLevel(
        currentBatteryLevel,
        energyProduction.effectiveEnergyProduced,
        energyConsumption.totalEnergyConsumed
      );
      
      // 배터리 레벨 값 추출
      const startBatteryLevel = currentBatteryLevel;
      const endBatteryLevel = batteryUpdate.batteryLevelAfter;
      
      // 시간 진행 - 주행 시간만큼 시간 경과
      const startTimeStr = formatTime(currentTime);
      currentTime += segmentDrivingTime;
      const endTimeStr = formatTime(currentTime);
      
      // 주행 세그먼트 생성
      const drivingSegment: RouteSegment = {
        startKm: segmentStartKm,
        endKm: segmentEndKm,
        distance: segmentDistance,
        isControlStop: false,
        batteryChargingStop: false,
        batteryLevelBefore: startBatteryLevel,
        batteryLevelAfter: endBatteryLevel,
        segmentType: 'Driving',
        startTime: startTimeStr,
        endTime: endTimeStr
      };
      
      // 세그먼트 추가
      segments.push(drivingSegment);
      
      // 상태 업데이트
      currentPosition += segmentDistance;
      currentBatteryLevel = endBatteryLevel;
      remainingDistance -= segmentDistance;
      remainingDrivingHours -= segmentDrivingTime;
      totalDistance += segmentDistance;
      dailyEnergyConsumption += energyConsumption.totalEnergyConsumed;
      
      // 컨트롤 스탑 도달 확인
      if (nextControlStop && Math.abs(currentPosition - nextControlStop.distance) < 0.1) {
        // 컨트롤 스탑 세그먼트 생성
        const controlStopSegment: RouteSegment = {
          startKm: currentPosition,
          endKm: currentPosition,
          distance: 0,
          isControlStop: true,
          controlStopName: nextControlStop.name,
          batteryChargingStop: false,
          batteryLevelBefore: currentBatteryLevel,
          batteryLevelAfter: currentBatteryLevel, // 일단 동일하게 설정
          chargingTime: params.controlStopDuration,
          segmentType: 'ControlStop',
          startTime: formatTime(currentTime),
          endTime: formatTime(currentTime + params.controlStopDuration)
        };
        
        // 컨트롤 스탑 소요 시간 반영
        currentTime += params.controlStopDuration;
        dailyChargingTime += params.controlStopDuration;
        
        // 세그먼트 추가
        segments.push(controlStopSegment);
        
        // 스탑 리스트에서 제거
        upcomingControlStops = upcomingControlStops.filter(
          stop => stop.distance > currentPosition
        );
      }
      
      // 배터리 충전 필요 여부 확인 (25% 이하)
      if (currentBatteryLevel <= params.lowBatteryThreshold) {
        // 배터리 충전 세그먼트 생성
        const chargingTime = params.chargingTimeForLowBattery;
        const updatedBatteryLevel = Math.min(100, currentBatteryLevel + 75); // 충전 후 배터리 레벨 (최대 100%)
        
        const chargingSegment: RouteSegment = {
          startKm: currentPosition,
          endKm: currentPosition,
          distance: 0,
          isControlStop: false,
          batteryChargingStop: true,
          batteryLevelBefore: currentBatteryLevel,
          batteryLevelAfter: updatedBatteryLevel,
          chargingTime: chargingTime,
          segmentType: 'BatteryCharging',
          startTime: formatTime(currentTime),
          endTime: formatTime(currentTime + chargingTime)
        };
        
        // 충전 시간만큼 시간 진행
        currentTime += chargingTime;
        dailyChargingTime += chargingTime;
        currentBatteryLevel = updatedBatteryLevel;
        
        // 세그먼트 추가
        segments.push(chargingSegment);
      }
      
      // 하루 주행 시간 초과 확인 (18시 = 10시 + 8시간)
      if (currentTime >= 18) {
        dayCompleted = true;
      }
      
      // 목표 거리 도달 확인
      if (remainingDistance <= 0) {
        break;
      }
    }
    
    // 결과 반환
    return {
      segments,
      currentKm: currentPosition,
      remainingDistance,
      batteryLevel: currentBatteryLevel,
      totalDistance,
      dailyEnergyConsumption,
      dailyChargingTime
    };
  }
}

/**
 * 시간 값을 문자열로 변환하는 유틸리티 함수
 * @param hours 시간 값 (예: 10.5 = 10시간 30분)
 * @returns 시간 문자열 (예: "10:30:00")
 */
function formatTime(hours: number): string {
  const totalHours = Math.floor(hours);
  const minutes = Math.floor((hours - totalHours) * 60);
  const seconds = Math.floor(((hours - totalHours) * 60 - minutes) * 60);
  
  const paddedHours = totalHours.toString().padStart(2, '0');
  const paddedMinutes = minutes.toString().padStart(2, '0');
  const paddedSeconds = seconds.toString().padStart(2, '0');
  
  return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
} 