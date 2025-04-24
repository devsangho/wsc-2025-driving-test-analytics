/**
 * 라우트 플래너 관련 타입 정의
 */

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
  segmentType?: 'Driving' | 'ControlStop' | 'BatteryCharging'; // 세그먼트 타입
  startTime?: string; // 세그먼트 시작 시간 (예: "10:00:00")
  endTime?: string; // 세그먼트 종료 시간 (예: "12:30:00")
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
  estimatedArrivalTime: string; // 도착 예상 시간 (HH:MM:SS 형식)
  totalChargingTime: number; // 총 충전 시간 (시간)
  averageBatteryLevel: number; // 평균 배터리 잔량 (%)
}

/**
 * 시뮬레이션 설정 파라미터
 */
export interface SimulationParameters {
  startDate: string;
  totalDistance: number;
  averageSpeed: number;
  drivingHoursPerDay: number;
  energyEfficiency: number;
  panelArea: number;
  panelEfficiency: number;
  mpptEfficiency: number;
  controlStopDuration: number;
  lowBatteryThreshold: number;
  chargingTimeForLowBattery: number;
  maxDays: number;
  mass: number;
  defaultSlope: number;
  frontalArea: number;
  dragCoefficient: number;
} 