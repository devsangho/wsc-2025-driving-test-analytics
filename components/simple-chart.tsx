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
}

export function SimpleChart({ data, options: customOptions }: SimpleChartProps) {
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
  }, []);

  if (!isClient) {
    return <div className="flex items-center justify-center h-full">Loading chart...</div>;
  }

  const defaultOptions: ChartOptions<"line"> = {
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
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  // 사용자 정의 옵션과 기본 옵션 병합
  const options = customOptions ? {
    ...defaultOptions,
    ...customOptions,
    plugins: {
      ...(defaultOptions.plugins || {}),
      ...(customOptions.plugins || {}),
      // zoom 플러그인 옵션 보존
      zoom: {
        ...(defaultOptions.plugins?.zoom || {}),
        ...(customOptions.plugins?.zoom || {})
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