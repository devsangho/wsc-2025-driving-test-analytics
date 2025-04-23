"use client";

import { NavMain } from "@/components/nav-main";
import { Sidebar } from "@/components/ui/sidebar";
import { Battery, Gauge, Map, Thermometer, PlayCircle } from "lucide-react";
import { useDataContext } from "@/app/contexts/data-context";
import { DataType } from "@/app/contexts/data-context";

export function AppSidebar() {
  const { hasDataType } = useDataContext();

  // MS60S 메뉴 활성화 여부 결정을 위한 상태 확인
  const ms60sIrradianceActive = hasDataType(DataType.MS60S_IRRADIANCE);
  const ms60sTiltActive = hasDataType(DataType.MS60S_TILT);
  const ms60sTemperatureActive = hasDataType(DataType.MS60S_TEMPERATURE);
  const ms60sActive =
    ms60sIrradianceActive || ms60sTiltActive || ms60sTemperatureActive;

  const items = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Gauge,
    },
    {
      title: "Simulation",
      url: "/simulation",
      icon: PlayCircle,
      disabled: false,
    },
    {
      title: "Driving Strategy",
      url: "/driving-strategy",
      icon: Map,
      disabled: false,
    },
    {
      title: "CAN",
      url: "/can",
      icon: Battery,
      disabled: false,
      items: [
        {
          title: "BMS",
          url: "/can/bms",
          disabled: false,
        },
        {
          title: "MPPT",
          url: "/can/mppt",
          disabled: false,
        },
        {
          title: "Velocity",
          url: "/can/velocity",
          disabled: false,
        },
      ],
    },
    {
      title: "MS60S",
      url: ms60sActive ? "/ms60s" : undefined,
      icon: Thermometer,
      disabled: !ms60sActive,
      items: [
        {
          title: "Irradiance",
          url: "/ms60s/irradiance",
          disabled: !ms60sIrradianceActive,
        },
        {
          title: "Tilt",
          url: "/ms60s/tilt",
          disabled: !ms60sTiltActive,
        },
        {
          title: "Temperature",
          url: "/ms60s/temperature",
          disabled: !ms60sTemperatureActive,
        },
      ],
    },
  ];

  return (
    <Sidebar>
      <div className="flex h-full flex-col gap-4">
        <div className="px-4 py-4">
          <h1 className="text-lg font-semibold leading-none">WSC SNU SOLO</h1>
          <p className="text-sm text-muted-foreground">
            Driving Test Analytics
          </p>
        </div>
        <div className="px-2">
          <NavMain items={items} />
        </div>
        <div className="mt-auto px-4 py-4 text-xs text-muted-foreground">
          <div className="flex flex-col items-start gap-1">
            <a
              href="https://github.com/devsangho"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              developed by @devsangho
            </a>
            <span>AIRLaboratory</span>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}
