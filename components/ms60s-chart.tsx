"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useDataContext } from "@/app/contexts/data-context";
import { LineChart } from "@/components/line-chart";
import { Button } from "./ui/button";
import { Expand } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";

interface MS60SChartProps {
  title: string;
  dataKey: string;
  yAxisLabel: string;
}

export function MS60SChart({ title, dataKey, yAxisLabel }: MS60SChartProps) {
  const { data } = useDataContext();
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
      <Card className="relative h-[400px] p-4">
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-4 top-4 z-10"
          >
            <Expand className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <LineChart
          data={data}
          title={title}
          xAxisKey="Timestamp"
          yAxisKey={dataKey as keyof typeof data[0]}
          yAxisLabel={yAxisLabel}
        />
      </Card>
      <DialogContent className="max-w-6xl">
        <div className="h-[600px]">
          <LineChart
            data={data}
            title={title}
            xAxisKey="Timestamp"
            yAxisKey={dataKey as keyof typeof data[0]}
            yAxisLabel={yAxisLabel}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
} 