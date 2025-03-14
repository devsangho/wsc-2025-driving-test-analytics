"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDataContext } from "@/app/layout";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface NavMainProps {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}

export function NavMain({ items }: NavMainProps) {
  const pathname = usePathname();
  const { data } = useDataContext();

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    hasData: boolean
  ) => {
    if (!hasData) {
      e.preventDefault();
    }
  };

  return (
    <nav className="space-y-1">
      {items.map((item, index) => {
        const Icon = item.icon;
        const isActive = pathname === item.url || item.isActive;
        const hasData = data.length > 0;

        return (
          <div key={index} className="space-y-1">
            <Link
              href={item.url}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                !hasData && "pointer-events-none opacity-50"
              )}
              onClick={(e) => handleNavClick(e, hasData)}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
            {item.items?.length ? (
              <div className="pl-6 space-y-1">
                {item.items.map((subItem, subIndex) => {
                  const isSubActive = pathname === subItem.url;

                  return (
                    <Link
                      key={subIndex}
                      href={subItem.url}
                      className={cn(
                        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isSubActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        !hasData && "pointer-events-none opacity-50"
                      )}
                      onClick={(e) => handleNavClick(e, hasData)}
                    >
                      <span>{subItem.title}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
