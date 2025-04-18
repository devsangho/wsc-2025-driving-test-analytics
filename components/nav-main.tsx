"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDataContext } from "@/app/contexts/data-context";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface NavMainProps {
  items: {
    title: string;
    url?: string;
    icon: LucideIcon;
    isActive?: boolean;
    disabled?: boolean;
    items?: {
      title: string;
      url: string;
      disabled?: boolean;
    }[];
  }[];
}

export function NavMain({ items }: NavMainProps) {
  const pathname = usePathname();
  const { dataSets } = useDataContext();

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    hasData: boolean,
    isDisabled: boolean
  ) => {
    if (!hasData || isDisabled) {
      e.preventDefault();
    }
  };

  return (
    <nav className="space-y-1">
      {items.map((item, index) => {
        const Icon = item.icon;
        const isActive = pathname === item.url || item.isActive;
        const hasData = dataSets.length > 0;
        const isDisabled = item.disabled === true;
        const url = item.url || "#";

        return (
          <div key={index} className="space-y-1">
            <Link
              href={url}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                (!hasData || isDisabled) && "pointer-events-none opacity-50"
              )}
              onClick={(e) => handleNavClick(e, hasData, isDisabled)}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
              {isDisabled && (
                <span className="ml-auto text-xs text-muted-foreground">Unavailable</span>
              )}
            </Link>
            {item.items?.length ? (
              <div className="pl-6 space-y-1">
                {item.items.map((subItem, subIndex) => {
                  const isSubActive = pathname === subItem.url;
                  const isSubDisabled = subItem.disabled === true || isDisabled;

                  return (
                    <Link
                      key={subIndex}
                      href={subItem.url}
                      className={cn(
                        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isSubActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        (!hasData || isSubDisabled) && "pointer-events-none opacity-50"
                      )}
                      onClick={(e) => handleNavClick(e, hasData, isSubDisabled)}
                    >
                      <span>{subItem.title}</span>
                      {isSubDisabled && (
                        <span className="ml-auto text-xs text-muted-foreground">Unavailable</span>
                      )}
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
