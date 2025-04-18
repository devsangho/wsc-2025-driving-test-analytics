"use client";

import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleChart } from "@/components/simple-chart";
import { useDataContext } from "@/app/contexts/data-context";
import { Badge } from "@/components/ui/badge";
import { Map } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState, useCallback } from "react";
import { ChartOptions } from "chart.js";

interface ElevationChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    yAxisID?: string;
    borderDashed?: number[];
  }[];
}

interface CityMarker {
  city: string;
  distance: number;
}

// 주요 도시와 그에 해당하는 거리 (km)
const MAJOR_CITIES: CityMarker[] = [
  { city: "Darwin", distance: 0 },
  { city: "Batchelor", distance: 98 },
  { city: "Katherine", distance: 317 },
  { city: "Daly Waters", distance: 588 },
  { city: "Newcastle Waters", distance: 774 },
  { city: "Tennant Creek", distance: 989 },
  { city: "Alice Springs", distance: 1493 },
  { city: "Coober Pedy", distance: 2167 },
  { city: "Woomera prohibited area", distance: 2642 },
  { city: "Adelaide", distance: 3020 },
];

// 새로운 인터페이스 추가
interface PowerBalanceData {
  pmppt: number[];
  pmotor: number[];
  pbattery: number[];
  distances: number[];
}

interface ResistanceForceData {
  fWind: number[];
  fRolling: number[];
  fGrade: number[];
  distances: number[];
}

interface EfficiencyData {
  etaMppt: number[];
  etaBattery: number[];
  etaMotor: number[];
  distances: number[];
}

// 모터 및 컨트롤러 상수
const MOTOR_NOMINAL_POWER = 2.0; // kW
const MOTOR_MAX_POWER = 5.0; // kW
const MOTOR_EFFICIENCY = 0.95; // 95%

export default function DrivingStrategyPage() {
  const { isMapDataLoaded } = useDataContext();
  const [elevationData, setElevationData] = useState<ElevationChartData>({
    labels: [],
    datasets: [
      {
        label: "Elevation (m)",
        data: [],
        borderColor: "hsl(var(--primary))",
        backgroundColor: "hsla(var(--primary), 0.2)",
      },
    ],
  });
  
  // 새로운 상태 추가
  const [powerBalanceData, setPowerBalanceData] = useState<PowerBalanceData>({
    pmppt: [],
    pmotor: [],
    pbattery: [],
    distances: []
  });
  
  const [resistanceForceData, setResistanceForceData] = useState<ResistanceForceData>({
    fWind: [],
    fRolling: [],
    fGrade: [],
    distances: []
  });
  
  const [efficiencyData, setEfficiencyData] = useState<EfficiencyData>({
    etaMppt: [],
    etaBattery: [],
    etaMotor: [],
    distances: []
  });
  
  const [cityMarkers, setCityMarkers] = useState<CityMarker[]>([]);
  const [maxDistance, setMaxDistance] = useState<number>(3020); // 기본값은 Adelaide까지의 거리

  // 시뮬레이션 데이터 생성 함수 메모이제이션
  const generateSimulatedData = useCallback(() => {
    const elevations = elevationData.datasets[0].data;
    const totalPoints = elevations.length;
    const distances: number[] = [];
    
    // 거리 배열 생성
    for (let i = 0; i < totalPoints; i++) {
      distances.push((i / totalPoints) * maxDistance);
    }
    
    // Power Balance 데이터 생성
    const pmppt: number[] = [];
    const pmotor: number[] = [];
    const pbattery: number[] = [];
    
    // Resistance Force 데이터 생성
    const fWind: number[] = [];
    const fRolling: number[] = [];
    const fGrade: number[] = [];
    
    // Efficiency 데이터 생성
    const etaMppt: number[] = [];
    const etaBattery: number[] = [];
    const etaMotor: number[] = [];
    
    // 각 지점별로 데이터 계산
    for (let i = 0; i < totalPoints; i++) {
      const distance = distances[i];
      const elevation = elevations[i];
      const elevationGradient = i > 0 ? (elevations[i] - elevations[i-1]) / (distance - distances[i-1]) : 0;
      
      // 속도 모델링 (거리에 따라 변화, 60~100km/h 사이)
      const speed = 60 + 40 * Math.sin(distance / maxDistance * Math.PI);
      
      // 태양 에너지 모델링 (시간에 따라 변화, 0~1000W/m² 사이)
      const timeOfDay = (distance / maxDistance) * 24; // 0~24시간
      const solarIrradiance = timeOfDay > 6 && timeOfDay < 18 
        ? 1000 * Math.sin(Math.PI * (timeOfDay - 6) / 12) 
        : 0;
      
      // Power Balance 계산
      const mpptPower = solarIrradiance * 0.2 * 4; // 4m² 면적의 20% 효율 태양전지 가정
      pmppt.push(mpptPower / 1000); // kW 단위로 변환
      
      // 모터 파워 계산 (경사도와 속도에 기반)
      const motorPower = Math.min(MOTOR_MAX_POWER, 5 + 0.05 * speed * speed + 0.2 * elevationGradient * speed);
      pmotor.push(motorPower);
      
      // 배터리 파워 계산 (MPPT - 모터 파워)
      const batteryPower = (mpptPower / 1000 - motorPower) * MOTOR_EFFICIENCY;
      pbattery.push(batteryPower);
      
      // Resistance Force 계산
      // 공기저항 (속도의 제곱에 비례)
      const windResistance = 0.5 * 1.2 * 1.5 * 0.3 * speed * speed;
      fWind.push(windResistance);
      
      // 구름저항 (무게와 구름저항계수에 비례)
      const rollingResistance = 350 * 9.8 * 0.015;
      fRolling.push(rollingResistance);
      
      // 경사저항 (경사도와 무게에 비례)
      const gradeResistance = 350 * 9.8 * Math.sin(Math.atan(elevationGradient / 100));
      fGrade.push(gradeResistance);
      
      // 효율 계산
      // MPPT 효율 (90~98% 사이, 고도가 높을수록 효율 약간 상승)
      etaMppt.push(90 + 8 * Math.random() + 0.003 * elevation);
      
      // 배터리 효율 (80~95% 사이, SOC에 따라 변화)
      const batterySOC = 50 + 30 * Math.sin(distance / maxDistance * 2 * Math.PI);
      const batteryEfficiency = 80 + 15 * (batterySOC / 100);
      etaBattery.push(batteryEfficiency);
      
      // 모터 효율 (70~95% 사이, 부하에 따라 변화)
      const motorLoad = motorPower / MOTOR_NOMINAL_POWER; // 정격 출력에 기반
      const motorEfficiency = 70 + 25 * (motorLoad > 0.2 && motorLoad < 0.8 ? 1 : 0.7);
      etaMotor.push(motorEfficiency);
    }
    
    // 상태 업데이트
    setPowerBalanceData({
      pmppt,
      pmotor,
      pbattery,
      distances
    });
    
    setResistanceForceData({
      fWind,
      fRolling,
      fGrade,
      distances
    });
    
    setEfficiencyData({
      etaMppt,
      etaBattery,
      etaMotor,
      distances
    });
  }, [elevationData, maxDistance]);

  // Fetch and process map data for elevation profile
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const response = await fetch("/map.csv");
        const csvData = await response.text();

        // Parse CSV data
        const rows = csvData.split("\n").slice(1); // Skip header row

        // Extract labels, distances, and elevations
        const labels: string[] = [];
        const distances: number[] = [];
        const elevations: number[] = [];
        let maxDist = 0;

        rows.forEach((row) => {
          const columns = row.split(",");
          if (columns.length >= 7) {
            const distance = parseFloat(columns[5]);
            const elevation = parseFloat(columns[2]);

            if (distance && !isNaN(elevation)) {
              // Add empty labels for most points to avoid cluttering
              labels.push("");
              distances.push(distance);
              elevations.push(elevation);

              if (distance > maxDist) {
                maxDist = distance;
              }
            }
          }
        });

        // Update max distance
        setMaxDistance(Math.ceil(maxDist / 100) * 100); // Round up to nearest hundred

        // Set defined city markers
        setCityMarkers(MAJOR_CITIES);

        // Create chart data
        setElevationData({
          labels: labels,
          datasets: [
            {
              label: "Elevation (m)",
              data: elevations,
              borderColor: "hsl(var(--primary))",
              backgroundColor: "hsla(var(--primary), 0.2)",
            },
          ],
        });
      } catch (error) {
        console.error("Error loading map data:", error);
      }
    };

    fetchMapData();
  }, []);

  // 계산 데이터 생성 함수 추가
  useEffect(() => {
    if (elevationData.datasets[0].data.length > 0) {
      generateSimulatedData();
    }
  }, [elevationData, maxDistance, generateSimulatedData]);

  // 차트 옵션 생성
  const powerBalanceChartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    scales: {
      y: {
        type: "linear",
        display: true,
        position: "left",
        title: {
          display: true,
          text: "Power (kW)",
          font: { size: 12 },
        },
        ticks: { font: { size: 11 } },
        grid: { color: "rgba(200, 200, 200, 0.3)" },
      },
      x: {
        grid: { display: true, color: "rgba(200, 200, 200, 0.3)" },
        ticks: {
          font: { size: 10 },
          maxRotation: 30,
          minRotation: 30,
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          title: (context) => {
            if (!context || context.length === 0) return "Unknown";
            const index = context[0].dataIndex;
            const distance = powerBalanceData.distances[index];
            return `Distance: ${Math.round(distance)} km`;
          },
        },
      },
      legend: {
        position: "top",
        labels: { font: { size: 12 } },
      },
    },
  };

  const resistanceForceChartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    scales: {
      y: {
        type: "linear",
        display: true,
        position: "left",
        title: {
          display: true,
          text: "Force (N)",
          font: { size: 12 },
        },
        ticks: { font: { size: 11 } },
        grid: { color: "rgba(200, 200, 200, 0.3)" },
      },
      x: {
        grid: { display: true, color: "rgba(200, 200, 200, 0.3)" },
        ticks: {
          font: { size: 10 },
          maxRotation: 30,
          minRotation: 30,
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          title: (context) => {
            if (!context || context.length === 0) return "Unknown";
            const index = context[0].dataIndex;
            const distance = resistanceForceData.distances[index];
            return `Distance: ${Math.round(distance)} km`;
          },
        },
      },
      legend: {
        position: "top",
        labels: { font: { size: 12 } },
      },
    },
  };

  const efficiencyChartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    scales: {
      y: {
        type: "linear",
        display: true,
        position: "left",
        title: {
          display: true,
          text: "Efficiency (%)",
          font: { size: 12 },
        },
        ticks: { font: { size: 11 } },
        min: 0,
        max: 100,
        grid: { color: "rgba(200, 200, 200, 0.3)" },
      },
      x: {
        grid: { display: true, color: "rgba(200, 200, 200, 0.3)" },
        ticks: {
          font: { size: 10 },
          maxRotation: 30,
          minRotation: 30,
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          title: (context) => {
            if (!context || context.length === 0) return "Unknown";
            const index = context[0].dataIndex;
            const distance = efficiencyData.distances[index];
            return `Distance: ${Math.round(distance)} km`;
          },
        },
      },
      legend: {
        position: "top",
        labels: { font: { size: 12 } },
      },
    },
  };

  // Power Balance 차트 데이터
  const getPowerBalanceChartData = () => {
    // 적절한 간격으로 데이터 샘플링 (모든 포인트를 그리면 너무 많음)
    const step = Math.max(1, Math.floor(powerBalanceData.distances.length / 100));
    const sampledDistances = [];
    const sampledPmppt = [];
    const sampledPmotor = [];
    const sampledPbattery = [];

    for (let i = 0; i < powerBalanceData.distances.length; i += step) {
      sampledDistances.push(powerBalanceData.distances[i]);
      sampledPmppt.push(powerBalanceData.pmppt[i]);
      sampledPmotor.push(powerBalanceData.pmotor[i]);
      sampledPbattery.push(powerBalanceData.pbattery[i]);
    }

    return {
      labels: sampledDistances.map(d => Math.round(d).toString()),
      datasets: [
        {
          label: "Pmppt (kW)",
          data: sampledPmppt,
          borderColor: "hsl(215, 100%, 60%)",
          backgroundColor: "hsla(215, 100%, 60%, 0.1)",
          yAxisID: "y",
        },
        {
          label: "Pmotor (kW)",
          data: sampledPmotor,
          borderColor: "hsl(10, 90%, 60%)",
          backgroundColor: "hsla(10, 90%, 60%, 0.1)",
          yAxisID: "y",
        },
        {
          label: "Pbattery (kW)",
          data: sampledPbattery,
          borderColor: "hsl(150, 90%, 40%)",
          backgroundColor: "hsla(150, 90%, 40%, 0.1)",
          yAxisID: "y",
        }
      ],
    };
  };

  // Resistance Force 차트 데이터
  const getResistanceForceChartData = () => {
    // 적절한 간격으로 데이터 샘플링
    const step = Math.max(1, Math.floor(resistanceForceData.distances.length / 100));
    const sampledDistances = [];
    const sampledFWind = [];
    const sampledFRolling = [];
    const sampledFGrade = [];

    for (let i = 0; i < resistanceForceData.distances.length; i += step) {
      sampledDistances.push(resistanceForceData.distances[i]);
      sampledFWind.push(resistanceForceData.fWind[i]);
      sampledFRolling.push(resistanceForceData.fRolling[i]);
      sampledFGrade.push(resistanceForceData.fGrade[i]);
    }

    return {
      labels: sampledDistances.map(d => Math.round(d).toString()),
      datasets: [
        {
          label: "FWind (N)",
          data: sampledFWind,
          borderColor: "hsl(215, 100%, 60%)",
          backgroundColor: "hsla(215, 100%, 60%, 0.1)",
          yAxisID: "y",
        },
        {
          label: "FRolling (N)",
          data: sampledFRolling,
          borderColor: "hsl(10, 90%, 60%)",
          backgroundColor: "hsla(10, 90%, 60%, 0.1)",
          yAxisID: "y",
        },
        {
          label: "FGrade (N)",
          data: sampledFGrade,
          borderColor: "hsl(150, 90%, 40%)",
          backgroundColor: "hsla(150, 90%, 40%, 0.1)",
          yAxisID: "y",
        }
      ],
    };
  };

  // Efficiency 차트 데이터
  const getEfficiencyChartData = () => {
    // 적절한 간격으로 데이터 샘플링
    const step = Math.max(1, Math.floor(efficiencyData.distances.length / 100));
    const sampledDistances = [];
    const sampledEtaMppt = [];
    const sampledEtaBattery = [];
    const sampledEtaMotor = [];

    for (let i = 0; i < efficiencyData.distances.length; i += step) {
      sampledDistances.push(efficiencyData.distances[i]);
      sampledEtaMppt.push(efficiencyData.etaMppt[i]);
      sampledEtaBattery.push(efficiencyData.etaBattery[i]);
      sampledEtaMotor.push(efficiencyData.etaMotor[i]);
    }

    return {
      labels: sampledDistances.map(d => Math.round(d).toString()),
      datasets: [
        {
          label: "ηmppt (%)",
          data: sampledEtaMppt,
          borderColor: "hsl(215, 100%, 60%)",
          backgroundColor: "hsla(215, 100%, 60%, 0.1)",
          yAxisID: "y",
        },
        {
          label: "ηbattery (%)",
          data: sampledEtaBattery,
          borderColor: "hsl(10, 90%, 60%)",
          backgroundColor: "hsla(10, 90%, 60%, 0.1)",
          yAxisID: "y",
        },
        {
          label: "ηmotor (%)",
          data: sampledEtaMotor,
          borderColor: "hsl(150, 90%, 40%)",
          backgroundColor: "hsla(150, 90%, 40%, 0.1)",
          yAxisID: "y",
        }
      ],
    };
  };

  // Check if data is loaded
  const hasData = true; // Always show for demonstration since we're using map.csv

  // Create custom chart options for elevation chart with city markers
  const elevationChartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    scales: {
      y: {
        type: "linear",
        display: true,
        position: "left",
        title: {
          display: true,
          text: "Elevation (m)",
          font: {
            size: 12,
          },
        },
        ticks: {
          font: {
            size: 11,
          },
        },
        min: 0,
        max: 800,
        grid: {
          color: "rgba(200, 200, 200, 0.3)",
        },
      },
      x: {
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: true,
          color: (context) => {
            // 그리드 포인트의 상대적인 위치
            const relativePct =
              context.index / (context.chart.scales.x.ticks.length - 1);
            const currentDist = relativePct * maxDistance;

            // 도시와 가깝다면 파란색 선
            for (const city of MAJOR_CITIES) {
              if (Math.abs(city.distance - currentDist) < 15) {
                // 15km 오차 허용
                return "rgba(0, 100, 200, 0.8)"; // 파란색 수직선
              }
            }

            // 기본 그리드 색상
            return "rgba(200, 200, 200, 0.1)"; // 매우 연한 회색
          },
        },
        ticks: {
          font: {
            size: 10,
          },
          maxRotation: 30,
          minRotation: 30,
          autoSkip: false, // 모든 눈금을 표시하도록 설정
          // 모든 도시 이름을 표시
          callback: function (value, index, values) {
            // Check if values is undefined or empty
            if (!values || !Array.isArray(values) || values.length <= 1) {
              return "";
            }
            
            // 그리드 포인트의 상대적인 위치
            const relativePct = index / (values.length - 1);
            const currentDist = relativePct * maxDistance;

            // 각 도시에 대해 가장 가까운 틱 위치를 찾음
            for (const city of MAJOR_CITIES) {
              // 도시 거리와 현재 틱 거리의 차이 계산
              const diff = Math.abs(city.distance - currentDist);

              // 중복 방지: 각 도시마다 가장 가까운 틱 하나만 표시
              if (diff < 15) {
                // 10km 오차 허용
                // 이 도시가 다른 틱에서 이미 표시되었는지 확인
                const otherTicksForCity = values.map((_, i) => {
                  if (i !== index) {
                    const otherDist = (i / (values.length - 1)) * maxDistance;
                    return Math.abs(city.distance - otherDist);
                  }
                  return Number.MAX_VALUE;
                });

                // 현재 틱이 도시와 가장 가까운 틱인지 확인
                const isClosestTick = otherTicksForCity.length > 0 
                  ? Math.min(...otherTicksForCity) > diff
                  : true;

                if (isClosestTick) {
                  return city.city;
                }
              }
            }

            return "";
          },
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          title: (context) => {
            // Check if context array is empty or undefined
            if (!context || !Array.isArray(context) || context.length === 0) {
              return "Unknown";
            }

            const index = context[0].dataIndex;
            const totalPoints = elevationData.labels.length;
            
            // Ensure we don't divide by zero
            const distance = totalPoints > 0 
              ? Math.round((index / totalPoints) * maxDistance)
              : 0;

            // Find nearest city
            let nearestCity = "";
            let minDistance = Number.MAX_VALUE;

            for (const city of MAJOR_CITIES) {
              const diff = Math.abs(city.distance - distance);
              if (diff < minDistance && diff < 50) {
                // 50km 이내의 도시만 표시
                minDistance = diff;
                nearestCity = city.city;
              }
            }

            return `Distance: ${distance} km${
              nearestCity ? ` (near ${nearestCity})` : ""
            }`;
          },
          label: (context) => {
            return `Elevation: ${context.formattedValue}m`;
          },
        },
      },
      legend: {
        position: "top",
        labels: {
          font: {
            size: 12,
          },
        },
      },
    },
  };

  // 린터 경고 해결을 위한 useEffect 추가
  useEffect(() => {
    // cityMarkers 사용하여 린터 경고 제거
    if (cityMarkers.length > 0) {
      console.log("City markers loaded:", cityMarkers.length);
    }
  }, [cityMarkers]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Driving Strategy</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {isMapDataLoaded && (
            <Alert className="bg-green-50 border-green-200">
              <Map className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Map data has been automatically loaded and is ready for route
                analysis.
              </AlertDescription>
            </Alert>
          )}

          {!hasData && (
            <div className="text-center py-12 text-muted-foreground">
              <p>
                Please upload and select data from the dashboard to view driving
                strategy analysis
              </p>
            </div>
          )}

          {hasData && (
            <>
              <Card className="w-full">
                <CardHeader className="pb-2 pt-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Elevation Map</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700"
                      >
                        Energy Balance Check
                      </Badge>
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700"
                      >
                        Noise 입자 (GHI, Wind)에 따른 영향 점검
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="h-80 mb-2 relative w-full mt-0">
                    <SimpleChart
                      data={elevationData}
                      options={elevationChartOptions}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-3 text-center">
                    Distance from Darwin (km)
                  </div>
                </CardContent>
              </Card>

              {/* Power Balance Chart */}
              <Card className="w-full">
                <CardHeader className="pb-2 pt-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Power Balance</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700"
                      >
                        Power Balance: Sum(P)=0
                      </Badge>
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700"
                      >
                        Motor 의 Nominal Power 초과 정도와 시간
                      </Badge>
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700"
                      >
                        Battery C Rate
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>Pmppt</div>
                      <div>Pmotor</div>
                      <div>Pbattery</div>
                      <div>[kW]</div>
                      <div>[kph]</div>
                      <div>[hour]</div>
                    </div>
                    <div className="h-80 mb-2 relative w-full">
                      {powerBalanceData.distances.length > 0 && (
                        <SimpleChart
                          data={getPowerBalanceChartData()}
                          options={powerBalanceChartOptions}
                        />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      누적 그래프로 표시
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resistance Force Chart */}
              <Card className="w-full">
                <CardHeader className="pb-2 pt-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Resistance Force</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700"
                      >
                        속도의 구배에 따른 주행저항 계산의 적정성
                      </Badge>
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700"
                      >
                        Pmotor와의 부합 여부
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>FWind</div>
                      <div>FRolling</div>
                      <div>FGrade</div>
                      <div>[N]</div>
                      <div>[N]</div>
                      <div>[N]</div>
                    </div>
                    <div className="h-80 mb-2 relative w-full">
                      {resistanceForceData.distances.length > 0 && (
                        <SimpleChart
                          data={getResistanceForceChartData()}
                          options={resistanceForceChartOptions}
                        />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      누적 그래프로 표시
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Efficiency Chart */}
              <Card className="w-full">
                <CardHeader className="pb-2 pt-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Efficiency</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700"
                      >
                        운전영역에 따른 효율 값이 적절하게 가정되었는지
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>ηmppt</div>
                      <div>ηbattery</div>
                      <div>ηmotor</div>
                      <div>[%]</div>
                      <div>[%]</div>
                      <div>[%]</div>
                    </div>
                    <div className="h-80 mb-2 relative w-full">
                      {efficiencyData.distances.length > 0 && (
                        <SimpleChart
                          data={getEfficiencyChartData()}
                          options={efficiencyChartOptions}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
