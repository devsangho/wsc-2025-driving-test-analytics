"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { useDataContext } from "@/app/contexts/data-context";
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

interface MapDataRow {
  Latitude: number;
  Longitude: number;
  "Elevation (m)": number;
  City: string;
  Weather_loc: string;
  Distance_km: number;
  Difference_km: number;
}

export default function MapFileLoader() {
  const { setIsMapDataLoaded } = useDataContext();
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        try {
          setLoading(true);
          
          // Parse CSV for verification
          const reader = new FileReader();
          reader.onload = () => {
            const csvData = reader.result as string;
            Papa.parse<MapDataRow>(csvData, {
              header: true,
              skipEmptyLines: "greedy",
              dynamicTyping: true,
              complete: (result) => {
                // Verify if it's a valid map file with required columns
                const headers = Object.keys(result.data[0] || {});
                const requiredColumns = ["Latitude", "Longitude", "Elevation (m)", "Distance_km"];
                
                const isValidMapFile = requiredColumns.every(col => headers.includes(col));
                
                if (isValidMapFile) {
                  setIsMapDataLoaded(true);
                  toast.success("Map data loaded successfully", {
                    description: "Route data is now available for driving strategy analysis.",
                  });
                } else {
                  toast.error("Invalid map file format", {
                    description: "The file doesn't contain the required columns for route analysis.",
                  });
                }
                setLoading(false);
              },
              error: (error: Error) => {
                toast.error("Failed to parse map file", {
                  description: error.message,
                });
                setLoading(false);
              },
            });
          };
          reader.onerror = () => {
            toast.error("Failed to read map file", {
              description: "Please check if the file is valid and try again.",
            });
            setLoading(false);
          };
          reader.readAsText(file);
        } catch (error) {
          console.error("Load error:", error);
          toast.error("Failed to load map file", {
            description: "There was an error loading your file.",
          });
          setLoading(false);
        }
      }
    },
    [setIsMapDataLoaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    maxFiles: 1,
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
        complete: (result) => {
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