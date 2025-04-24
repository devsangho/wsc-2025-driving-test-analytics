/**
 * 모터 모델 - 실제 모터 스펙 기반
 * 
 * Nominal Power: 2.0kW
 * Maximum Power: 약 5000W
 * 효율: 95% 이상 (모터 컨트롤러 효율 포함)
 * 공칭 부하 회전 속도: 810rpm
 * 회전 방향: 정방향 - 왼쪽 회전 (휠에서 볼 때) / 오른쪽 회전 선택 가능
 * 
 * 컨트롤러:
 * 모델 번호: M2096C
 * 크기: W203mm×D213mm×H93.5mm
 * 무게: 3.5kg
 * 냉각 방식: 자연 공랭식
 * 공칭 전압: 96V
 * 입력 전압 범위: 45~140V
 * 작동 방식: 120도 구형파 제어
 */

export interface MotorModel {
  nominalPower: number; // 공칭 출력 (kW)
  maxPower: number; // 최대 출력 (kW)
  efficiency: number; // 효율 (0-1)
  nominalRPM: number; // 공칭 회전속도 (rpm)
  nominalVoltage: number; // 공칭 전압 (V)
  minVoltage: number; // 최소 입력 전압 (V)
  maxVoltage: number; // 최대 입력 전압 (V)
}

export const MOTOR_SPEC: MotorModel = {
  nominalPower: 2.0, // 2.0kW
  maxPower: 5.0, // 5.0kW
  efficiency: 0.95, // 95%
  nominalRPM: 810, // 810rpm
  nominalVoltage: 96, // 96V
  minVoltage: 45, // 45V
  maxVoltage: 140 // 140V
};

/**
 * 속도에 따른 모터 출력 계산
 * @param speedKmh 차량 속도 (km/h)
 * @param wheelDiameter 휠 직경 (m)
 * @param gearRatio 기어비
 * @returns 모터 출력 (kW)
 */
export function calculateMotorPower(
  speedKmh: number,
  wheelDiameter: number = 0.55, // 기본 휠 직경 55cm
  gearRatio: number = 3.5 // 기본 기어비
): number {
  // 휠 회전당 이동 거리 (m)
  const wheelCircumference = Math.PI * wheelDiameter;
  
  // 차량 속도 (m/s)
  const speedMs = speedKmh / 3.6;
  
  // 휠 회전 속도 (RPM)
  const wheelRPM = (speedMs * 60) / wheelCircumference;
  
  // 모터 회전 속도 (RPM)
  const motorRPM = wheelRPM * gearRatio;
  
  // 출력 계산 
  // 모터 RPM과 공칭 RPM의 비율에 따라 출력 조정
  // 저속에서는 출력이 선형적으로 증가, 고속에서는 일정 출력 유지
  let powerRatio = motorRPM / MOTOR_SPEC.nominalRPM;
  
  // 전체 출력 범위 제한
  powerRatio = Math.min(Math.max(0, powerRatio), 1.5);
  
  // 3kW까지는 선형적으로 증가, 이후 최대 5kW 제한
  let power = MOTOR_SPEC.nominalPower * powerRatio;
  
  // 고속에서의 최대 출력 제한
  power = Math.min(power, MOTOR_SPEC.maxPower);
  
  return power;
}

/**
 * 필요 동력에 따른 배터리 소비 전력 계산
 * @param requiredPowerKW 필요 동력 (kW)
 * @returns 배터리 소비 전력 (kW)
 */
export function calculateBatteryPowerDraw(requiredPowerKW: number): number {
  // 모터 효율을 고려한 필요 전력 계산
  return requiredPowerKW / MOTOR_SPEC.efficiency;
}

/**
 * 모터 효율 계산 (부하에 따른 효율 변화 모델링)
 * @param loadPercent 모터 부하율 (0-1)
 * @returns 해당 부하에서의 모터 효율 (0-1)
 */
export function calculateMotorEfficiency(loadPercent: number): number {
  // 부하율 범위 제한
  const load = Math.min(Math.max(0, loadPercent), 1);
  
  // 모터 효율 커브 모델링 (일반적인 BLDC 모터 특성)
  // 30% 이하 부하에서는 효율이 낮고, 30~80% 부하에서 최고 효율, 80% 이상 부하에서 약간 감소
  let efficiency;
  
  if (load < 0.3) {
    // 저부하 구간: 0~30% 부하
    efficiency = 0.8 + (load / 0.3) * 0.15;
  } else if (load <= 0.8) {
    // 최적 부하 구간: 30~80% 부하
    efficiency = 0.95;
  } else {
    // 고부하 구간: 80~100% 부하
    efficiency = 0.95 - ((load - 0.8) / 0.2) * 0.05;
  }
  
  return efficiency;
}

/**
 * 특정 속도에서 주행 저항력 계산
 * @param speedKmh 차량 속도 (km/h)
 * @param mass 차량 질량 (kg)
 * @param frontalArea 전면적 (m²)
 * @param dragCoefficient 항력 계수
 * @param slope 도로 경사도 (%)
 * @returns 주행 저항력 (N)
 */
export function calculateDrivingResistance(
  speedKmh: number,
  mass: number = 300, // 기본 차량 질량 (kg)
  frontalArea: number = 0.95, // 기본 전면적 (m²)
  dragCoefficient: number = 0.14, // 기본 항력 계수
  slope: number = 0 // 평지 가정
): number {
  // 중력 가속도 (m/s²)
  const g = 9.81;
  
  // 속도 변환 (m/s)
  const speedMs = speedKmh / 3.6;
  
  // 공기 밀도 (kg/m³), 표준 대기 조건
  const airDensity = 1.225;
  
  // 공기저항 (N) = 0.5 * 공기밀도 * 전면적 * 항력계수 * 속도²
  const airResistance = 0.5 * airDensity * frontalArea * dragCoefficient * Math.pow(speedMs, 2);
  
  // 구름저항 (N) = 구름저항계수 * 차량중량
  const rollingCoefficient = 0.01; // 태양광차 타이어의 구름저항계수 (매우 낮음)
  const rollingResistance = rollingCoefficient * mass * g;
  
  // 경사저항 (N) = 차량중량 * sin(slope각도)
  // 경사도를 라디안으로 변환 (경사도% -> 각도)
  const slopeAngle = Math.atan(slope / 100);
  const slopeResistance = mass * g * Math.sin(slopeAngle);
  
  // 총 주행저항 (N)
  const totalResistance = airResistance + rollingResistance + slopeResistance;
  
  return totalResistance;
}

/**
 * 주행 저항력을 극복하는데 필요한 동력 계산
 * @param resistance 주행 저항력 (N)
 * @param speedKmh 차량 속도 (km/h)
 * @returns 필요 동력 (kW)
 */
export function calculateRequiredPower(resistance: number, speedKmh: number): number {
  // 속도 변환 (m/s)
  const speedMs = speedKmh / 3.6;
  
  // 필요 동력 (W) = 저항력 * 속도
  const powerWatts = resistance * speedMs;
  
  // 동력 변환 (kW)
  return powerWatts / 1000;
}

/**
 * 특정 거리를 주행하는데 필요한 에너지 계산
 * @param distance 주행 거리 (km)
 * @param speed 차량 속도 (km/h)
 * @param mass 차량 질량 (kg)
 * @param frontalArea 전면적 (m²)
 * @param dragCoefficient 항력 계수
 * @param slope 도로 경사도 (%)
 * @returns 필요 에너지 (kWh)
 */
export function calculateEnergyConsumption(
  distance: number,
  speed: number,
  mass: number = 300,
  frontalArea: number = 0.95,
  dragCoefficient: number = 0.14,
  slope: number = 0
): number {
  // 거리가 0이면 에너지 소비 없음
  if (distance <= 0) {
    return 0;
  }
  
  // 주행 저항력 계산 (N)
  const resistance = calculateDrivingResistance(speed, mass, frontalArea, dragCoefficient, slope);
  
  // 필요 동력 계산 (kW)
  const powerRequired = calculateRequiredPower(resistance, speed);
  
  // 모터 효율 고려한 실제 동력 소비량 계산
  // 부하율 계산 (0~1 사이 값)
  const loadRatio = Math.min(powerRequired / MOTOR_SPEC.nominalPower, 1);
  
  // 해당 부하에서의 효율 계산
  const actualEfficiency = calculateMotorEfficiency(loadRatio);
  
  // 배터리에서 사용되는 실제 전력 (kW)
  const batteryPower = powerRequired / actualEfficiency;
  
  // 주행 시간 계산 (h)
  const travelTime = distance / speed;
  
  // 총 에너지 소비량 (kWh)
  let energyConsumption = batteryPower * travelTime;
  
  // 기본 전자 장비 소비 전력 및 최소 에너지 소비 보장
  const baseElectronicsConsumption = 0.2; // 전자 장비 기본 소비 (kWh/hour)
  const minConsumptionPerKm = 0.05; // 최소 km당 소비량 (kWh/km)
  
  // 전자장비 소비 추가
  energyConsumption += baseElectronicsConsumption * travelTime;
  
  // 최소 에너지 소비량 보장
  const minimumConsumption = distance * minConsumptionPerKm;
  
  // 계산된 값과 최소값 중 큰 값 반환
  return Math.max(energyConsumption, minimumConsumption);
} 