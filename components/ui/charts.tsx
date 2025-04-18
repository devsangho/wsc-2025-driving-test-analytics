"use client";

import { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ChartOptions } from "chart.js";

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
}

interface LineChartProps {
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
}

export function LineChart({ data }: LineChartProps) {
  const chartRef = useRef(null);
  const [isClient, setIsClient] = useState(false);

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
  }, []);

  if (!isClient) {
    return <div className="flex items-center justify-center h-full">Loading chart...</div>;
  }

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  return (
    <div className="w-full h-full">
      <Line ref={chartRef} options={options} data={data} />
    </div>
  );
} 