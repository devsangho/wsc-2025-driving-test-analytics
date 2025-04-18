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

// 확장된 Chart.js 옵션 인터페이스
interface ExtendedChartOptions extends ChartOptions<"line"> {
  plugins?: {
    zoom?: any;
    annotation?: {
      annotations?: Record<string, any>;
    };
  };
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
    // Register required Chart.js elements
    import("chart.js").then((ChartJS) => {
      ChartJS.Chart.register(
        ChartJS.CategoryScale,
        ChartJS.LinearScale,
        ChartJS.PointElement,
        ChartJS.LineElement,
        ChartJS.Title,
        ChartJS.Tooltip,
        ChartJS.Legend
      );
    });
    // 확대/축소 플러그인 등록
    import("chartjs-plugin-zoom").then((zoomPlugin) => {
      import("chart.js").then((ChartJS) => {
        ChartJS.Chart.register(zoomPlugin.default);
      });
    });
    // Annotation 플러그인 등록
    import("chartjs-plugin-annotation").then((annotationPlugin) => {
      import("chart.js").then((ChartJS) => {
        ChartJS.Chart.register(annotationPlugin.default);
      });
    });
  }, []);

  // 급경사 계산 및 annotation 추가
  const getSteepSlopeAnnotations = () => {
    if (!showSteepSlopes || !data.datasets[0] || !data.datasets[0].data) {
      return {};
    }

    const chartData = data.datasets[0].data;
    const annotations: Record<string, any> = {};
    
    // 인접한 데이터 포인트 간의 경사 계산
    for (let i = 1; i < chartData.length; i++) {
      const prevValue = chartData[i - 1];
      const currentValue = chartData[i];
      
      // 값의 변화량 계산
      const diff = currentValue - prevValue;
      const absValue = Math.abs(diff);
      const avgValue = (Math.abs(prevValue) + Math.abs(currentValue)) / 2;
      const percentChange = (absValue / Math.max(1, avgValue)) * 100;
      
      // 급경사 색상 계산 - 경사도에 따라 색상 강도 변경
      const intensity = Math.min(1, percentChange / 30);
      const color = diff > 0 ? 
        `rgba(255, 0, 0, ${Math.max(0.6, intensity)})` : // 상승 (빨간색)
        `rgba(0, 0, 255, ${Math.max(0.6, intensity)})`; // 하강 (파란색)
      
      // 임계값보다 크면 해당 구간을 급경사로 표시
      if (percentChange > slopeThreshold) {
        // 방향 표시 (상승/하강)
        const direction = diff > 0 ? '↗️ 상승' : '↘️ 하강';
        
        annotations[`slope-${i}`] = {
          type: 'box',
          xMin: i - 1,
          xMax: i,
          yMin: Math.min(prevValue, currentValue) - Math.abs(diff) * 0.1,
          yMax: Math.max(prevValue, currentValue) + Math.abs(diff) * 0.1,
          backgroundColor: color.replace(/[^,]+(?=\))/, '0.3'),
          borderColor: color,
          borderWidth: 2,
          drawTime: 'beforeDatasetsDraw',
          label: {
            display: true,
            content: `${direction} ${percentChange.toFixed(1)}%`,
            position: {
              x: 'center',
              y: 'start'
            },
            font: {
              size: 12,
              weight: 'bold'
            },
            color: color,
            padding: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
          }
        };
      }
    }
    
    return annotations;
  };

  if (!isClient) {
    return <div className="flex items-center justify-center h-full">Loading chart...</div>;
  }

  const defaultOptions: ExtendedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
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
  const options = extendedCustomOptions ? {
    ...defaultOptions,
    ...extendedCustomOptions,
    plugins: {
      ...(defaultOptions.plugins || {}),
      ...(extendedCustomOptions.plugins || {}),
      // zoom 플러그인 옵션 보존
      zoom: {
        ...(defaultOptions.plugins?.zoom || {}),
        ...(extendedCustomOptions.plugins?.zoom || {})
      },
      // annotation 플러그인 옵션 보존
      annotation: {
        ...(defaultOptions.plugins?.annotation || {}),
        ...(extendedCustomOptions.plugins?.annotation || {})
      }
    }
  } : defaultOptions;

  const resetZoom = () => {
    if (chartRef.current) {
      // @ts-expect-error: Chart.js type definitions are incomplete for the zoom plugin
      chartRef.current.resetZoom();
    }
  };

  const resetFullscreenZoom = () => {
    if (fullscreenChartRef.current) {
      // @ts-expect-error: Chart.js type definitions are incomplete for the zoom plugin
      fullscreenChartRef.current.resetZoom();
    }
  };

  return (
    <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
      <div className="w-full h-full relative">
        <Line ref={chartRef} options={options} data={data} />
        <div className="absolute top-2 right-2 flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={resetZoom}
            title="Reset Zoom"
            className="bg-white bg-opacity-70 hover:bg-opacity-100"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              title="Fullscreen"
              className="bg-white bg-opacity-70 hover:bg-opacity-100"
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
            options={options} 
            data={data} 
          />
          <div className="absolute top-2 right-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetFullscreenZoom}
              title="Reset Zoom"
              className="bg-white bg-opacity-70 hover:bg-opacity-100"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 