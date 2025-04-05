"use client";

import { MS60SChart } from "@/components/ms60s-chart";

export default function IrradiancePage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Irradiance</h1>
        <p className="text-muted-foreground">
          Compensated irradiance measurements from the MS60S sensor
        </p>
      </div>
      <MS60SChart
        title="Compensated Irradiance"
        dataKey="MS60S_CompensatedIrradiance"
        yAxisLabel="Irradiance (W/m²)"
      />
    </div>
  );
} 