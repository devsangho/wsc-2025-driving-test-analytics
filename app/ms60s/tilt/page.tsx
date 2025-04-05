"use client";

import { MS60SChart } from "@/components/ms60s-chart";

export default function TiltPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Tilt</h1>
        <p className="text-muted-foreground">
          X and Y tilt measurements from the MS60S sensor
        </p>
      </div>
      <div className="space-y-6">
        <MS60SChart
          title="X Tilt"
          dataKey="MS60S_XTilt"
          yAxisLabel="Tilt (degrees)"
        />
        <MS60SChart
          title="Y Tilt"
          dataKey="MS60S_YTilt"
          yAxisLabel="Tilt (degrees)"
        />
      </div>
    </div>
  );
} 