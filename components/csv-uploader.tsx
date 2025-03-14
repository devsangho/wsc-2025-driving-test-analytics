"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { useDataContext } from "@/app/contexts/data-context";
import { DataRow } from "@/types/data";
import { toast } from "sonner";

interface CSVUploaderProps {
  onUploadSuccess?: () => void;
}

export default function CSVUploader({ onUploadSuccess }: CSVUploaderProps) {
  const { setData } = useDataContext();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const csvData = reader.result as string;
          Papa.parse<DataRow>(csvData, {
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
              onUploadSuccess?.();
              toast.success("CSV file uploaded successfully", {
                description: "Use the sidebar menu to explore and analyze your data.",
              });
            },
            error: (error: Error) => {
              toast.error("Failed to parse CSV file", {
                description: error.message,
              });
            },
          });
        };
        reader.onerror = () => {
          toast.error("Failed to read CSV file", {
            description: "Please check if the file is valid and try again.",
          });
        };
        reader.readAsText(file);
      }
    },
    [setData, onUploadSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors hover:bg-muted/50 ${
        isDragActive ? "border-primary bg-muted/50" : "border-muted-foreground/25"
      }`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p className="text-sm text-muted-foreground">Drop the CSV file here</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Drag &apos;n&apos; drop a CSV file here, or click to select one
        </p>
      )}
    </div>
  );
}
