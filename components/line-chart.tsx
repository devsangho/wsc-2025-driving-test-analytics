// components/LineChart.tsx
"use client";

import React from "react";
import { Line } from "react-chartjs-2";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

interface DataRow {
  Timestamp: string;
  BMS_Voltage: number | null;
  BMS_Current: number | null;
  BMS_SoC: number | null;
  BMS_PackFaultStatus: number | null;
  BMS_batt_temp_1: number | null;
  BMS_batt_temp_2: number | null;
  MPPT1_ID: number | null;
  MPPT1_InputVoltage: number | null;
  MPPT1_InputCurrent: number | null;
  MPPT1_OutputVoltage: number | null;
  MPPT1_OutputCurrent: number | null;
  MPPT1_FetTemp: number | null;
  MPPT1_ControllerTemp: number | null;
  MPPT1_MaxOutputVoltageSetting: number | null;
  MPPT1_MaxInputCurrentSetting: number | null;
  MPPT1_CANRxErrorCounter: number | null;
  MPPT1_CANTxErrorCounter: number | null;
  MPPT1_CANTxOverflow: number | null;
  MPPT1_ErrorFlags: number | null;
  MPPT1_LimitFlags: number | null;
  MPPT1_Mode: number | null;
  MPPT2_ID: number | null;
  MPPT2_InputVoltage: number | null;
  MPPT2_InputCurrent: number | null;
  MPPT2_OutputVoltage: number | null;
  MPPT2_OutputCurrent: number | null;
  MPPT2_FetTemp: number | null;
  MPPT2_ControllerTemp: number | null;
  MPPT2_MaxOutputVoltageSetting: number | null;
  MPPT2_MaxInputCurrentSetting: number | null;
  MPPT2_CANRxErrorCounter: number | null;
  MPPT2_CANTxErrorCounter: number | null;
  MPPT2_CANTxOverflow: number | null;
  MPPT2_ErrorFlags: number | null;
  MPPT2_LimitFlags: number | null;
  MPPT2_Mode: number | null;
  MPPT3_ID: number | null;
  MPPT3_InputVoltage: number | null;
  MPPT3_InputCurrent: number | null;
  MPPT3_OutputVoltage: number | null;
  MPPT3_OutputCurrent: number | null;
  MPPT3_FetTemp: number | null;
  MPPT3_ControllerTemp: number | null;
  MPPT3_MaxOutputVoltageSetting: number | null;
  MPPT3_MaxInputCurrentSetting: number | null;
  MPPT3_CANRxErrorCounter: number | null;
  MPPT3_CANTxErrorCounter: number | null;
  MPPT3_CANTxOverflow: number | null;
  MPPT3_ErrorFlags: number | null;
  MPPT3_LimitFlags: number | null;
  MPPT3_Mode: number | null;
  MPPT4_ID: number | null;
  MPPT4_InputVoltage: number | null;
  MPPT4_InputCurrent: number | null;
  MPPT4_OutputVoltage: number | null;
  MPPT4_OutputCurrent: number | null;
  MPPT4_FetTemp: number | null;
  MPPT4_ControllerTemp: number | null;
  MPPT4_MaxOutputVoltageSetting: number | null;
  MPPT4_MaxInputCurrentSetting: number | null;
  MPPT4_CANRxErrorCounter: number | null;
  MPPT4_CANTxErrorCounter: number | null;
  MPPT4_CANTxOverflow: number | null;
  MPPT4_ErrorFlags: number | null;
  MPPT4_LimitFlags: number | null;
  MPPT4_Mode: number | null;
  Velocity: number | null;
}

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
