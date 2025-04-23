import { Metadata } from "next";
import { SimulationClient } from "./simulation-client";

export const metadata: Metadata = {
  title: "Simulation | WSC SNU SOLO",
  description: "Solar car driving simulation.",
};

export default function SimulationPage() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Simulation</h1>
          <p className="text-muted-foreground">
            Solar car driving simulation and analysis.
          </p>
        </div>
      </div>
      <SimulationClient />
    </div>
  );
} 