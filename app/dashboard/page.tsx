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

export default function Page() {
  const [showGuide, setShowGuide] = useState(false);
  const [updateKey, setUpdateKey] = useState(0);
  const { data } = useDataContext();

  const handleUpdate = () => {
    setUpdateKey(prev => prev + 1);
  };

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

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
          {data.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Data Preview</CardTitle>
                <CardDescription>
                  Showing the first 10 rows of the raw CSV data
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
                      {data.slice(0, 10).map((row, index) => (
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
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
