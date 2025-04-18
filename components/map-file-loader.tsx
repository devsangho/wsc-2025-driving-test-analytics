"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { useDataContext, DataType } from "@/app/contexts/data-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Upload, Map } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataRow } from "@/types/data";

interface MapDataRow {
  Latitude?: number;
  Longitude?: number;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  [key: string]: unknown;
}

export default function MapFileLoader() {
  const { setIsMapDataLoaded, addDataSet, addDataType } = useDataContext();
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      
      setLoading(true);
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const csvContent = event.target?.result as string;
          
          if (!csvContent) {
            throw new Error("파일을 읽는 데 실패했습니다.");
          }
          
          // CSV 파싱
          Papa.parse<MapDataRow>(csvContent, {
            header: true,
            skipEmptyLines: true,
            complete: (parseResult) => {
              // 결과 확인
              if (parseResult.data && parseResult.data.length > 0) {
                // 최소한의 필수 필드 확인
                const firstRow = parseResult.data[0];
                let hasGpsData = false;
                
                if (
                  (firstRow.Latitude !== undefined && firstRow.Longitude !== undefined) ||
                  (firstRow.latitude !== undefined && firstRow.longitude !== undefined) ||
                  (firstRow.lat !== undefined && firstRow.lng !== undefined)
                ) {
                  hasGpsData = true;
                }
                
                if (!hasGpsData) {
                  toast.error("Map data error", {
                    description: "The map data doesn't contain required GPS coordinates."
                  });
                  setLoading(false);
                  return;
                }
                
                // 데이터 저장
                addDataSet({
                  type: DataType.MAP,
                  fileName: file.name,
                  data: parseResult.data as unknown as DataRow[]
                });
                
                // 모든 GPS 포인트가 정상적으로 읽힌 경우에만 맵 데이터 로드 설정
                setIsMapDataLoaded(true);
                addDataType(DataType.MAP);
                
                toast.success("Map data loaded", {
                  description: `Map data with ${parseResult.data.length} points has been loaded successfully.`
                });
              } else {
                toast.error("Invalid map file", {
                  description: "The file contains no data or has an incorrect format."
                });
              }
              
              setLoading(false);
            },
            error: (error: Error) => {
              toast.error("CSV parsing error", {
                description: error.message
              });
              setLoading(false);
            }
          });
        } catch (err) {
          toast.error("File processing error", {
            description: err instanceof Error ? err.message : 'Unknown error'
          });
          setLoading(false);
        }
      };
      
      reader.onerror = () => {
        toast.error("File reading error", {
          description: "An error occurred while reading the file."
        });
        setLoading(false);
      };
      
      reader.readAsText(file);
    },
    [setIsMapDataLoaded, addDataSet, addDataType]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    multiple: false,
  });

  // Load the default map.csv from public directory
  const loadDefaultMap = async () => {
    try {
      setLoading(true);
      const response = await fetch('/map.csv');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const csvText = await response.text();
      
      Papa.parse<MapDataRow>(csvText, {
        header: true,
        skipEmptyLines: "greedy",
        dynamicTyping: true,
        complete: () => {
          setIsMapDataLoaded(true);
          toast.success("Default map data loaded", {
            description: "Using the default route data for driving strategy analysis.",
          });
          setLoading(false);
        },
        error: (error: Error) => {
          toast.error("Failed to parse default map file", {
            description: error.message,
          });
          setLoading(false);
        },
      });
    } catch (error) {
      console.error("Error loading default map:", error);
      toast.error("Failed to load default map", {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5" />
          Route Map Data
        </CardTitle>
        <CardDescription>
          Load route map data to enable the Driving Strategy analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={loadDefaultMap} 
            className="flex-1"
            disabled={loading}
          >
            Use Default Map
          </Button>
          <div
            {...getRootProps()}
            className="flex-1"
          >
            <Button 
              variant="outline" 
              className="w-full flex items-center gap-2"
              disabled={loading}
            >
              <Upload className="h-4 w-4" />
              <input {...getInputProps()} />
              Upload Custom Map
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          The map file should include latitude, longitude, elevation, and distance data for the route.
        </div>
      </CardContent>
    </Card>
  );
} 