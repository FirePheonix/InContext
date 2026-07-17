import { LayoutDashboard, Lock, type LucideIcon, Server, Users } from "lucide-react";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "InContext",
    items: [
      {
        id: "default",
        title: "Overview",
        url: "/dashboard/productivity",
        icon: LayoutDashboard,
      },
      {
        id: "productivity",
        title: "Projects",
        url: "/dashboard/users",
        icon: Users,
      },
      {
        id: "infrastructure",
        title: "Architecture",
        url: "/dashboard/infrastructure",
        icon: Server,
      },
      {
        id: "roles",
        title: "Agent Access",
        url: "/dashboard/roles",
        icon: Lock,
        badge: "new",
      },
    ],
  },
];
