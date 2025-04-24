"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { RouteItinerary, createRouteItinerary } from "./utils/route-planner";
import { WSC_LOCATIONS, LocationInfo } from "./utils/weather-data-processor";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { TerrainProfile } from "./components/terrain-profile";
import { BATTERY_SPEC } from "./utils/battery-model";

// 참고: 현재 사용 가능한 날씨 데이터 날짜 범위 (2023-08-18 ~ 2023-09-15)
// 2025년 및 다른 연도 사용 시 8/24 기준으로 날짜 매핑
const AVAILABLE_WEATHER_DATA_START = new Date("2023-08-18");
const AVAILABLE_WEATHER_DATA_END = new Date("2023-09-15");
const MAX_SIMULATION_DAYS = 30; // 최대 시뮬레이션 일수

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function SimulationClient() {
  const [simulationParams, setSimulationParams] = useState({
    carMass: 300.0,
    frontalArea: 0.95,
    dragCoefficient: 0.14,
    panelArea: 6.0,
    panelEfficiency: 0.215,
    mpptEfficiency: 0.98,
    avgSpeed: 60.0,
    energyEfficiency: 10.0, // km/kWh
    startDate: new Date("2025-08-24"), // WSC 2025 기준 날짜 (8/24로 변경)
    timeOfDay: 12,
    currentLocation: WSC_LOCATIONS[0], // Default to Adelaide
    lowBatteryThreshold: 25, // 배터리 충전이 필요한 임계값 (%)
    chargingTimeForLowBattery: 2, // 배터리 충전 시간 (시간)
  });
  const [routeItinerary, setRouteItinerary] = useState<RouteItinerary | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParamChange = (
    key: string,
    value: number | string | Date | LocationInfo
  ) => {
    setSimulationParams((prev) => ({
      ...prev,
      [key]:
        typeof value === "string" && !isNaN(parseFloat(value))
          ? parseFloat(value)
          : value,
    }));
  };

  const handleSliderChange = (key: string, value: number[]) => {
    setSimulationParams((prev) => ({
      ...prev,
      [key]: value[0],
    }));
  };

  const runSimulation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 경로 계획 생성 (컨트롤 스탑 포함)
      const itinerary = await createRouteItinerary(
        simulationParams.startDate.toISOString(),
        3022, // WSC 총 거리 (km)
        simulationParams.avgSpeed,
        8, // 일일 주행 시간 (시간)
        simulationParams.energyEfficiency,
        simulationParams.panelArea,
        simulationParams.panelEfficiency,
        simulationParams.mpptEfficiency,
        0.5, // 컨트롤 스탑 정차 시간 (시간)
        simulationParams.lowBatteryThreshold,
        simulationParams.chargingTimeForLowBattery,
        MAX_SIMULATION_DAYS, // 최대 시뮬레이션 일수
        simulationParams.carMass, // 사용자 입력 차량 질량
        0.0, // 기본 경사도 (지형 데이터를 사용할 수 없을 경우 사용)
        simulationParams.frontalArea, // 사용자 입력 전면적
        simulationParams.dragCoefficient // 사용자 입력 공기저항계수
      );

      setRouteItinerary(itinerary);

      // Note: 이전 시뮬레이션 방식은 현재 사용하지 않음
    } catch (err) {
      console.error("Error running simulation:", err);
      setError("Failed to run simulation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Simulation Parameters</CardTitle>
          <CardDescription>
            Configure the simulation parameters and run the solar car driving
            simulation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <div className="flex flex-col">
                    <Calendar
                      mode="single"
                      selected={simulationParams.startDate}
                      onSelect={(date) =>
                        date && handleParamChange("startDate", date)
                      }
                      disabled={(date) =>
                        date < new Date("2025-08-01") || date > new Date("2025-09-30")
                      }
                      initialFocus
                    />
                    <div className="mt-1 text-sm text-muted-foreground">
                      <strong>{formatDate(simulationParams.startDate)}</strong>에 출발합니다.
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="carMass">Car Mass (kg)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      id="carMass-slider"
                      min={200}
                      max={400}
                      step={5}
                      value={[simulationParams.carMass]}
                      onValueChange={(value) =>
                        handleSliderChange("carMass", value)
                      }
                      className="flex-1"
                    />
                    <Input
                      id="carMass"
                      type="number"
                      value={simulationParams.carMass}
                      onChange={(e) =>
                        handleParamChange("carMass", e.target.value)
                      }
                      className="w-20"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="frontalArea">Frontal Area (m²)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      id="frontalArea-slider"
                      min={0.5}
                      max={1.5}
                      step={0.05}
                      value={[simulationParams.frontalArea]}
                      onValueChange={(value) =>
                        handleSliderChange("frontalArea", value)
                      }
                      className="flex-1"
                    />
                    <Input
                      id="frontalArea"
                      type="number"
                      value={simulationParams.frontalArea}
                      onChange={(e) =>
                        handleParamChange("frontalArea", e.target.value)
                      }
                      className="w-20"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dragCoefficient">Drag Coefficient</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      id="dragCoefficient-slider"
                      min={0.05}
                      max={0.3}
                      step={0.01}
                      value={[simulationParams.dragCoefficient]}
                      onValueChange={(value) =>
                        handleSliderChange("dragCoefficient", value)
                      }
                      className="flex-1"
                    />
                    <Input
                      id="dragCoefficient"
                      type="number"
                      value={simulationParams.dragCoefficient}
                      onChange={(e) =>
                        handleParamChange("dragCoefficient", e.target.value)
                      }
                      className="w-20"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="panelArea">Solar Panel Area (m²)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      id="panelArea-slider"
                      min={4}
                      max={8}
                      step={0.1}
                      value={[simulationParams.panelArea]}
                      onValueChange={(value) =>
                        handleSliderChange("panelArea", value)
                      }
                      className="flex-1"
                    />
                    <Input
                      id="panelArea"
                      type="number"
                      value={simulationParams.panelArea}
                      onChange={(e) =>
                        handleParamChange("panelArea", e.target.value)
                      }
                      className="w-20"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="panelEfficiency">Panel Efficiency</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      id="panelEfficiency-slider"
                      min={0.15}
                      max={0.3}
                      step={0.005}
                      value={[simulationParams.panelEfficiency]}
                      onValueChange={(value) =>
                        handleSliderChange("panelEfficiency", value)
                      }
                      className="flex-1"
                    />
                    <Input
                      id="panelEfficiency"
                      type="number"
                      value={simulationParams.panelEfficiency}
                      onChange={(e) =>
                        handleParamChange("panelEfficiency", e.target.value)
                      }
                      className="w-20"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="mpptEfficiency">MPPT Efficiency</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      id="mpptEfficiency-slider"
                      min={0.9}
                      max={1}
                      step={0.01}
                      value={[simulationParams.mpptEfficiency]}
                      onValueChange={(value) =>
                        handleSliderChange("mpptEfficiency", value)
                      }
                      className="flex-1"
                    />
                    <Input
                      id="mpptEfficiency"
                      type="number"
                      value={simulationParams.mpptEfficiency}
                      onChange={(e) =>
                        handleParamChange("mpptEfficiency", e.target.value)
                      }
                      className="w-20"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="lowBatteryThreshold">
                    Low Battery Threshold (%)
                  </Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      id="lowBatteryThreshold-slider"
                      min={10}
                      max={50}
                      step={5}
                      value={[simulationParams.lowBatteryThreshold]}
                      onValueChange={(value) =>
                        handleSliderChange("lowBatteryThreshold", value)
                      }
                      className="flex-1"
                    />
                    <Input
                      id="lowBatteryThreshold"
                      type="number"
                      value={simulationParams.lowBatteryThreshold}
                      onChange={(e) =>
                        handleParamChange("lowBatteryThreshold", e.target.value)
                      }
                      className="w-20"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="chargingTimeForLowBattery">
                    Charging Time (hours)
                  </Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      id="chargingTimeForLowBattery-slider"
                      min={0.5}
                      max={5}
                      step={0.5}
                      value={[simulationParams.chargingTimeForLowBattery]}
                      onValueChange={(value) =>
                        handleSliderChange("chargingTimeForLowBattery", value)
                      }
                      className="flex-1"
                    />
                    <Input
                      id="chargingTimeForLowBattery"
                      type="number"
                      value={simulationParams.chargingTimeForLowBattery}
                      onChange={(e) =>
                        handleParamChange(
                          "chargingTimeForLowBattery",
                          e.target.value
                        )
                      }
                      className="w-20"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="avgSpeed">Average Speed (km/h)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      id="avgSpeed-slider"
                      min={40}
                      max={100}
                      step={5}
                      value={[simulationParams.avgSpeed]}
                      onValueChange={(value) =>
                        handleSliderChange("avgSpeed", value)
                      }
                      className="flex-1"
                    />
                    <Input
                      id="avgSpeed"
                      type="number"
                      value={simulationParams.avgSpeed}
                      onChange={(e) =>
                        handleParamChange("avgSpeed", e.target.value)
                      }
                      className="w-20"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={runSimulation}
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Running Simulation..." : "Run Simulation"}
            </Button>

            {error && <div className="text-destructive text-sm">{error}</div>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Battery & Motor Specifications</CardTitle>
          <CardDescription>
            Detailed specifications of battery and motor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-muted/30 p-3 rounded-md border border-muted">
                <h3 className="text-sm font-semibold mb-2">배터리 사양</h3>
                <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-xs">
                  <div className="text-muted-foreground">용량:</div>
                  <div>
                    {BATTERY_SPEC.energy.toFixed(1)} kWh (
                    {BATTERY_SPEC.capacity} Ah)
                  </div>
                  <div className="text-muted-foreground">공칭 전압:</div>
                  <div>
                    {BATTERY_SPEC.nominalVoltage} V ({BATTERY_SPEC.minVoltage} ~{" "}
                    {BATTERY_SPEC.maxVoltage} V)
                  </div>
                  <div className="text-muted-foreground">최대 방전 출력:</div>
                  <div>{BATTERY_SPEC.maxDischargePower} kW</div>
                  <div className="text-muted-foreground">최대 방전 전류:</div>
                  <div>{BATTERY_SPEC.maxDischargeRate} A</div>
                  <div className="text-muted-foreground">표준 충전 전류:</div>
                  <div>{BATTERY_SPEC.standardChargeRate} A (0.5C)</div>
                  <div className="text-muted-foreground">최대 충전 전류:</div>
                  <div>{BATTERY_SPEC.maxChargeRate} A (1.0C)</div>
                </div>
              </div>
              <div className="bg-muted/30 p-3 rounded-md border border-muted">
                <h3 className="text-sm font-semibold mb-2">모터 사양</h3>
                <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-xs">
                  <div className="text-muted-foreground">모터 타입:</div>
                  <div>PMSM (영구자석 동기 모터)</div>
                  <div className="text-muted-foreground">정격 출력:</div>
                  <div>3 kW</div>
                  <div className="text-muted-foreground">최대 출력:</div>
                  <div>5 kW</div>
                  <div className="text-muted-foreground">정격 토크:</div>
                  <div>12 Nm</div>
                  <div className="text-muted-foreground">최대 토크:</div>
                  <div>20 Nm</div>
                  <div className="text-muted-foreground">정격 RPM:</div>
                  <div>2400 RPM</div>
                  <div className="text-muted-foreground">최대 RPM:</div>
                  <div>3600 RPM</div>
                  <div className="text-muted-foreground">효율:</div>
                  <div>96%</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <Card className="bg-muted/30 p-3 rounded-md border border-muted">
          <h3 className="text-sm font-semibold mb-2">시뮬레이션 정보</h3>
          <div className="grid grid-cols-1 gap-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">지형 데이터:</span>
              <span>실제 WSC 경로 CSV 데이터 기반</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">경사도 계산:</span>
              <span>실시간 위치 기반 자동 계산</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">총 경로 거리:</span>
              <span>3,022 km</span>
            </div>
          </div>
        </Card>
      </Card>

      {routeItinerary && (
        <Card>
          <CardHeader>
            <CardTitle>Simulation Results</CardTitle>
            <CardDescription>
              Detailed daily results and final summary
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Daily Result Cards */}
              {routeItinerary.dailyItinerary
                .filter(day => day.totalDistance > 0) // 주행 거리가 0보다 큰 날만 표시
                .map((day, index) => (
                <Card
                  key={day.date}
                  className={`overflow-hidden ${
                    index === routeItinerary.dailyItinerary.filter(d => d.totalDistance > 0).length - 1
                      ? "border-2 border-primary"
                      : ""
                  }`}
                >
                  <CardHeader className="bg-muted p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg">
                          Day {day.day}:{" "}
                          {new Date(day.date).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </CardTitle>
                        <CardDescription>
                          {day.totalDistance.toFixed(1)} km driven
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        {day.segments.some(
                          (segment) => segment.isControlStop
                        ) && (
                          <Badge className="bg-blue-500">Control Stop</Badge>
                        )}
                        {day.segments.some(
                          (segment) => segment.batteryChargingStop
                        ) && (
                          <Badge className="bg-amber-500">
                            Battery Charged
                          </Badge>
                        )}
                        {index === routeItinerary.dailyItinerary.filter(d => d.totalDistance > 0).length - 1 && (
                          <Badge className={`${day.endKm >= 3022 ? "bg-green-600 text-white font-bold px-3" : "bg-green-500"}`}>
                            {day.endKm >= 3022 ? "DESTINATION REACHED" : "Finish"}
                          </Badge>
                        )}
                        {index === routeItinerary.dailyItinerary.filter(d => d.totalDistance > 0).length - 1 && day.reachedMaxDays && (
                          <Badge className="bg-red-500">Max Days Reached</Badge>
                        )}
                        {index === 0 && (
                          <Badge className="bg-purple-500">Start</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left column - Car Visualization */}
                      <div className="border rounded-md overflow-hidden h-[300px]">
                        <div className="h-1/2 p-2">
                          <h4 className="text-xs font-medium mb-1">
                            지형 프로필
                          </h4>
                          <TerrainProfile
                            segments={day.segments}
                            height={120}
                          />
                        </div>
                      </div>

                      {/* Right column - Day Info */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-muted-foreground">
                              Distance & Location
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Start
                                </div>
                                <div className="text-sm font-medium">
                                  {day.startKm.toFixed(1)} km
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  End
                                </div>
                                <div className="text-sm font-medium">
                                  {day.endKm.toFixed(1)} km
                                </div>
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="text-xs text-muted-foreground">
                                Control Stops
                              </div>
                              <div className="text-sm font-medium">
                                {day.segments
                                  .filter((segment) => segment.isControlStop)
                                  .map((segment) => segment.controlStopName)
                                  .join(", ") || "None"}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="text-sm font-medium text-muted-foreground">
                              Energy
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Production
                                </div>
                                <div className="text-sm font-medium text-green-600">
                                  {day.energyProduction.toFixed(2)} kWh
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Consumption
                                </div>
                                <div className="text-sm font-medium text-red-600">
                                  {day.energyConsumption.toFixed(2)} kWh
                                </div>
                              </div>
                            </div>
                            <div className="mt-1">
                              <div className="text-xs text-muted-foreground">
                                Balance
                              </div>
                              <div
                                className={`text-sm font-medium ${
                                  day.energyProduction -
                                    day.energyConsumption >=
                                  0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {(
                                  day.energyProduction - day.energyConsumption
                                ).toFixed(2)}{" "}
                                kWh
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="text-sm font-medium text-muted-foreground">
                              Battery Status
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Start Level
                                </div>
                                <div className="text-sm font-medium">
                                  {day.startBatteryLevel.toFixed(1)}%
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  End Level
                                </div>
                                <div
                                  className={`text-sm font-medium ${
                                    day.endBatteryLevel < 30
                                      ? "text-red-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  {day.endBatteryLevel.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                            {day.totalChargingTime > 0 && (
                              <div className="mt-1">
                                <div className="text-xs text-muted-foreground">
                                  Charging Time
                                </div>
                                <div className="text-sm font-medium">
                                  {day.totalChargingTime.toFixed(1)} hours
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Segment Details - 시계열 데이터 형태로 표시 */}
                        <div className="mt-4">
                          <div className="text-sm font-medium text-muted-foreground mb-2 flex justify-between items-center">
                            <span>Time Series Data (8시간 주행)</span>
                            <span className="text-xs text-muted-foreground">10초 간격 샘플링</span>
                          </div>
                          <div className="text-xs max-h-40 overflow-y-auto pr-2">
                            <table className="w-full border-collapse">
                              <thead className="sticky top-0 bg-background z-10">
                                <tr className="border-b">
                                  <th className="text-left py-1 px-1">시간</th>
                                  <th className="text-left py-1 px-1">상태</th>
                                  <th className="text-right py-1 px-1">위치 (km)</th>
                                  <th className="text-right py-1 px-1">속도 (km/h)</th>
                                  <th className="text-right py-1 px-1">배터리 (%)</th>
                                  <th className="text-right py-1 px-1">변화</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  // 정확히 8시간(28,800초)을 10초 간격으로 분할
                                  const TOTAL_SECONDS = 8 * 60 * 60; // 8시간
                                  const INTERVAL = 10; // 10초 간격
                                  const TOTAL_INTERVALS = TOTAL_SECONDS / INTERVAL;
                                  
                                  // 시계열 데이터 생성
                                  const timeSeriesRows: React.ReactNode[] = [];
                                  let currentTime = 0; // 시간 (초)
                                  let currentDistance = 0; // 현재 이동 거리 (km)
                                  let currentBattery = day.startBatteryLevel; // 현재 배터리 잔량
                                  let currentSegmentIndex = 0; // 현재 처리 중인 세그먼트 인덱스
                                  let remainingSegmentTime = 0; // 현재 세그먼트에서 남은 시간 (초)
                                  let currentSpeed = 0; // 현재 속도
                                  let currentState = ''; // 현재 상태 (주행중, 충전중, 컨트롤 스탑)
                                  let batteryRatePerInterval = 0; // 10초당 배터리 변화율
                                  
                                  // 각 간격마다 데이터 포인트 생성
                                  for (let interval = 0; interval < TOTAL_INTERVALS; interval++) {
                                    // 이전 배터리 값 저장
                                    const prevBattery = currentBattery;
                                    
                                    // 현재 처리해야 할 세그먼트 가져오기
                                    const currentSegment = day.segments[currentSegmentIndex];
                                    
                                    // 세그먼트가 없으면 루프 종료
                                    if (!currentSegment) {
                                      break; // 모든 세그먼트가 완료되면 시간 진행 중단
                                    } else {
                                      // 새 세그먼트를 시작하는 경우
                                      if (remainingSegmentTime <= 0) {
                                        // 세그먼트 유형에 따라 처리
                                        if (currentSegment.segmentType === 'Driving') {
                                          // 주행 세그먼트
                                          const segmentDistance = currentSegment.distance;
                                          const speed = simulationParams.avgSpeed;
                                          const driveTimeHours = segmentDistance / speed;
                                          const driveTimeSeconds = driveTimeHours * 3600;
                                          
                                          // 세그먼트 정보 설정
                                          currentState = '주행중';
                                          currentSpeed = speed;
                                          remainingSegmentTime = driveTimeSeconds;
                                          
                                          // 배터리 소모율 계산 (10초당)
                                          const batteryStart = currentSegment.batteryLevelBefore !== undefined ? currentSegment.batteryLevelBefore : currentBattery;
                                          const batteryEnd = currentSegment.batteryLevelAfter !== undefined ? currentSegment.batteryLevelAfter : 0;
                                          const totalBatteryChange = batteryEnd - batteryStart;
                                          batteryRatePerInterval = (totalBatteryChange / driveTimeSeconds) * INTERVAL;
                                        } else if (currentSegment.segmentType === 'ControlStop') {
                                          // 컨트롤 스탑
                                          const stopTimeHours = currentSegment.chargingTime || 0.5;
                                          const stopTimeSeconds = stopTimeHours * 3600;
                                          
                                          // 세그먼트 정보 설정
                                          currentState = `컨트롤 스탑: ${currentSegment.controlStopName}`;
                                          currentSpeed = 0;
                                          remainingSegmentTime = stopTimeSeconds;
                                          
                                          // 배터리 변화율 계산 (컨트롤 스탑에서는 유지)
                                          batteryRatePerInterval = 0;
                                        } else if (currentSegment.segmentType === 'BatteryCharging') {
                                          // 배터리 충전
                                          const chargeTimeHours = currentSegment.chargingTime || 0;
                                          const chargeTimeSeconds = chargeTimeHours * 3600;
                                          
                                          // 세그먼트 정보 설정
                                          currentState = '배터리 충전';
                                          currentSpeed = 0;
                                          remainingSegmentTime = chargeTimeSeconds;
                                          
                                          // 배터리 충전율 계산 (10초당)
                                          const batteryStart = currentSegment.batteryLevelBefore !== undefined ? currentSegment.batteryLevelBefore : currentBattery;
                                          const batteryEnd = currentSegment.batteryLevelAfter !== undefined ? currentSegment.batteryLevelAfter : 100;
                                          const totalChargeAmount = batteryEnd - batteryStart;
                                          batteryRatePerInterval = (totalChargeAmount / chargeTimeSeconds) * INTERVAL;
                                        }
                                      }
                                      
                                      // 세그먼트 시간 감소
                                      remainingSegmentTime -= INTERVAL;
                                      
                                      // 세그먼트 완료 여부 확인
                                      if (remainingSegmentTime <= 0) {
                                        // 마지막 간격에서는 정확한 최종 배터리 값으로 설정
                                        if (currentSegment.batteryLevelAfter !== undefined) {
                                          currentBattery = currentSegment.batteryLevelAfter;
                                        }
                                        
                                        // 마지막 간격에서는 정확한 최종 위치로 설정
                                        if (currentSegment.segmentType === 'Driving') {
                                          currentDistance = currentSegment.endKm;
                                        }
                                        
                                        // 다음 세그먼트로 이동 - 바로 다음 세그먼트 처리 준비
                                        currentSegmentIndex++;
                                        
                                        // 다음 세그먼트가 있는지 확인
                                        const nextSegment = day.segments[currentSegmentIndex];
                                        if (nextSegment) {
                                          // 배터리가 25% 이상이면 무조건 주행 세그먼트로 전환
                                          if (currentBattery >= 25 && nextSegment.segmentType !== 'Driving' && currentSegmentIndex + 1 < day.segments.length) {
                                            // 다음에 주행 세그먼트가 있는지 확인
                                            let nextDrivingSegmentIndex = -1;
                                            for (let i = currentSegmentIndex + 1; i < day.segments.length; i++) {
                                              if (day.segments[i].segmentType === 'Driving') {
                                                nextDrivingSegmentIndex = i;
                                                break;
                                              }
                                            }
                                            
                                            // 다음 주행 세그먼트가 있으면 현재 세그먼트를 건너뛰고 주행 세그먼트로 전환
                                            if (nextDrivingSegmentIndex !== -1) {
                                              currentSegmentIndex = nextDrivingSegmentIndex;
                                              const drivingSegment = day.segments[currentSegmentIndex];
                                              
                                              // 주행 세그먼트 설정
                                              const segmentDistance = drivingSegment.distance;
                                              const speed = simulationParams.avgSpeed;
                                              const driveTimeHours = segmentDistance / speed;
                                              const driveTimeSeconds = driveTimeHours * 3600;
                                              
                                              currentState = '주행중';
                                              currentSpeed = speed;
                                              remainingSegmentTime = driveTimeSeconds;
                                              
                                              // 배터리 소모율 계산
                                              const batteryStart = drivingSegment.batteryLevelBefore !== undefined ? drivingSegment.batteryLevelBefore : currentBattery;
                                              const batteryEnd = drivingSegment.batteryLevelAfter !== undefined ? drivingSegment.batteryLevelAfter : 0;
                                              const totalBatteryChange = batteryEnd - batteryStart;
                                              batteryRatePerInterval = (totalBatteryChange / driveTimeSeconds) * INTERVAL;
                                              
                                              continue;
                                            }
                                          }
                                          
                                          // 기존 세그먼트 처리 로직
                                          if (nextSegment.segmentType === 'Driving') {
                                            // 주행 세그먼트
                                            const segmentDistance = nextSegment.distance;
                                            const speed = simulationParams.avgSpeed;
                                            const driveTimeHours = segmentDistance / speed;
                                            const driveTimeSeconds = driveTimeHours * 3600;
                                            
                                            // 세그먼트 정보 설정
                                            currentState = '주행중';
                                            currentSpeed = speed;
                                            remainingSegmentTime = driveTimeSeconds;
                                            
                                            // 배터리 소모율 계산 (10초당)
                                            const batteryStart = nextSegment.batteryLevelBefore !== undefined ? nextSegment.batteryLevelBefore : currentBattery;
                                            const batteryEnd = nextSegment.batteryLevelAfter !== undefined ? nextSegment.batteryLevelAfter : 0;
                                            const totalBatteryChange = batteryEnd - batteryStart;
                                            batteryRatePerInterval = (totalBatteryChange / driveTimeSeconds) * INTERVAL;
                                          } else if (nextSegment.segmentType === 'ControlStop') {
                                            // 컨트롤 스탑
                                            const stopTimeHours = nextSegment.chargingTime || 0.5;
                                            const stopTimeSeconds = stopTimeHours * 3600;
                                            
                                            // 세그먼트 정보 설정
                                            currentState = `컨트롤 스탑: ${nextSegment.controlStopName}`;
                                            currentSpeed = 0;
                                            remainingSegmentTime = stopTimeSeconds;
                                            
                                            // 배터리 변화율 계산 (컨트롤 스탑에서는 유지)
                                            batteryRatePerInterval = 0;
                                          } else if (nextSegment.segmentType === 'BatteryCharging') {
                                            // 배터리 충전
                                            const chargeTimeHours = nextSegment.chargingTime || 0;
                                            const chargeTimeSeconds = chargeTimeHours * 3600;
                                            
                                            // 세그먼트 정보 설정
                                            currentState = '배터리 충전';
                                            currentSpeed = 0;
                                            remainingSegmentTime = chargeTimeSeconds;
                                            
                                            // 배터리 충전율 계산 (10초당)
                                            const batteryStart = nextSegment.batteryLevelBefore !== undefined ? nextSegment.batteryLevelBefore : currentBattery;
                                            const batteryEnd = nextSegment.batteryLevelAfter !== undefined ? nextSegment.batteryLevelAfter : 100;
                                            const totalChargeAmount = batteryEnd - batteryStart;
                                            batteryRatePerInterval = (totalChargeAmount / chargeTimeSeconds) * INTERVAL;
                                          }
                                        } else {
                                          // 다음 세그먼트가 없음 - 대기 상태로 전환
                                          currentState = '대기중';
                                          currentSpeed = 0;
                                          batteryRatePerInterval = 0;
                                          remainingSegmentTime = 0;
                                        }
                                      } else {
                                        // 배터리 업데이트
                                        currentBattery += batteryRatePerInterval;
                                        
                                        // 배터리 레벨 범위 제한 (0~100%)
                                        currentBattery = Math.max(0, Math.min(100, currentBattery));
                                        
                                        // 배터리가 25% 이하로 떨어지면 즉시 충전으로 전환
                                        if (currentBattery <= 25 && currentSegment.segmentType === 'Driving') {
                                          // 현재 위치에서 충전으로 전환
                                          currentState = '배터리 충전';
                                          currentSpeed = 0;
                                          
                                          // 남은 시간을 충전 시간으로 설정 (2시간)
                                          const chargingTimeHours = simulationParams.chargingTimeForLowBattery;
                                          const chargingTimeSeconds = chargingTimeHours * 3600;
                                          remainingSegmentTime = chargingTimeSeconds;
                                          
                                          // 충전 속도 계산 (10초당)
                                          const targetBatteryLevel = 60; // 최소 60%까지 충전
                                          const totalChargeAmount = targetBatteryLevel - currentBattery;
                                          batteryRatePerInterval = (totalChargeAmount / chargingTimeSeconds) * INTERVAL;
                                          
                                          // 현재 세그먼트를 충전 세그먼트로 강제 변경
                                          // 이 값은 시각화에만 사용됨
                                          currentSegment.segmentType = 'BatteryCharging';
                                          continue;
                                        }
                                        
                                        // 주행 중인 경우 거리 업데이트
                                        if (currentSegment.segmentType === 'Driving') {
                                          // 10초 동안 이동한 거리 계산 (km)
                                          const distancePerInterval = (currentSpeed / 3600) * INTERVAL;
                                          currentDistance += distancePerInterval;
                                        }
                                      }
                                    }
                                    
                                    // 시간 포맷팅 (HH:MM:SS)
                                    const hours = Math.floor(currentTime / 3600);
                                    const minutes = Math.floor((currentTime % 3600) / 60);
                                    const seconds = currentTime % 60;
                                    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                                    
                                    // 배터리 변화량 계산
                                    const batteryChange = currentBattery - prevBattery;
                                    const batteryChangeStr = batteryChange >= 0 
                                      ? `+${batteryChange.toFixed(2)}`
                                      : `${batteryChange.toFixed(2)}`;
                                    
                                    // 상태에 따른 스타일 클래스 결정
                                    let rowClassName = 'border-b hover:bg-muted/20';
                                    let stateElement;
                                    
                                    if (currentState === '주행중') {
                                      rowClassName += ' border-green-50';
                                      stateElement = (
                                        <span className="inline-block rounded-sm px-1 text-green-700 bg-green-50">
                                          주행중
                                        </span>
                                      );
                                    } else if (currentState.includes('컨트롤 스탑')) {
                                      rowClassName += ' bg-blue-50/70';
                                      stateElement = (
                                        <span className="inline-block rounded-sm px-1 text-blue-700 bg-blue-50">
                                          {currentState}
                                        </span>
                                      );
                                    } else if (currentState === '배터리 충전') {
                                      rowClassName += ' bg-amber-50/70';
                                      stateElement = (
                                        <span className="inline-block rounded-sm px-1 text-amber-700 bg-amber-50">
                                          배터리 충전
                                        </span>
                                      );
                                    } else {
                                      stateElement = (
                                        <span className="inline-block rounded-sm px-1 text-gray-700 bg-gray-50">
                                          {currentState || '대기중'}
                                        </span>
                                      );
                                    }
                                    
                                    // 매 분마다 시간 표시를 강조
                                    const isMinuteStart = seconds === 0;
                                    if (isMinuteStart) {
                                      rowClassName += ' border-t border-muted';
                                    }
                                    
                                    // 행 추가
                                    timeSeriesRows.push(
                                      <tr 
                                        key={`time-${currentTime}`} 
                                        className={rowClassName}
                                      >
                                        <td className="text-left py-1 px-1 font-mono text-xs">
                                          {timeStr}
                                        </td>
                                        <td className="text-left py-1 px-1">
                                          {stateElement}
                                        </td>
                                        <td className="text-right py-1 px-1 font-mono">
                                          {currentDistance.toFixed(2)}
                                        </td>
                                        <td className="text-right py-1 px-1 font-mono">
                                          {currentSpeed}
                                        </td>
                                        <td className="text-right py-1 px-1 font-mono">
                                          {currentBattery.toFixed(2)}
                                        </td>
                                        <td className="text-right py-1 px-1 font-mono text-red-600">
                                          {batteryChangeStr}
                                        </td>
                                      </tr>
                                    );
                                    
                                    // 시간 증가 (10초)
                                    currentTime += INTERVAL;
                                  }
                                  
                                  return timeSeriesRows;
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Final Summary Card */}
              <Card className="border-2 border-primary">
                <CardHeader className="bg-primary text-primary-foreground p-4">
                  <CardTitle>Final Simulation Results</CardTitle>
                  <CardDescription className="text-primary-foreground/80">
                    Overall journey summary
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {simulationParams.startDate < AVAILABLE_WEATHER_DATA_START ||
                  simulationParams.startDate > AVAILABLE_WEATHER_DATA_END ? (
                    <div className="mb-4 p-3 bg-amber-50 text-amber-800 rounded-md text-sm">
                      <p>
                        <strong>참고:</strong> 2023년 기상 데이터를 사용하여
                        시뮬레이션을 수행했습니다. 선택한 날짜의 월/일과 동일한
                        2023년 날짜의 데이터가 적용되었습니다.
                        {simulationParams.startDate.getFullYear() > 2023 &&
                          " 이는 2025년 월드 솔라 챌린지를 위한 예측 시뮬레이션입니다."}
                      </p>
                    </div>
                  ) : null}
                  
                  {routeItinerary.dailyItinerary.length > 0 && 
                   routeItinerary.dailyItinerary[routeItinerary.dailyItinerary.length - 1].reachedMaxDays && (
                    <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md text-sm">
                      <p>
                        <strong>주의:</strong> 시뮬레이션이 최대 허용 일수({MAX_SIMULATION_DAYS}일)에 도달하여 종료되었습니다.
                        실제 주행에서는 더 많은 시간이 소요될 수 있습니다.
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">
                          Total Journey
                        </div>
                        <div className="text-2xl font-bold">
                          {routeItinerary.totalDistance.toFixed(1)} km
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {routeItinerary.dailyItinerary.filter(day => day.totalDistance > 0).length} days
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">
                          Departure Date
                        </div>
                        <div className="text-lg font-medium">
                          {new Date(
                            simulationParams.startDate
                          ).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">
                          Arrival Date
                        </div>
                        <div className="text-lg font-medium">
                          {routeItinerary.estimatedArrivalDate.toLocaleDateString(
                            "en-US",
                            {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">
                          Energy Production
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {routeItinerary.totalEnergyProduction.toFixed(1)} kWh
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">
                          Energy Consumption
                        </div>
                        <div className="text-2xl font-bold text-red-600">
                          {routeItinerary.totalEnergyConsumption.toFixed(1)} kWh
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">
                          Energy Balance
                        </div>
                        <div
                          className={`text-2xl font-bold ${
                            routeItinerary.totalEnergyProduction -
                              routeItinerary.totalEnergyConsumption >=
                            0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {(
                            routeItinerary.totalEnergyProduction -
                            routeItinerary.totalEnergyConsumption
                          ).toFixed(1)}{" "}
                          kWh
                        </div>
                        <div className="w-full mt-1">
                          <Progress
                            value={Math.min(
                              100,
                              (routeItinerary.totalEnergyProduction /
                                routeItinerary.totalEnergyConsumption) *
                                100
                            )}
                            className="h-2"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">
                          Battery Performance
                        </div>
                        <div className="text-2xl font-bold">
                          {routeItinerary.averageBatteryLevel.toFixed(1)}% avg.
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {routeItinerary.totalChargingTime.toFixed(1)} hours
                          charging
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">
                          Vehicle Parameters
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                          <div>
                            <span className="text-muted-foreground">
                              Speed:
                            </span>{" "}
                            {simulationParams.avgSpeed} km/h
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Efficiency:
                            </span>{" "}
                            {simulationParams.energyEfficiency} km/kWh
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Battery:
                            </span>{" "}
                            {BATTERY_SPEC.energy.toFixed(1)} kWh
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Voltage:
                            </span>{" "}
                            {BATTERY_SPEC.nominalVoltage.toFixed(1)}V
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Panel Area:
                            </span>{" "}
                            {simulationParams.panelArea} m²
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Panel Eff:
                            </span>{" "}
                            {(simulationParams.panelEfficiency * 100).toFixed(
                              1
                            )}
                            %
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Low Batt Threshold:
                            </span>{" "}
                            {simulationParams.lowBatteryThreshold}%
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Max Discharge:
                            </span>{" "}
                            {BATTERY_SPEC.maxDischargePower.toFixed(1)} kW
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {!routeItinerary && !isLoading && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Simulation Results</CardTitle>
              <CardDescription>
                Results will appear here after running the simulation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-40 border rounded-md border-dashed">
                <p className="text-muted-foreground">
                  Run the simulation to see results
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
