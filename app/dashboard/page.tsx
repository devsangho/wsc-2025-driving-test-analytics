"use client";

import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import CSVUploader from "@/components/csv-uploader";
import CSVFileList from "@/components/csv-file-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDataContext } from "@/app/contexts/data-context";
import { DataType } from "@/app/contexts/data-context";
import { Badge } from "@/components/ui/badge";
import { MapPin, Battery, Zap, Gauge, Thermometer, Sun, ArrowUp } from "lucide-react";

export default function Page() {
  const [showGuide, setShowGuide] = useState(false);
  const [updateKey, setUpdateKey] = useState(0);
  const { currentData, dataSets, hasDataType } = useDataContext();

  const handleUpdate = () => {
    setUpdateKey(prev => prev + 1);
  };

  const columns = currentData.length > 0 ? Object.keys(currentData[0]) : [];

  // Define the data types with information for display
  const dataTypeInfo = [
    { 
      type: DataType.MAP, 
      title: "Route Map", 
      description: "Route and elevation data", 
      icon: MapPin,
      menuPath: "/driving-strategy"
    },
    { 
      type: DataType.CAN_BMS, 
      title: "BMS Data", 
      description: "Battery management system data", 
      icon: Battery,
      menuPath: "/can/bms"
    },
    { 
      type: DataType.CAN_MPPT, 
      title: "MPPT Data", 
      description: "Maximum power point tracking data", 
      icon: Zap,
      menuPath: "/can/mppt"
    },
    { 
      type: DataType.CAN_VELOCITY, 
      title: "Velocity Data", 
      description: "Vehicle speed data", 
      icon: Gauge,
      menuPath: "/can/velocity"
    },
    { 
      type: DataType.MS60S_IRRADIANCE, 
      title: "Irradiance Data", 
      description: "Solar irradiance measurements", 
      icon: Sun,
      menuPath: "/ms60s/irradiance"
    },
    { 
      type: DataType.MS60S_TILT, 
      title: "Tilt Data", 
      description: "Solar panel tilt measurements", 
      icon: ArrowUp,
      menuPath: "/ms60s/tilt"
    },
    { 
      type: DataType.MS60S_TEMPERATURE, 
      title: "Temperature Data", 
      description: "Temperature measurements", 
      icon: Thermometer,
      menuPath: "/ms60s/temperature"
    }
  ];

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>WSC 2025 Analytics Tool</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Card>
            <CardHeader>
              <CardTitle>Upload Your Data</CardTitle>
              <CardDescription>
                Upload CSV files to analyze vehicle data including velocity,
                voltage, and current.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CSVUploader 
                onUploadSuccess={() => setShowGuide(true)} 
                onUpdate={handleUpdate}
              />
            </CardContent>
          </Card>
          
          {/* Data availability card */}
          <Card>
            <CardHeader>
              <CardTitle>Data Availability</CardTitle>
              <CardDescription>
                The following data types have been detected and are available for analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dataTypeInfo.map((item) => {
                  const Icon = item.icon;
                  const isAvailable = 
                    item.type === DataType.MAP || 
                    item.type === DataType.CAN_BMS ||
                    item.type === DataType.CAN_MPPT || 
                    item.type === DataType.CAN_VELOCITY ? 
                    true : hasDataType(item.type);
                  
                  return (
                    <div 
                      key={item.type}
                      className={`flex items-start p-3 rounded-md border ${
                        isAvailable ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mr-2 mt-0.5 ${isAvailable ? 'text-green-600' : 'text-gray-400'}`} />
                      <div>
                        <div className="font-medium flex items-center">
                          {item.title}
                          {isAvailable ? (
                            <Badge variant="outline" className="ml-2 bg-green-100 text-green-700 hover:bg-green-100">
                              Available
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="ml-2 bg-gray-100 text-gray-500 hover:bg-gray-100">
                              Unavailable
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        {isAvailable && (
                          <p className="text-xs text-green-600 mt-1">
                            This data is available for analysis. Visit the corresponding menu to view the results.
                          </p>
                        )}
                        {!isAvailable && (
                          <p className="text-xs text-gray-500 mt-1">
                            Upload data with the required fields to enable this analysis.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved Files</CardTitle>
              <CardDescription>
                Previously uploaded CSV files. Click on a file to load it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CSVFileList key={updateKey} onUpdate={handleUpdate} />
            </CardContent>
          </Card>
          
          {showGuide && (
            <Alert>
              <AlertDescription>
                Great! Your data has been uploaded successfully. Please select a
                data category from the sidebar to analyze specific aspects of
                your vehicle&apos;s performance.
              </AlertDescription>
            </Alert>
          )}
          
          {currentData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Data Preview</CardTitle>
                <CardDescription>
                  Showing the first 10 rows of the currently selected data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((column) => (
                          <TableHead key={column} className="whitespace-nowrap">
                            {column}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentData.slice(0, 10).map((row, index) => (
                        <TableRow key={index}>
                          {columns.map((column) => (
                            <TableCell key={column} className="whitespace-nowrap">
                              {row[column as keyof typeof row]?.toString() ?? "-"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
          
          {dataSets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Loaded Datasets</CardTitle>
                <CardDescription>
                  All datasets currently loaded in the application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dataSets.map((dataSet, index) => (
                    <div key={index} className="p-3 border rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{dataSet.fileName}</p>
                          <p className="text-sm text-muted-foreground">
                            Type: {dataSet.type} | Rows: {dataSet.data.length}
                          </p>
                        </div>
                        <Badge className={
                          dataSet.type === 'can' ? 'bg-blue-100 text-blue-800' : 
                          dataSet.type === 'ms60s' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }>
                          {dataSet.type.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 