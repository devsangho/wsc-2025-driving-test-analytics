import { estimateRouteEnergyProduction } from "./weather-data-processor";
import {
  BATTERY_SPEC,
  calculateNewSOC,
  calculateRangeKm,
} from "./battery-model";
import { calculateEnergyConsumption as calculateMotorEnergyConsumption } from "./motor-model";

export interface ControlStop {
  name: string;
  distance: number; // 출발점으로부터의 거리 (km)
}

export interface RouteSegment {
  startKm: number;
  endKm: number;
  distance: number; // 해당 세그먼트 거리 (km)
  isControlStop: boolean;
  controlStopName?: string;
  batteryChargingStop?: boolean; // 배터리 충전을 위한 정차인지 여부
  batteryLevelBefore?: number; // 정차 전 배터리 잔량 (%)
  batteryLevelAfter?: number; // 정차 후 배터리 잔량 (%)
  chargingTime?: number; // 충전 시간 (시간)
}

export interface DailyItinerary {
  day: number;
  date: string;
  segments: RouteSegment[];
  startKm: number;
  endKm: number;
  totalDistance: number;
  energyProduction: number; // 해당 일자 태양광 생산량 (kWh)
  energyConsumption: number; // 해당 일자 에너지 소비량 (kWh)
  startBatteryLevel: number; // 하루 시작 시 배터리 잔량 (%)
  endBatteryLevel: number; // 하루 종료 시 배터리 잔량 (%)
  totalChargingTime: number; // 충전을 위한 총 정차 시간 (시간)
  reachedMaxDays?: boolean; // 시뮬레이션이 최대 일수에 도달했는지 여부
}

export interface RouteItinerary {
  totalDays: number;
  totalDistance: number;
  dailyItinerary: DailyItinerary[];
  controlStops: ControlStop[];
  totalEnergyProduction: number;
  totalEnergyConsumption: number;
  estimatedArrivalDate: Date;
  totalChargingTime: number; // 총 충전 시간 (시간)
  averageBatteryLevel: number; // 평균 배터리 잔량 (%)
}

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
 * 주행에 필요한 에너지 계산
 * @param distance 주행 거리 (km)
 * @param energyEfficiency 차량 에너지 효율 (km/kWh)
 * @param speed 주행 속도 (km/h)
 * @param mass 차량 질량 (kg)
 * @param slope 도로 경사도 (%)
 */
function calculateEnergyConsumption(
  distance: number,
  energyEfficiency: number,
  speed: number = 80,
  mass: number = 300,
  slope: number = 0,
  frontalArea: number = 0.95,
  dragCoefficient: number = 0.14
): number {
  // 모터 모델을 사용한 정확한 에너지 소비량 계산
  if (distance <= 0) return 0;

  // 기본 모델 (효율 기반)
  const basicConsumption = distance / energyEfficiency;

  try {
    // 모터 모델을 사용한 상세 계산 시도
    const motorConsumption = calculateMotorEnergyConsumption(
      distance,
      speed,
      mass,
      frontalArea, // 전면적 (m²)
      dragCoefficient, // 항력 계수
      slope
    );

    // 계산된 값이 유효하면 모터 모델 기반 값 반환
    if (!isNaN(motorConsumption) && motorConsumption > 0) {
      return motorConsumption;
    }
  } catch (err) {
    // 오류 발생 시 기본 계산식 사용
    console.warn(
      "Motor model calculation failed, using basic efficiency model",
      err
    );
  }

  // 모터 모델 계산 실패 시 기본 모델 반환
  return basicConsumption;
}

/**
 * 경로 계획 생성 (컨트롤 스탑 및 배터리 충전 반영)
 * @param startDate 출발 일자
 * @param totalDistance 총 주행 거리 (km)
 * @param averageSpeed 평균 주행 속도 (km/h)
 * @param drivingHoursPerDay 일일 운행 시간
 * @param energyEfficiency 에너지 효율 (km/kWh)
 * @param panelArea 패널 면적 (m²)
 * @param panelEfficiency 패널 효율
 * @param mpptEfficiency MPPT 효율
 * @param controlStopDuration 컨트롤 스탑에서의 정차 시간 (시간)
 * @param lowBatteryThreshold 배터리 충전이 필요한 임계값 (%, 기본값 25%)
 * @param chargingTimeForLowBattery 배터리 충전을 위한 정차 시간 (시간, 기본값 2시간)
 * @param maxDays 최대 시뮬레이션 일수 제한
 * @param mass 차량 질량 (kg)
 * @param slope 도로 경사도
 * @param frontalArea 전면적 (m^2)
 * @param dragCoefficient 공기저항계수
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
  slope: number = 0, // 도로 경사도
  frontalArea: number = 0.95, // 전면적 (m^2)
  dragCoefficient: number = 0.14 // 공기저항계수
): Promise<RouteItinerary> {
  // 컨트롤 스탑 로드
  const controlStops = await loadControlStops();

  // 일자별 주행 계획 생성
  const dailyItinerary: DailyItinerary[] = [];

  let currentDay = 0;
  const startDateObj = new Date(startDate);
  let currentKm = 0;
  let remainingDistance = totalDistance;

  // 다음 컨트롤 스탑 정보
  let nextControlStopIndex = 0;
  let nextControlStop: ControlStop | null = controlStops[nextControlStopIndex];

  // 이전 남은 거리를 저장하여 진행 상황 모니터링
  let previousRemainingDistance = remainingDistance;
  let stuckCounter = 0;

  // 배터리 상태 관리
  let batteryLevel = 100; // 배터리 잔량 (%, 100%로 시작)

  while (remainingDistance > 0 && currentDay < maxDays) {
    // 현재 날짜 생성
    const currentDate = new Date(startDateObj);
    currentDate.setDate(startDateObj.getDate() + currentDay);

    // 현재 날짜 문자열 (YYYY-MM-DD)
    const dateString = currentDate.toISOString().split("T")[0];
    currentDay++;

    // 오늘 주행할 세그먼트 계산
    const segments: RouteSegment[] = [];
    let dayDistance = 0;
    let dailyChargingTime = 0; // 하루 충전 시간
    let availableDrivingTime = drivingHoursPerDay; // 오늘 운행 가능한 시간

    // 하루 시작 시 배터리 잔량 저장
    const startBatteryLevel = batteryLevel;

    // 일일 이동 없음 카운터
    let dailyNoProgressCounter = 0;

    while (availableDrivingTime > 0 && remainingDistance > 0) {
      // 무한 루프 방지를 위한 현재 상태 저장
      const beforeLoopKm = currentKm;
      const beforeLoopRemainingDistance = remainingDistance;

      // 배터리가 임계값 이하인 경우 충전 정차
      if (batteryLevel <= lowBatteryThreshold) {
        const batteryLevelBefore = batteryLevel;

        // 실제 충전량 계산
        // 표준 충전 전류(standardChargeRate)로 actualChargingTime 시간 동안 충전
        const chargedCapacity =
          BATTERY_SPEC.standardChargeRate * chargingTimeForLowBattery; // Ah
        const chargedPercentage =
          (chargedCapacity / BATTERY_SPEC.capacity) * 100;
        batteryLevel = Math.min(100, batteryLevelBefore + chargedPercentage);

        // 세그먼트 추가 (충전 정차)
        segments.push({
          startKm: currentKm,
          endKm: currentKm,
          distance: 0,
          isControlStop: false,
          batteryChargingStop: true,
          batteryLevelBefore: batteryLevelBefore,
          batteryLevelAfter: batteryLevel,
          chargingTime: chargingTimeForLowBattery,
        });

        // 시간 차감 및 충전 시간 추가
        availableDrivingTime -= chargingTimeForLowBattery;
        dailyChargingTime += chargingTimeForLowBattery;

        // 시간이 부족하면 하루 종료
        if (availableDrivingTime <= 0) {
          break;
        }

        continue; // 다음 세그먼트로 진행
      }

      // 다음 컨트롤 스탑까지의 거리 계산
      const distanceToNextControlStop = nextControlStop
        ? nextControlStop.distance - currentKm
        : remainingDistance;

      // 운행 가능한 시간 내에 이동 가능한 거리
      const possibleDistanceWithTime = averageSpeed * availableDrivingTime;

      // 배터리로 이동 가능한 거리 계산
      const possibleDistanceWithBattery = calculateRangeKm(
        batteryLevel,
        energyEfficiency
      );

      // 오늘 운행할 최대 거리 (컨트롤 스탑, 가능 시간, 배터리 중 가장 제한적인 요소)
      const distanceForThisSegment = Math.min(
        distanceToNextControlStop,
        possibleDistanceWithTime,
        possibleDistanceWithBattery,
        remainingDistance
      );

      // 최소 이동 거리 보장 (0이하인 경우 처리)
      if (distanceForThisSegment <= 0) {
        console.warn("Zero or negative distance segment detected:", {
          distanceToNextControlStop,
          possibleDistanceWithTime,
          possibleDistanceWithBattery,
          remainingDistance,
          batteryLevel,
        });

        // 이동 불가능한 경우 하루 종료
        if (distanceForThisSegment <= 0) {
          dailyNoProgressCounter++;

          // 5번 연속으로 이동 불가능하면 하루 종료
          if (dailyNoProgressCounter >= 5) {
            console.warn(
              "No progress possible for 5 consecutive attempts, ending day"
            );
            break;
          }

          continue;
        }
      }

      // 세그먼트 시작, 종료 지점
      const segmentStartKm = currentKm;
      const segmentEndKm = currentKm + distanceForThisSegment;

      // 해당 세그먼트가 컨트롤 스탑에 도달하는지 확인
      const reachesControlStop =
        nextControlStop && segmentEndKm >= nextControlStop.distance;

      // 실제 세그먼트 종료 위치 (컨트롤 스탑에 도달하면 정확히 그 위치까지)
      const actualEndKm =
        reachesControlStop && nextControlStop
          ? nextControlStop.distance
          : segmentEndKm;

      // 실제 주행 거리
      const actualDistance = actualEndKm - segmentStartKm;

      // 배터리 소비량 계산
      // const energyConsumed = calculateEnergyConsumption(
      //   actualDistance,
      //   energyEfficiency,
      //   averageSpeed,
      //   mass,
      //   slope,
      //   frontalArea,
      //   dragCoefficient
      // );

      // 배터리 SOC 업데이트
      const batteryLevelBefore = batteryLevel;

      // 주행 중 태양광 발전량 계산 (주행 시간 동안의 발전량)
      const segmentDrivingTime = actualDistance / averageSpeed; // 주행 시간 (시간)

      // 해당 시간대의 태양광 발전량 추정
      const segmentSolarEnergy = await estimateRouteEnergyProduction(
        startDate,
        segmentDrivingTime,
        panelArea,
        panelEfficiency,
        mpptEfficiency
      );

      // 해당 세그먼트의 총 발전량 계산 (kWh)
      const totalSolarEnergyProduced = segmentSolarEnergy.reduce(
        (sum, data) => sum + data.energyProduction,
        0
      ) * mpptEfficiency;
      
      // 태양광 효율 저하 요소 적용 (패널 먼지, 온도 영향, 전력 변환 손실 등)
      const solarEfficiencyFactor = 0.7;
      const actualSolarEnergy = totalSolarEnergyProduced * solarEfficiencyFactor;
      
      // 실제 모터 에너지 소비량 계산
      const motorEnergyConsumed = calculateMotorEnergyConsumption(
        actualDistance,
        averageSpeed,
        mass,
        frontalArea,
        dragCoefficient,
        slope
      );
      
      // 모터 외 시스템 소비 추가 (보조 전력 시스템, 전자장비, 기계적 손실 등)
      const auxiliarySystemConsumption = 0.25; // 모터 소비량의 25%를 추가 소비로 가정
      
      // 모터 효율을 고려한 배터리 소비량 계산 (효율이 낮을수록 더 많은 에너지 소비)
      // 여기서는 모터 효율을 이미 고려하기 때문에 효율로 나누는 대신 인버터 손실 추가
      const inverterLoss = 0.1; // 인버터 손실 10% 가정
      const actualEnergyConsumed = motorEnergyConsumed * (1 + auxiliarySystemConsumption) * (1 + inverterLoss);
      
      // 배터리 SOC 업데이트
      batteryLevel = calculateNewSOC(
        batteryLevel,
        actualSolarEnergy,
        actualEnergyConsumed
      );
      
      // 디버깅 로그
      console.log(`Segment: ${actualDistance.toFixed(1)}km, Battery: ${batteryLevelBefore.toFixed(1)}% -> ${batteryLevel.toFixed(1)}%, Solar: ${actualSolarEnergy.toFixed(2)}kWh, Consumed: ${actualEnergyConsumed.toFixed(2)}kWh, Net: ${(actualSolarEnergy - actualEnergyConsumed).toFixed(2)}kWh`);

      // 세그먼트 추가
      segments.push({
        startKm: segmentStartKm,
        endKm: actualEndKm,
        distance: actualDistance,
        isControlStop: Boolean(reachesControlStop && nextControlStop),
        controlStopName:
          reachesControlStop && nextControlStop
            ? nextControlStop.name
            : undefined,
        batteryLevelBefore: batteryLevelBefore,
        batteryLevelAfter: batteryLevel,
      });

      // 위치 및 남은 거리 업데이트
      currentKm = actualEndKm;
      remainingDistance -= actualDistance;
      dayDistance += actualDistance;

      // 목표 거리(3022km)에 도달하면 시뮬레이션 종료
      if (currentKm >= 3022) {
        console.log("Reached destination (3022km), simulation completed successfully");
        remainingDistance = 0;
        break;
      }

      // 소요 시간 계산 및 차감
      const drivingTime = actualDistance / averageSpeed;
      availableDrivingTime -= drivingTime;

      // 컨트롤 스탑에 도달한 경우
      if (reachesControlStop && nextControlStop) {
        // 컨트롤 스탑 정차 시간 차감
        availableDrivingTime -= controlStopDuration;

        // 다음 컨트롤 스탑으로 이동
        nextControlStopIndex++;
        nextControlStop =
          nextControlStopIndex < controlStops.length
            ? controlStops[nextControlStopIndex]
            : null;

        // 정차 시간이 남은 운행 시간보다 크면 당일 운행 종료
        if (availableDrivingTime < 0) {
          break;
        }
      }

      // 무한 루프 감지 및 방지
      if (
        Math.abs(currentKm - beforeLoopKm) < 0.001 &&
        Math.abs(remainingDistance - beforeLoopRemainingDistance) < 0.001
      ) {
        dailyNoProgressCounter++;

        // 5회 이상 진행 없으면 하루 종료
        if (dailyNoProgressCounter >= 5) {
          console.warn(
            `No progress detected for 5 consecutive iterations, ending day. Current state: ${currentKm}km, ${remainingDistance}km remaining, battery: ${batteryLevel}%`
          );
          break;
        }
      } else {
        // 진행이 있었으면 카운터 초기화
        dailyNoProgressCounter = 0;
      }
    }

    // 에너지 소비량 계산 - 모터 물리 모델 사용
    const totalMotorEnergyConsumed = calculateMotorEnergyConsumption(
      dayDistance,
      averageSpeed,
      mass,
      frontalArea,
      dragCoefficient,
      slope
    );
    
    // 모터 외 시스템 소비 추가 및 인버터 손실 고려
    const auxiliarySystemConsumption = 0.25; // 모터 소비량의 25%를 추가 소비로 가정
    const inverterLoss = 0.1; // 인버터 손실 10% 가정
    const energyConsumption = totalMotorEnergyConsumed * (1 + auxiliarySystemConsumption) * (1 + inverterLoss);

    // 해당 일자의 주행 계획 추가
    if (segments.length > 0) {
      dailyItinerary.push({
        day: currentDay,
        date: dateString,
        segments,
        startKm: segments[0].startKm,
        endKm: segments[segments.length - 1].endKm,
        totalDistance: dayDistance,
        energyProduction: 0, // 나중에 업데이트
        energyConsumption,
        startBatteryLevel: startBatteryLevel,
        endBatteryLevel: batteryLevel,
        totalChargingTime: dailyChargingTime,
        reachedMaxDays: currentDay >= maxDays,
      });
    } else {
      console.warn(
        `No segments created for day ${currentDay}, ending simulation`
      );
      break; // 세그먼트가 없는 경우 시뮬레이션 종료
    }

    // 진행 상황 확인하여 무한 루프 감지
    if (Math.abs(remainingDistance - previousRemainingDistance) < 0.001) {
      stuckCounter++;
      // 3번 연속으로 진행이 없으면 무한 루프로 간주하고 시뮬레이션 종료
      if (stuckCounter >= 3) {
        console.error(
          "No progress made in route planning for 3 consecutive days, aborting"
        );
        break;
      }
    } else {
      stuckCounter = 0;
    }
    previousRemainingDistance = remainingDistance;

    // 다음날 아침 태양광 발전으로 인한 배터리 충전 시뮬레이션 (간단히)
    // 날씨 데이터를 기반으로 더 정확한 발전량 계산
    try {
      // 날씨 데이터 기반 아침 발전량 계산 (4시간)
      const morningChargeDuration = 4; // 아침 4시간 동안의 발전량
      const morningChargeData = await estimateRouteEnergyProduction(
        dateString,
        morningChargeDuration / 24, // 하루의 1/6 (4시간)
        panelArea,
        panelEfficiency,
        mpptEfficiency
      );

      // 아침 발전량 계산 (kWh)
      const morningChargekWh = morningChargeData.reduce(
        (sum, data) => sum + data.energyProduction,
        0
      ) * mpptEfficiency;
      
      // 태양광 효율 저하 요소 적용
      const solarEfficiencyFactor = 0.7;
      const actualMorningCharge = morningChargekWh * solarEfficiencyFactor;
      
      // 발전량을 배터리 충전에 적용
      batteryLevel = calculateNewSOC(batteryLevel, actualMorningCharge, 0);
      console.log(`Morning charge: +${actualMorningCharge.toFixed(2)}kWh, Battery: ${batteryLevel.toFixed(1)}%`);
    } catch (error) {
      console.warn(
        "Failed to calculate precise morning charge, using estimate instead",
        error
      );
      // 실패 시 기본 추정값으로 대체
      const morningCharge = 5; // %
      batteryLevel = Math.min(100, batteryLevel + morningCharge);
    }

    // 목표 거리에 도달했으면 시뮬레이션 종료
    if (currentKm >= 3022) {
      console.log("Reached destination (3022km), finishing simulation");
      remainingDistance = 0; // Ensure remainingDistance is 0 to exit the main loop
      break;
    }
  }

  // 최대 일수 초과시 경고 로그
  if (currentDay >= maxDays) {
    console.warn(
      `Route planning reached the maximum allowed days (${maxDays})`
    );
    
    // Add a note to the last day that the simulation stopped due to maxDays limit
    if (dailyItinerary.length > 0) {
      const lastDay = dailyItinerary[dailyItinerary.length - 1];
      // Add a flag to indicate the simulation was cut off due to time limit
      lastDay.reachedMaxDays = true;
    }
  }
  
  // 주행 거리가 0인 날 제거 (filter하여 새 배열 생성)
  const filteredDailyItinerary = dailyItinerary.filter(day => day.totalDistance > 0);

  // 각 날짜별 태양광 발전량 계산
  const energyProductionPromises = [];
  for (let i = 0; i < filteredDailyItinerary.length; i++) {
    const day = filteredDailyItinerary[i];
    // 하루 8시간 동안의 발전량 추정
    energyProductionPromises.push(
      estimateRouteEnergyProduction(
        day.date,
        8 / 24, // 주행 시간(8시간) 비율
        panelArea,
        panelEfficiency,
        mpptEfficiency
      )
    );
  }

  const energyProductionResults = await Promise.all(energyProductionPromises);

  // 발전량 정보 업데이트 및 배터리 상태 재계산
  batteryLevel = 100; // 처음 배터리 상태로 리셋

  for (let i = 0; i < filteredDailyItinerary.length; i++) {
    const day = filteredDailyItinerary[i];

    // 발전량 업데이트
    if (i < energyProductionResults.length) {
      const dayProduction =
        energyProductionResults[i].reduce(
          (sum, data) => sum + data.energyProduction,
          0
        ) * mpptEfficiency;

      day.energyProduction = dayProduction;

      // 배터리 상태 재계산 (이전 날짜의 마지막 배터리 상태 사용)
      if (i > 0) {
        batteryLevel = filteredDailyItinerary[i - 1].endBatteryLevel;
      }

      // 아침 충전량 계산 (날씨 데이터 기반)
      try {
        // 4시간 동안의 아침 발전량
        const morningChargeData = await estimateRouteEnergyProduction(
          day.date,
          4 / 24, // 4시간
          panelArea,
          panelEfficiency,
          mpptEfficiency
        );

        const morningChargeEnergy =
          morningChargeData.reduce(
            (sum, data) => sum + data.energyProduction,
            0
          ) * mpptEfficiency;

        // 아침 충전 적용
        batteryLevel = calculateNewSOC(batteryLevel, morningChargeEnergy, 0);
      } catch (error) {
        console.warn(
          "Failed to calculate morning charge, using estimate instead:",
          error
        );
        // 실패 시 일일 발전량의 10%로 추정
        const morningChargeEnergy = day.energyProduction * 0.1;
        batteryLevel = calculateNewSOC(batteryLevel, morningChargeEnergy, 0);
      }

      // 시작 배터리 상태 업데이트
      day.startBatteryLevel = batteryLevel;

      // 세그먼트별 배터리 업데이트
      let currentBatteryLevel = batteryLevel;
      for (const segment of day.segments) {
        // 배터리 상태 변수 확인 및 기본값 설정
        if (segment.batteryLevelBefore === undefined) {
          segment.batteryLevelBefore = currentBatteryLevel;
        }

        if (segment.batteryChargingStop) {
          // 이미 계산된 값이 있다면 사용, 없으면 계산
          if (segment.batteryLevelAfter !== undefined) {
            currentBatteryLevel = segment.batteryLevelAfter;
          } else {
            // 충전 후 배터리 상태 계산 (태양광 발전 반영)
            const chargingHours = segment.chargingTime || 0;
            const chargeEnergy = (day.energyProduction / 8) * chargingHours; // 하루 발전량을 8시간에 나눠 시간당 발전량 추정
            currentBatteryLevel = calculateNewSOC(
              currentBatteryLevel,
              chargeEnergy,
              0
            );
            segment.batteryLevelAfter = currentBatteryLevel;
          }
        } else if (segment.distance > 0) {
          // 이미 계산된 값이 있다면 사용, 없으면 계산
          if (segment.batteryLevelAfter !== undefined) {
            currentBatteryLevel = segment.batteryLevelAfter;
          } else {
            // 주행 세그먼트인 경우
            const energyUsed = calculateEnergyConsumption(
              segment.distance,
              energyEfficiency,
              averageSpeed,
              mass,
              slope,
              frontalArea,
              dragCoefficient
            );

            // 해당 시간대의 태양광 발전량 추정
            const segmentDrivingTime = segment.distance / averageSpeed;
            // 간소화된 태양광 발전량 계산 (실시간 계산은 무거우므로)
            const solarEnergy = (day.energyProduction / 8) * segmentDrivingTime;

            currentBatteryLevel = calculateNewSOC(
              currentBatteryLevel,
              solarEnergy,
              energyUsed
            );
            segment.batteryLevelAfter = currentBatteryLevel;
          }
        }
      }

      // 종료 배터리 상태 업데이트
      day.endBatteryLevel = currentBatteryLevel;
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
  const dayEndBatteryLevels = filteredDailyItinerary.map((day) => day.endBatteryLevel);
  const averageBatteryLevel =
    dayEndBatteryLevels.reduce((sum, level) => sum + level, 0) /
    (dayEndBatteryLevels.length || 1);

  // 예상 도착일
  const estimatedArrivalDate = new Date(
    filteredDailyItinerary[filteredDailyItinerary.length - 1].date
  );

  return {
    totalDays: filteredDailyItinerary.length,
    totalDistance,
    dailyItinerary: filteredDailyItinerary,
    controlStops,
    totalEnergyProduction,
    totalEnergyConsumption,
    estimatedArrivalDate,
    totalChargingTime: totalChargingHours,
    averageBatteryLevel,
  };
}
