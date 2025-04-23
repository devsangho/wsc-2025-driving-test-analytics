/**
 * 배터리 모델 - 실제 배터리 스펙 기반
 * 
 * 공칭 전압 (Nominal Voltage) [V] 93.6Vdc (72.8~109.2Vdc)
 * 용량 (Capacity) [Ah] 31.5Ah (Typ)
 * 에너지 (Energy) [Wh] 2,948.4Wh
 * 최대 방전 출력 (Maximum Discharge Power) [kW] 7.488kW
 * 
 * 충전 방식: CC-CV (Constant Voltage with Limited Current)
 * 표준 충전 조건 (0.5C): 109.2V±1%, 15.75A, CC-CV, End Current: 1.575A (0.05C)
 * 최대 충전 조건 (1.0C): 109.2V±1%, 31.5A, CC-CV, End Current: 1.575A (0.05C)
 * 
 * 표준 방전 전류 (0.2C): 6.3A
 * 최대 방전 전류: 80A
 * 순시 방전 전류: 100A @ ≤1.5s
 * 방전 종지 전압: 72.8V (2.8V per cell)
 */

export interface BatteryModel {
  nominalVoltage: number; // 공칭 전압 (V)
  minVoltage: number; // 최소 전압 (V)
  maxVoltage: number; // 최대 전압 (V)
  capacity: number; // 용량 (Ah)
  energy: number; // 에너지 (Wh)
  maxDischargePower: number; // 최대 방전 출력 (kW)
  standardChargeRate: number; // 표준 충전 전류 (A)
  maxChargeRate: number; // 최대 충전 전류 (A)
  standardDischargeRate: number; // 표준 방전 전류 (A)
  maxDischargeRate: number; // 최대 방전 전류 (A)
}

export const BATTERY_SPEC: BatteryModel = {
  nominalVoltage: 93.6, // 93.6V
  minVoltage: 72.8, // 72.8V
  maxVoltage: 109.2, // 109.2V
  capacity: 31.5, // 31.5Ah
  energy: 2.9484, // 2,948.4Wh -> 2.9484kWh
  maxDischargePower: 7.488, // 7.488kW
  standardChargeRate: 15.75, // 15.75A (0.5C)
  maxChargeRate: 31.5, // 31.5A (1.0C)
  standardDischargeRate: 6.3, // 6.3A (0.2C)
  maxDischargeRate: 80 // 80A
};

/**
 * 배터리 충전 시간 계산 - CC-CV 충전 모델 기반
 * @param currentSOC 현재 배터리 충전 상태 (%)
 * @param targetSOC 목표 배터리 충전 상태 (%)
 * @param chargeRate 충전 비율 (0-1, 1은 최대 충전률)
 * @returns 충전 시간 (시간)
 */
export function calculateChargingTime(
  currentSOC: number,
  targetSOC: number,
  chargeRate: number = 0.5 // 기본값: 0.5C (표준 충전)
): number {
  if (currentSOC >= targetSOC) return 0;
  
  // SOC를 0-1 범위로 변환
  const currentSocFraction = currentSOC / 100;
  const targetSocFraction = targetSOC / 100;
  
  // 충전률에 따른 최대 충전 전류 결정 (A)
  const chargingCurrent = chargeRate * BATTERY_SPEC.capacity; // A (Ah * C-rate)
  
  // CC (정전류) 단계 - 대략 SOC 80%까지 적용
  const ccPhaseEndSoc = Math.min(targetSocFraction, 0.8);
  let ccTimeHours = 0;
  
  if (currentSocFraction < ccPhaseEndSoc) {
    // CC 단계 시간 계산 (h)
    ccTimeHours = (ccPhaseEndSoc - currentSocFraction) * BATTERY_SPEC.capacity / chargingCurrent;
  }
  
  // CV (정전압) 단계 - SOC 80%에서 100%까지
  let cvTimeHours = 0;
  
  if (targetSocFraction > 0.8) {
    // CV 단계는 지수적으로 감소하는 전류를 반영 (대략적인 모델)
    // 타우(시정수)는 충전률에 반비례
    const tau = 1 / chargeRate;
    // CV 단계의 종료 전류는 0.05C
    const endCurrent = 0.05 * BATTERY_SPEC.capacity;
    
    // 단순화된 지수 감소 모델을 사용한 CV 단계 시간 계산
    if (currentSocFraction < 0.8) {
      cvTimeHours = tau * Math.log(chargingCurrent / endCurrent) * (targetSocFraction - 0.8) / 0.2;
    } else {
      cvTimeHours = tau * Math.log(chargingCurrent / endCurrent) * (targetSocFraction - currentSocFraction) / 0.2;
    }
  }
  
  // 총 충전 시간 (시간)
  return ccTimeHours + cvTimeHours;
}

/**
 * 배터리 방전 시간 계산
 * @param currentSOC 현재 배터리 충전 상태 (%)
 * @param powerDraw 방전 출력 (kW)
 * @returns 방전 시간 (시간)
 */
export function calculateDischargeTime(currentSOC: number, powerDraw: number): number {
  if (currentSOC <= 0 || powerDraw <= 0) return 0;
  
  // SOC를 0-1 범위로 변환
  const socFraction = currentSOC / 100;
  
  // 사용 가능한 에너지 (kWh)
  const availableEnergy = socFraction * BATTERY_SPEC.energy;
  
  // 방전 시간 (시간) = 사용 가능한 에너지 / 방전 출력
  return availableEnergy / powerDraw;
}

/**
 * 태양광 발전량과 에너지 소비량을 기반으로 배터리 SOC 변화 계산
 * @param initialSOC 초기 배터리 충전 상태 (%)
 * @param solarProduction 태양광 발전량 (kWh)
 * @param energyConsumption 에너지 소비량 (kWh)
 * @returns 새로운 배터리 SOC (%)
 */
export function calculateNewSOC(
  initialSOC: number,
  solarProduction: number,
  energyConsumption: number
): number {
  // 에너지 순 변화량 (kWh)
  const netEnergyChange = solarProduction - energyConsumption;
  
  // SOC 변화 (%) = 에너지 변화량 / 배터리 용량 * 100
  const socChange = (netEnergyChange / BATTERY_SPEC.energy) * 100;
  
  // 새로운 SOC 계산 및 범위 제한 (0-100%)
  const newSOC = Math.max(0, Math.min(100, initialSOC + socChange));
  
  return newSOC;
}

/**
 * 주행 가능 거리 계산
 * @param currentSOC 현재 배터리 충전 상태 (%)
 * @param energyEfficiency 에너지 효율 (km/kWh)
 * @returns 주행 가능 거리 (km)
 */
export function calculateRangeKm(currentSOC: number, energyEfficiency: number): number {
  // SOC를 0-1 범위로 변환
  const socFraction = currentSOC / 100;
  
  // 사용 가능한 에너지 (kWh)
  const availableEnergy = socFraction * BATTERY_SPEC.energy;
  
  // 주행 가능 거리 (km) = 사용 가능한 에너지 * 에너지 효율
  return availableEnergy * energyEfficiency;
} 