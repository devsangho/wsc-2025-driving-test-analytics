"use client";

import { MS60SChart } from "@/components/ms60s-chart";

export default function TemperaturePage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Temperature</h1>
        <p className="text-muted-foreground">
          Internal temperature measurements from the MS60S sensor
        </p>
      </div>
      <MS60SChart
        title="Internal Temperature"
        dataKey="MS60S_InternalTemp"
        yAxisLabel="Temperature (°C)"
      />
    </div>
  );
} 