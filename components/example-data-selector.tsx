"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDataContext } from "@/app/contexts/data-context";
import Papa from "papaparse";
import { toast } from "sonner";
import { DataRow } from "@/types/data";

interface ExampleFile {
  name: string;
  path: string;
  description: string;
}

export function ExampleDataSelector() {
  const { setData } = useDataContext();
  const [exampleFiles, setExampleFiles] = useState<ExampleFile[]>([]);

  useEffect(() => {
    async function fetchExampleFiles() {
      try {
        const response = await fetch("/api/example-files");
        const files = await response.json();
        setExampleFiles(files);
      } catch (error) {
        console.error("Failed to fetch example files:", error);
        toast.error("Failed to load example files");
      }
    }

    fetchExampleFiles();
  }, []);

  const loadExampleData = async (path: string) => {
    try {
      const response = await fetch(path);
      const csvText = await response.text();

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (header) => header.trim(),
        dynamicTyping: (field) => field !== "BMS_PackFaultStatus",
        complete: (results) => {
          if (results.errors.length > 0) {
            console.error("CSV parsing errors:", results.errors);
            toast.error("Error parsing CSV file");
            return;
          }

          const parsedData = (results.data as unknown[])
            .map((row) => {
              const typedRow = row as Record<string, unknown>;
              Object.keys(typedRow).forEach((key) => {
                if (typedRow[key] === "") {
                  typedRow[key] = null;
                }
              });
              return typedRow;
            })
            .filter((row) => row.Timestamp);

          setData(parsedData as unknown as DataRow[]);
          toast.success(
            "Example data loaded successfully! You can now analyze the data through the sidebar menu."
          );
        },
        error: (error: Error) => {
          console.error("CSV parsing error:", error);
          toast.error("Error parsing CSV file");
        },
      });
    } catch (error) {
      console.error("Failed to load example data:", error);
      toast.error("Failed to load example data");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Example Data</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {exampleFiles.map((file) => (
          <Button
            key={file.path}
            variant="outline"
            onClick={() => loadExampleData(file.path)}
          >
            {file.name}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
