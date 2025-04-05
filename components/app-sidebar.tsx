"use client";

import { NavMain } from "@/components/nav-main";
import { Sidebar } from "@/components/ui/sidebar";
import { Battery, Gauge } from "lucide-react";

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Gauge,
  },
  {
    title: "CAN",
    url: "/can",
    icon: Battery,
    items: [
      {
        title: "BMS",
        url: "/can/bms",
      },
      {
        title: "MPPT",
        url: "/can/mppt",
      },
      {
        title: "Velocity",
        url: "/can/velocity",
      },
    ],
  },
  {
    title: "MS60S",
    url: "/ms60s",
    icon: Gauge,
    items: [
      {
        title: "Irradiance",
        url: "/ms60s/irradiance",
      },
      {
        title: "Tilt",
        url: "/ms60s/tilt",
      },
      {
        title: "Temperature",
        url: "/ms60s/temperature",
      },
    ],
  },
];

export function AppSidebar() {
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
