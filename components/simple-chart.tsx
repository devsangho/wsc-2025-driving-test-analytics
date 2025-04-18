"use client";

import { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ChartOptions } from "chart.js";
import { Button } from "./ui/button";
import { RefreshCw, Expand } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";

// Chart.js component loaded dynamically
const Line = dynamic(
  () => import("react-chartjs-2").then((mod) => mod.Line),
  { ssr: false }
);

interface ChartDataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  yAxisID?: string;
  borderDashed?: number[];
}

interface SimpleChartProps {
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
  options?: ChartOptions<"line">;
  showSteepSlopes?: boolean;
  slopeThreshold?: number;
}

// 간소화된 plugin 옵션 타입 정의
interface SimpleChartPluginOptions {
  zoom?: {
    pan?: {
      enabled?: boolean;
      mode?: "x" | "y" | "xy";
    };
    zoom?: {
      wheel?: {
        enabled?: boolean;
      };
      pinch?: {
        enabled?: boolean;
      };
      mode?: "x" | "y" | "xy";
    };
    limits?: {
      y?: {
        min?: string;
        max?: string;
      };
    };
  };
  annotation?: {
    annotations?: Record<string, unknown>;
  };
}

// 확장된 Chart.js 옵션 인터페이스
interface ExtendedChartOptions extends Omit<ChartOptions<"line">, "plugins"> {
  plugins?: SimpleChartPluginOptions;
}

export function SimpleChart({ 
  data, 
  options: customOptions, 
  showSteepSlopes = false,
  slopeThreshold = 30 // Default threshold value for steep slopes (%)
}: SimpleChartProps) {
  const chartRef = useRef(null);
  const fullscreenChartRef = useRef(null);
  const [isClient, setIsClient] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Function to get annotations for steep slopes
  const getSteepSlopeAnnotations = () => {
    const slopeAnnotations: Record<string, unknown> = {};
    
    // Check if we have enough data
    if (!data.datasets[0]?.data || data.datasets[0].data.length < 2) {
      return {};
    }
    
    const elevationData = data.datasets[0].data;
    
    // Find steep slopes by comparing consecutive points
    for (let i = 1; i < elevationData.length; i++) {
      const currentElev = elevationData[i];
      const prevElev = elevationData[i-1];
      const diff = currentElev - prevElev;
      
      // Calculate slope percentage (rise/run * 100)
      // Assuming x-axis distances are approximately equal
      const slopePercentage = Math.abs(diff);
      
      if (slopePercentage > slopeThreshold) {
        // Add a box annotation
        slopeAnnotations[`slope-${i}`] = {
          type: 'box',
          xMin: i-1,
          xMax: i,
          backgroundColor: diff > 0 ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 0, 255, 0.1)',
          borderColor: diff > 0 ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 0, 255, 0.5)',
          borderWidth: 1,
          label: {
            display: true,
            content: `${diff > 0 ? '↗' : '↘'} ${Math.round(slopePercentage)}%`,
            position: 'center'
          }
        };
      }
    }
    
    return slopeAnnotations;
  };

  // 기본 차트 옵션
  const defaultOptions: ExtendedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      zoom: {
        pan: {
          enabled: true,
          mode: "xy",
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: "xy",
        },
        limits: {
          y: { min: "original", max: "original" },
        },
      },
      annotation: {
        annotations: showSteepSlopes ? getSteepSlopeAnnotations() : {}
      }
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
    elements: {
      point: {
        radius: 0, // 포인트 점 제거
        hitRadius: 10, // 마우스 호버 시 감지 영역
        hoverRadius: 4, // 마우스 호버 시 점 크기
      },
      line: {
        tension: 0.2, // 선의 곡률
      }
    },
  };

  // 사용자 정의 옵션과 기본 옵션 병합
  const extendedCustomOptions = customOptions as ExtendedChartOptions;
  const mergedOptions = extendedCustomOptions ? {
    ...defaultOptions,
    ...extendedCustomOptions,
  } : defaultOptions;

  // Handle zoom reset
  const handleResetZoom = () => {
    if (chartRef.current) {
      try {
        // @ts-expect-error: Chart.js zoom plugin types are not fully defined
        chartRef.current.resetZoom?.();
      } catch (e) {
        console.error("Failed to reset zoom:", e);
      }
    }
  };

  return (
    <>
      {isClient && (
        <>
          <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
            <div className="w-full h-full relative">
              <Line ref={chartRef} options={mergedOptions as ChartOptions<"line">} data={data} />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="bg-white"
                  onClick={handleResetZoom}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="bg-white"
                    onClick={() => setIsFullscreen(true)}
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
              </div>
            </div>
            <DialogContent className="max-w-6xl">
              <div className="h-[600px] relative">
                <Line 
                  ref={fullscreenChartRef}
                  options={mergedOptions as ChartOptions<"line">} 
                  data={data} 
                />
                <div className="absolute top-2 right-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="bg-white"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
} 