"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataContext } from "@/app/contexts/data-context";
import { DataRow } from "@/types/data";

// 차트 컴포넌트를 동적으로 불러오기
const LineChart = dynamic(() => import("@/components/line-chart").then(mod => mod.LineChart), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-48">차트 로딩 중...</div>
});

export default function VelocityPage() {
  const { currentData } = useDataContext();
  const router = useRouter();

  useEffect(() => {
    if (!currentData || currentData.length === 0) {
      router.push("/dashboard");
    }
  }, [currentData, router]);

  // 데이터가 없으면 로딩 상태 표시
  if (!currentData || currentData.length === 0) {
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
                    <BreadcrumbPage>Velocity Data</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <Card>
              <CardHeader>
                <CardTitle>Velocity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  데이터를 불러오는 중이거나 사용 가능한 데이터가 없습니다.
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // 데이터가 있는 경우 차트 표시
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
                  <BreadcrumbPage>Velocity Data</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Card>
            <CardHeader>
              <CardTitle>Velocity</CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart
                data={currentData}
                title="Velocity over Time"
                xAxisKey={"Timestamp" as keyof DataRow}
                yAxisKey={"Velocity" as keyof DataRow}
                yAxisLabel="Velocity (km/h)"
              />
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
