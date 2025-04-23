import { estimateRouteEnergyProduction } from "./weather-data-processor";
import {
  calculateChargingTime,
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
  slope: number = 0
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
      0.95, // 전면적 (m²)
      0.14, // 항력 계수
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
  maxDays: number = 30 // 최대 시뮬레이션 일수 제한
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

        // 배터리 충전 시간 및 목표 충전량 계산
        // 표준 충전 속도(0.5C)로 80%까지 충전
        const targetSOC = 80;
        const chargingTime = calculateChargingTime(
          batteryLevelBefore,
          targetSOC,
          0.5
        );

        // 실제 사용할 충전 시간 (최대 chargingTimeForLowBattery 시간)
        const actualChargingTime = Math.min(
          chargingTime,
          chargingTimeForLowBattery
        );

        // 배터리 잔량 업데이트 (80%로 설정, 또는 시간 제약으로 더 낮을 수 있음)
        // 시간 제약이 있는 경우, 실제 충전량 계산이 필요하지만 단순화를 위해 targetSOC 적용
        batteryLevel =
          actualChargingTime >= chargingTime
            ? targetSOC
            : batteryLevelBefore +
              (targetSOC - batteryLevelBefore) *
                (actualChargingTime / chargingTime);

        // 세그먼트 추가 (충전 정차)
        segments.push({
          startKm: currentKm,
          endKm: currentKm,
          distance: 0,
          isControlStop: false,
          batteryChargingStop: true,
          batteryLevelBefore: batteryLevelBefore,
          batteryLevelAfter: batteryLevel,
          chargingTime: actualChargingTime,
        });

        // 시간 차감 및 충전 시간 추가
        availableDrivingTime -= actualChargingTime;
        dailyChargingTime += actualChargingTime;

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
      let distanceForThisSegment = Math.min(
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

        // 배터리 충전이 필요한 경우 (가능 거리가 0 이하)
        if (possibleDistanceWithBattery <= 0 && batteryLevel > 0) {
          // 최소 충전 구현
          const minChargeAmount = 5; // 최소 5% 충전
          batteryLevel = Math.min(100, batteryLevel + minChargeAmount);

          // 충전을 위한 세그먼트 추가
          segments.push({
            startKm: currentKm,
            endKm: currentKm,
            distance: 0,
            isControlStop: false,
            batteryChargingStop: true,
            batteryLevelBefore: batteryLevel - minChargeAmount,
            batteryLevelAfter: batteryLevel,
            chargingTime: 0.5, // 30분 충전
          });

          // 충전 시간 차감
          availableDrivingTime -= 0.5;
          dailyChargingTime += 0.5;

          if (availableDrivingTime <= 0) {
            break;
          }

          // 다시 이동 가능한지 확인
          continue;
        }

        // 최소 이동 거리 설정 (진행을 위해)
        distanceForThisSegment = Math.max(
          1,
          possibleDistanceWithBattery,
          possibleDistanceWithTime
        );

        // 그래도 이동 불가능한 경우 하루 종료
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
      const actualDistance = Math.max(0.1, actualEndKm - segmentStartKm); // 최소 0.1km 보장

      // 배터리 소비량 계산
      const energyConsumed = calculateEnergyConsumption(
        actualDistance,
        energyEfficiency
      );

      // 배터리 SOC 업데이트
      const batteryLevelBefore = batteryLevel;
      batteryLevel = calculateNewSOC(batteryLevel, 0, energyConsumed); // 주행 중에는 태양광 발전량 적용 안함

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

      // 배터리가 완전히 방전된 경우
      if (batteryLevel <= 0) {
        console.warn("Battery depleted, ending daily planning");
        batteryLevel = 0; // 음수 방지
        break;
      }
    }

    // 에너지 소비량 계산
    const energyConsumption = calculateEnergyConsumption(
      dayDistance,
      energyEfficiency
    );

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
    // 실제로는 나중에 정확한 발전량으로 업데이트됨
    const morningCharge = 5; // %
    batteryLevel = Math.min(100, batteryLevel + morningCharge);

    // 목표 거리에 도달했으면 시뮬레이션 종료
    if (currentKm >= 3022) {
      break;
    }
  }

  // 최대 일수 초과시 경고 로그
  if (currentDay >= maxDays) {
    console.warn(
      `Route planning reached the maximum allowed days (${maxDays})`
    );
  }

  // 각 날짜별 태양광 발전량 계산
  const energyProductionPromise = estimateRouteEnergyProduction(
    startDate,
    dailyItinerary.length,
    panelArea,
    panelEfficiency,
    mpptEfficiency
  );

  const energyProduction = await energyProductionPromise;

  // 발전량 정보 업데이트 및 배터리 상태 재계산
  batteryLevel = 100; // 처음 배터리 상태로 리셋

  for (let i = 0; i < dailyItinerary.length; i++) {
    if (i < energyProduction.length) {
      const day = dailyItinerary[i];
      // 발전량 업데이트
      day.energyProduction = energyProduction[i].energyProduction;

      // 배터리 상태 재계산 (이전 날짜의 마지막 배터리 상태 사용)
      if (i > 0) {
        batteryLevel = dailyItinerary[i - 1].endBatteryLevel;
      }

      // 아침 충전량 (발전량의 일부)
      const morningChargeEnergy = day.energyProduction * 0.1; // 하루 발전량의 10%
      batteryLevel = calculateNewSOC(batteryLevel, morningChargeEnergy, 0);

      // 시작 배터리 상태 업데이트
      day.startBatteryLevel = batteryLevel;

      // 세그먼트별 배터리 업데이트
      let currentBatteryLevel = batteryLevel;
      for (const segment of day.segments) {
        if (segment.batteryChargingStop) {
          // 충전 세그먼트인 경우
          segment.batteryLevelBefore = currentBatteryLevel;

          // 충전 후 배터리 상태 계산 (태양광 발전 반영)
          const chargingHours = segment.chargingTime || 0;
          const chargeEnergy = (day.energyProduction / 8) * chargingHours; // 하루 발전량을 8시간에 나눠 시간당 발전량 추정
          currentBatteryLevel = calculateNewSOC(
            currentBatteryLevel,
            chargeEnergy,
            0
          );

          segment.batteryLevelAfter = currentBatteryLevel;
        } else if (segment.distance > 0) {
          // 주행 세그먼트인 경우
          const energyUsed = segment.distance / energyEfficiency;

          segment.batteryLevelBefore = currentBatteryLevel;
          currentBatteryLevel = calculateNewSOC(
            currentBatteryLevel,
            0,
            energyUsed
          );
          segment.batteryLevelAfter = currentBatteryLevel;
        }
      }

      // 종료 배터리 상태 업데이트
      day.endBatteryLevel = currentBatteryLevel;
    }
  }

  // 총계 계산
  const totalEnergyProduction = dailyItinerary.reduce(
    (sum, day) => sum + day.energyProduction,
    0
  );

  const totalEnergyConsumption = dailyItinerary.reduce(
    (sum, day) => sum + day.energyConsumption,
    0
  );

  const totalChargingHours = dailyItinerary.reduce(
    (sum, day) => sum + day.totalChargingTime,
    0
  );

  // 평균 배터리 레벨 계산
  const dayEndBatteryLevels = dailyItinerary.map((day) => day.endBatteryLevel);
  const averageBatteryLevel =
    dayEndBatteryLevels.reduce((sum, level) => sum + level, 0) /
    (dayEndBatteryLevels.length || 1);

  // 예상 도착일
  const estimatedArrivalDate = new Date(
    dailyItinerary[dailyItinerary.length - 1].date
  );

  return {
    totalDays: dailyItinerary.length,
    totalDistance,
    dailyItinerary,
    controlStops,
    totalEnergyProduction,
    totalEnergyConsumption,
    estimatedArrivalDate,
    totalChargingTime: totalChargingHours,
    averageBatteryLevel,
  };
}
