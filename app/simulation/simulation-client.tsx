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
// 2025년 및 다른 연도 사용 시 월/일 기준으로 2023년 데이터를 자동 매핑
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
    avgSpeed: 80.0,
    energyEfficiency: 10.0, // km/kWh
    startDate: new Date("2025-10-22"), // WSC 2025 기준 날짜
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
        0.02, // 기본 경사도
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
                        date < new Date("2025-10-01") || date > new Date("2025-10-31")
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
        <Card></Card>
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

                        {/* Segment Details */}
                        <div className="mt-4">
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            Segment Details
                          </div>
                          <div className="text-xs max-h-28 overflow-y-auto pr-2">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-1">Type</th>
                                  <th className="text-right py-1">Distance</th>
                                  <th className="text-right py-1">
                                    Battery Before
                                  </th>
                                  <th className="text-right py-1">
                                    Battery After
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {day.segments.map((segment, i) => (
                                  <tr key={i} className="border-b border-muted">
                                    <td className="py-1">
                                      {segment.isControlStop
                                        ? `Control Stop: ${segment.controlStopName}`
                                        : segment.batteryChargingStop
                                        ? `Battery Charging (${segment.chargingTime}h)`
                                        : "Driving"}
                                    </td>
                                    <td className="text-right py-1">
                                      {segment.distance.toFixed(1)} km
                                    </td>
                                    <td className="text-right py-1">
                                      {segment.batteryLevelBefore?.toFixed(1) ||
                                        "-"}
                                      %
                                    </td>
                                    <td className="text-right py-1">
                                      {segment.batteryLevelAfter?.toFixed(1) ||
                                        "-"}
                                      %
                                    </td>
                                  </tr>
                                ))}
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
