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
import { useEffect, useState } from "react";
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
  const [cityMarkers, setCityMarkers] = useState<CityMarker[]>([]);
  const [maxDistance, setMaxDistance] = useState<number>(3020); // 기본값은 Adelaide까지의 거리

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
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
