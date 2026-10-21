import {
  BadgeCheck,
  Brain,
  CalendarClock,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Building2,
  LayoutDashboard,
  Landmark,
  LifeBuoy,
  LineChart,
  MessagesSquare,
  Scale,
  ScrollText,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { NavArea } from "@/lib/domain";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  area: NavArea;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      {
        href: "/operations",
        label: "Home",
        description: "Workload and follow-up",
        icon: LayoutDashboard,
        area: "home",
      },
      {
        href: "/tasks",
        label: "My Tasks",
        description: "Follow-ups",
        icon: ClipboardList,
        area: "tasks",
      },
      {
        href: "/appointments",
        label: "Appointments",
        description: "Meetings",
        icon: CalendarClock,
        area: "appointments",
      },
      {
        href: "/approvals",
        label: "Approvals",
        description: "Decisions waiting on your role",
        icon: ClipboardCheck,
        area: "withdrawals",
      },
      {
        href: "/copilot",
        label: "Copilot",
        description: "Questions on the book",
        icon: Brain,
        area: "copilot",
      },
    ],
  },
  {
    id: "members",
    label: "Members and companies",
    items: [
      {
        href: "/members",
        label: "Member Directory",
        description: "Member records",
        icon: Users,
        area: "members",
      },
      {
        href: "/companies",
        label: "Companies",
        description: "Employers on a scheme",
        icon: Building2,
        area: "companies",
      },
      {
        href: "/documents",
        label: "Documents",
        description: "Files on a member",
        icon: FileText,
        area: "documents",
      },
      {
        href: "/messages",
        label: "Messages",
        description: "Notes with members",
        icon: MessagesSquare,
        area: "messages",
      },
      {
        href: "/requests",
        label: "Member Requests",
        description: "Messages from members",
        icon: LifeBuoy,
        area: "requests",
      },
    ],
  },
  {
    id: "pension",
    label: "Pension operations",
    items: [
      {
        href: "/contributions",
        label: "Contributions",
        description: "Posted contributions",
        icon: CircleDollarSign,
        area: "contributions",
      },
      {
        href: "/contributions#reconciliation",
        label: "Reconciliation",
        description: "Payments not yet on a member",
        icon: Scale,
        area: "contributions",
      },
      {
        href: "/withdrawals",
        label: "Withdrawals & Claims",
        description: "Requests through payment",
        icon: Wallet,
        area: "withdrawals",
      },
    ],
  },
  {
    id: "schemes",
    label: "Schemes",
    items: [
      {
        href: "/schemes",
        label: "Schemes",
        description: "Pension schemes and assignments",
        icon: Landmark,
        area: "schemes",
      },
    ],
  },
  {
    id: "funds",
    label: "Reports",
    items: [
      {
        href: "/monitoring",
        label: "Fund Overview",
        description: "Scheme position for the period",
        icon: LineChart,
        area: "monitoring",
      },
      {
        href: "/monitoring#reports",
        label: "Reports",
        description: "Exports from the book",
        icon: FileText,
        area: "monitoring",
      },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    items: [
      {
        href: "/unit-price",
        label: "Fund Settings",
        description: "Unit price",
        icon: BadgeCheck,
        area: "unitPrice",
      },
      {
        href: "/staff",
        label: "Users & Permissions",
        description: "Access",
        icon: Users,
        area: "staff",
      },
      {
        href: "/audit",
        label: "Audit Log",
        description: "Who changed what",
        icon: ScrollText,
        area: "audit",
      },
    ],
  },
];

const HASH_OWNERS = ["/contributions", "/monitoring"];

export function isActiveRoute(pathname: string, href: string, hash = "") {
  const [path, fragment] = href.split("#");
  const matchesPath = pathname === path || pathname.startsWith(`${path}/`);
  if (!matchesPath) return false;
  if (fragment) return pathname === path && hash === `#${fragment}`;
  if (HASH_OWNERS.includes(path) && hash.length > 1) return false;
  return true;
}
