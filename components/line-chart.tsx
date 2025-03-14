// components/LineChart.tsx
"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { DataRow } from "@/types/data";

// Chart.js에 필요한 요소 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface LineChartProps {
  data: DataRow[];
  title: string;
  xAxisKey: keyof DataRow;
  yAxisKey: keyof DataRow;
  yAxisLabel: string;
}

export function LineChart({ data, title, xAxisKey, yAxisKey, yAxisLabel }: LineChartProps) {
  const chartData = {
    labels: data.map((row) => row[xAxisKey]),
    datasets: [
      {
        label: yAxisLabel,
        data: data.map((row) => row[yAxisKey]),
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: title,
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

  return <Line options={options} data={chartData} />;
}
