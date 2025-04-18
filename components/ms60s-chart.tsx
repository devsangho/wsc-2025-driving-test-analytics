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
  const { currentData } = useDataContext();
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // 데이터가 없으면 "No data available" 메시지 표시
  if (!currentData || currentData.length === 0) {
    return (
      <Card className="relative h-[400px] p-4 flex items-center justify-center">
        <div className="text-muted-foreground">No data available</div>
      </Card>
    );
  }

  return (
    <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
      <Card className="relative h-[400px] p-4">
        <div className="absolute right-4 top-4 z-10 flex gap-2">
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              title="Fullscreen"
              className="bg-white bg-opacity-70 hover:bg-opacity-100"
            >
              <Expand className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </div>
        <LineChart
          data={currentData}
          title={title}
          xAxisKey="Timestamp"
          yAxisKey={dataKey as keyof typeof currentData[0]}
          yAxisLabel={yAxisLabel}
        />
      </Card>
      <DialogContent className="max-w-6xl">
        <div className="h-[600px]">
          <LineChart
            data={currentData}
            title={title}
            xAxisKey="Timestamp"
            yAxisKey={dataKey as keyof typeof currentData[0]}
            yAxisLabel={yAxisLabel}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
} 