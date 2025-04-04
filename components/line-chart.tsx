"use client";

import { useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { DataRow } from "@/types/data";
import zoomPlugin from "chartjs-plugin-zoom";
import { Button } from "./ui/button";
import { RefreshCw } from "lucide-react";

// Chart.js에 필요한 요소 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
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
  const chartRef = useRef<ChartJS<"line">>(null);

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
