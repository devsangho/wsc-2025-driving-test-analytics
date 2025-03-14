"use client";

import { Activity, Battery, Gauge, Zap } from "lucide-react";
import { NavMain } from "@/components/nav-main";
import { Sidebar } from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Activity,
    isActive: true,
  },
  {
    title: "BMS Data",
    url: "/bms",
    icon: Battery,
  },
  {
    title: "MPPT Data",
    url: "/mppt",
    icon: Zap,
  },
  {
    title: "Velocity Data",
    url: "/velocity",
    icon: Gauge,
  },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <div className="flex h-full flex-col gap-4 p-4">
        <div className="flex h-[60px] items-center px-2">
          <h2 className="text-lg font-semibold">WSC 2025</h2>
        </div>
        <div className="flex-1 overflow-auto">
          <NavMain items={navItems} />
        </div>
      </div>
    </Sidebar>
  );
}
