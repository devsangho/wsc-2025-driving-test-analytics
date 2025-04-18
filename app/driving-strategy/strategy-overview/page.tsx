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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SimpleChart } from "@/components/simple-chart";
import { useDataContext } from "@/app/contexts/data-context";
import { Badge } from "@/components/ui/badge";

export default function StrategyOverviewPage() {
  const { currentData } = useDataContext();
  
  // Sample strategy overview data (similar to what's shown in the image)
  const strategyOverviewData = {
    labels: ["Darwin", "Katherine", "Dunmarra", "Tennant Creek", "Ti Tree", "Alice", "Kulgera", "Coober Pedy", "Glendambo", "Port Augusta"],
    datasets: [
      {
        label: "Strategy Profile",
        data: [100, 180, 150, 210, 250, 180, 230, 200, 160, 130],
        borderColor: "hsl(var(--primary))",
        backgroundColor: "hsla(var(--primary), 0.2)",
      }
    ],
  };

  // Sample power balance data
  const powerBalanceData = {
    labels: ["Darwin", "Katherine", "Dunmarra", "Tennant Creek", "Ti Tree", "Alice", "Kulgera", "Coober Pedy", "Glendambo", "Port Augusta"],
    datasets: [
      {
        label: "Power (kW)",
        data: [1.2, 1.8, 1.5, 2.1, 2.5, 1.8, 2.3, 2.0, 1.6, 1.3],
        borderColor: "rgba(54, 162, 235, 1)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
      }
    ],
  };

  // Sample resistance force data
  const resistanceForceData = {
    labels: ["Darwin", "Katherine", "Dunmarra", "Tennant Creek", "Ti Tree", "Alice", "Kulgera", "Coober Pedy", "Glendambo", "Port Augusta"],
    datasets: [
      {
        label: "Force (N)",
        data: [80, 100, 90, 110, 130, 100, 120, 110, 95, 85],
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
      }
    ],
  };

  // Sample efficiency data
  const efficiencyData = {
    labels: ["Darwin", "Katherine", "Dunmarra", "Tennant Creek", "Ti Tree", "Alice", "Kulgera", "Coober Pedy", "Glendambo", "Port Augusta"],
    datasets: [
      {
        label: "Efficiency (%)",
        data: [85, 82, 88, 90, 86, 84, 89, 87, 85, 83],
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
      }
    ],
  };
  
  // Check if data is loaded
  const hasData = currentData.length > 0;

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
                  <BreadcrumbPage>주행 전략 가시화</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {!hasData && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Please upload and select data from the dashboard to view driving strategy analysis</p>
            </div>
          )}
          
          {hasData && (
            <>
              {/* Strategy Overview Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>Strategy Overall</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        Energy Balance Check
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        Noise 입자 (GHI, Wind)에 따른 영향 검점
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 mb-2">
                    <SimpleChart data={strategyOverviewData} />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Distance from Darwin
                  </div>
                </CardContent>
              </Card>

              {/* Power Balance Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>Power Balance</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        Power Balance: Sum(P)=0
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        Motor 의 Nominal Power 초과 정도와 시간
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        Battery C Rate
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 mb-2">
                    <SimpleChart data={powerBalanceData} />
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="flex space-x-2">
                      <div className="text-xs font-medium">Pmppt</div>
                      <div className="text-xs text-gray-500">[kW]</div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="text-xs font-medium">Pmotor</div>
                      <div className="text-xs text-gray-500">[kph]</div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="text-xs font-medium">Pbattery</div>
                      <div className="text-xs text-gray-500">[hour]</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-4">
                    수직 그래프로 표시
                  </div>
                </CardContent>
              </Card>

              {/* Resistance Force Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>Resistance Force</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        속도의 구배에 따른 주행저항 계산의 적정성
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        Pmotor와의 부합 여부
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 mb-2">
                    <SimpleChart data={resistanceForceData} />
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="flex space-x-2">
                      <div className="text-xs font-medium">FWind</div>
                      <div className="text-xs text-gray-500">[N]</div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="text-xs font-medium">FRolling</div>
                      <div className="text-xs text-gray-500">[N]</div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="text-xs font-medium">FGrade</div>
                      <div className="text-xs text-gray-500">[N]</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-4">
                    수직 그래프로 표시
                  </div>
                </CardContent>
              </Card>

              {/* Efficiency Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>Efficiency</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        운전영역에 따른 효율 값이 적절하게 가정되었는지
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 mb-2">
                    <SimpleChart data={efficiencyData} />
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="flex space-x-2">
                      <div className="text-xs font-medium">ηmppt</div>
                      <div className="text-xs text-gray-500">[%]</div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="text-xs font-medium">ηbattery</div>
                      <div className="text-xs text-gray-500">[%]</div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="text-xs font-medium">ηmotor</div>
                      <div className="text-xs text-gray-500">[%]</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 