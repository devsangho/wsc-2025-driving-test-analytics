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
import { LineChart } from "@/components/line-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataContext } from "@/app/contexts/data-context";

export default function BMSPage() {
  const { data } = useDataContext();

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
                  <BreadcrumbPage>BMS Data</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Tabs defaultValue="voltage" className="space-y-4">
            <TabsList>
              <TabsTrigger value="voltage">Voltage</TabsTrigger>
              <TabsTrigger value="current">Current</TabsTrigger>
              <TabsTrigger value="soc">State of Charge</TabsTrigger>
              <TabsTrigger value="temperature">Temperature</TabsTrigger>
            </TabsList>
            <TabsContent value="voltage" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>BMS Voltage</CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChart
                    data={data}
                    title="BMS Voltage over Time"
                    xAxisKey="Timestamp"
                    yAxisKey="BMS_Voltage"
                    yAxisLabel="Voltage (V)"
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="current" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>BMS Current</CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChart
                    data={data}
                    title="BMS Current over Time"
                    xAxisKey="Timestamp"
                    yAxisKey="BMS_Current"
                    yAxisLabel="Current (A)"
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="soc" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>State of Charge</CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChart
                    data={data}
                    title="State of Charge over Time"
                    xAxisKey="Timestamp"
                    yAxisKey="BMS_SoC"
                    yAxisLabel="SoC (%)"
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="temperature" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Battery Temperature</CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChart
                    data={data}
                    title="Battery Temperature over Time"
                    xAxisKey="Timestamp"
                    yAxisKey="BMS_batt_temp_1"
                    yAxisLabel="Temperature (°C)"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
