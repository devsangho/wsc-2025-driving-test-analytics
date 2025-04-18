"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { useDataContext } from "@/app/contexts/data-context";
import { DataRow } from "@/types/data";
import { toast } from "sonner";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes } from "firebase/storage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataType } from "@/app/contexts/data-context";

interface CSVUploaderProps {
  onUploadSuccess?: () => void;
  onUpdate?: () => void;
}

export default function CSVUploader({ onUploadSuccess, onUpdate }: CSVUploaderProps) {
  const { addDataSet, addDataType } = useDataContext();
  const [selectedFolder, setSelectedFolder] = useState<string>("can");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        try {
          // Upload to Firebase Storage
          const storageRef = ref(storage, `${selectedFolder}/${file.name}`);
          await uploadBytes(storageRef, file);

          // Parse CSV for local display
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
                
                // 새 데이터셋 추가
                addDataSet({
                  type: selectedFolder,
                  fileName: file.name,
                  data: parsedData
                });
                
                // 데이터 타입을 폴더에 따라 자동으로 추가
                if (selectedFolder === "can") {
                  // CAN 폴더의 파일은 기본적으로 모든 CAN 데이터 타입으로 간주
                  addDataType(DataType.CAN_BMS);
                  addDataType(DataType.CAN_MPPT);
                  addDataType(DataType.CAN_VELOCITY);
                  console.log("CAN data types added automatically");
                } else if (selectedFolder === "ms60s") {
                  // MS60S 폴더의 파일은 기본적으로 모든 MS60S 데이터 타입으로 간주
                  addDataType(DataType.MS60S_IRRADIANCE);
                  addDataType(DataType.MS60S_TILT);
                  addDataType(DataType.MS60S_TEMPERATURE);
                  console.log("MS60S data types added automatically");
                }
                
                onUploadSuccess?.();
                onUpdate?.();
                toast.success("CSV file uploaded successfully", {
                  description: `File '${file.name}' has been uploaded and is ready for analysis.`,
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
        } catch (error) {
          console.error("Upload error:", error);
          toast.error("Failed to upload file", {
            description: "There was an error uploading your file.",
          });
        }
      }
    },
    [addDataSet, addDataType, onUploadSuccess, onUpdate, selectedFolder]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    maxFiles: 1,
  });

  return (
    <div className="space-y-4">
      <Select value={selectedFolder} onValueChange={setSelectedFolder}>
        <SelectTrigger>
          <SelectValue placeholder="Select folder" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="can">CAN Data</SelectItem>
          <SelectItem value="ms60s">MS60S Data</SelectItem>
        </SelectContent>
      </Select>
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
    </div>
  );
}
