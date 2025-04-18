"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { LineChart } from "@/components/line-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataContext } from "@/app/contexts/data-context";
import { DataRow } from "@/types/data";

export default function MPPTPage() {
  const { currentData } = useDataContext();
  const router = useRouter();

  useEffect(() => {
    if (!currentData || currentData.length === 0) {
      router.push("/dashboard");
    }
  }, [currentData, router]);

  if (!currentData || currentData.length === 0) return null;

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
                  <BreadcrumbPage>MPPT Data</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Tabs defaultValue="mppt1" className="space-y-4">
            <TabsList>
              <TabsTrigger value="mppt1">MPPT 1</TabsTrigger>
              <TabsTrigger value="mppt2">MPPT 2</TabsTrigger>
              <TabsTrigger value="mppt3">MPPT 3</TabsTrigger>
              <TabsTrigger value="mppt4">MPPT 4</TabsTrigger>
            </TabsList>
            {[1, 2, 3, 4].map((num) => (
              <TabsContent key={num} value={`mppt${num}`} className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>MPPT {num} Input Voltage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LineChart
                      data={currentData}
                      title={`MPPT ${num} Input Voltage over Time`}
                      xAxisKey={"Timestamp" as keyof DataRow}
                      yAxisKey={`MPPT${num}_InputVoltage` as keyof DataRow}
                      yAxisLabel="Input Voltage (V)"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>MPPT {num} Output Voltage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LineChart
                      data={currentData}
                      title={`MPPT ${num} Output Voltage over Time`}
                      xAxisKey={"Timestamp" as keyof DataRow}
                      yAxisKey={`MPPT${num}_OutputVoltage` as keyof DataRow}
                      yAxisLabel="Output Voltage (V)"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>MPPT {num} Temperature</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LineChart
                      data={currentData}
                      title={`MPPT ${num} Temperature over Time`}
                      xAxisKey={"Timestamp" as keyof DataRow}
                      yAxisKey={`MPPT${num}_FetTemp` as keyof DataRow}
                      yAxisLabel="Temperature (°C)"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
