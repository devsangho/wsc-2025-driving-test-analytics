"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataContext } from "@/app/contexts/data-context";
import Papa from "papaparse";
import { DataRow } from "@/types/data";
import { FileText } from "lucide-react";
import { toast } from "sonner";

const exampleFiles = [
  {
    name: "MPPT 610 Data",
    path: "/data/mppt610.csv",
    description: "Example MPPT data from testing",
  },
];

export function ExampleDataSelector() {
  const { setData } = useDataContext();

  const loadExampleData = async (path: string) => {
    try {
      const response = await fetch(path);
      const csvText = await response.text();
      
      Papa.parse<DataRow>(csvText, {
        header: true,
        skipEmptyLines: "greedy",
        dynamicTyping: (field) => field !== "BMS_PackFaultStatus",
        transformHeader: (header) => header.trim(),
        transform: (value) => {
          if (value === "") return null;
          return value;
        },
        complete: (result) => {
          const parsedData = result.data.filter((row) => row.Timestamp);
          setData(parsedData);
          toast.success("Example data loaded successfully", {
            description: "Navigate through the sidebar menu to analyze different aspects of the data.",
          });
        },
        error: (error: Error) => {
          toast.error("Failed to parse example data", {
            description: error.message,
          });
        },
      });
    } catch (error) {
      console.error("Failed to load example data:", error);
      toast.error("Failed to load example data", {
        description: "Please try again later.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Example Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {exampleFiles.map((file) => (
          <Button
            key={file.path}
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => loadExampleData(file.path)}
          >
            <FileText className="h-4 w-4" />
            <div className="flex flex-col items-start text-left">
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {file.description}
              </span>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
} 