"use client";

import { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ChartOptions, ChartData } from "chart.js";
import { DataRow } from "@/types/data";
import { Button } from "./ui/button";
import { RefreshCw } from "lucide-react";

// Chart.js 컴포넌트를 동적으로 불러오기
const Line = dynamic(
  () => import("react-chartjs-2").then((mod) => mod.Line),
  { ssr: false }
);

interface LineChartProps {
  data: DataRow[];
  title: string;
  xAxisKey: keyof DataRow;
  yAxisKey: keyof DataRow;
  yAxisLabel: string;
}

export function LineChart({
  data,
  title,
  xAxisKey,
  yAxisKey,
  yAxisLabel,
}: LineChartProps) {
  const chartRef = useRef(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Chart.js에 필요한 요소 등록
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
    import("chartjs-plugin-zoom").then((zoomPlugin) => {
      import("chart.js").then((ChartJS) => {
        ChartJS.Chart.register(zoomPlugin.default);
      });
    });
  }, []);

  if (!isClient) {
    return <div>Loading chart...</div>;
  }

  const chartData: ChartData<"line"> = {
    labels: data.map((row) => row[xAxisKey]),
    datasets: [
      {
        label: title,
        data: data.map((row) => {
          const value = row[yAxisKey];
          // Convert string values to numbers or return null for invalid values
          return typeof value === 'number' ? value : 
                 (value === null ? null : Number(value) || null);
        }),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: title,
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
        title: {
          display: true,
          text: yAxisLabel,
        },
      },
    },
  };

  const resetZoom = () => {
    if (chartRef.current) {
      // @ts-expect-error: Chart.js type definitions are incomplete for the zoom plugin
      chartRef.current.resetZoom();
    }
  };

  return (
    <div className="relative">
      <Line ref={chartRef} options={options} data={chartData} />
      <div className="absolute top-0 right-0 mt-2 mr-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={resetZoom}
          title="Reset Zoom"
          className="bg-white bg-opacity-70 hover:bg-opacity-100"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
