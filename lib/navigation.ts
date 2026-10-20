import {
  BadgeCheck,
  Brain,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  MessagesSquare,
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

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/operations",
    label: "Home",
    description: "Work waiting",
    icon: LayoutDashboard,
    area: "home",
  },
  {
    href: "/members",
    label: "Members",
    description: "Member records",
    icon: Users,
    area: "members",
  },
  {
    href: "/withdrawals",
    label: "Withdrawals",
    description: "Received through payment",
    icon: Wallet,
    area: "withdrawals",
  },
  {
    href: "/contributions",
    label: "Contributions",
    description: "Mobile Money to post",
    icon: CircleDollarSign,
    area: "contributions",
  },
  {
    href: "/unit-price",
    label: "Unit price",
    description: "Price and history",
    icon: BadgeCheck,
    area: "unitPrice",
  },
  {
    href: "/requests",
    label: "Requests",
    description: "Messages from members",
    icon: LifeBuoy,
    area: "requests",
  },
  {
    href: "/appointments",
    label: "Appointments",
    description: "Meetings",
    icon: CalendarClock,
    area: "appointments",
  },
  {
    href: "/tasks",
    label: "Tasks",
    description: "Follow-ups",
    icon: ClipboardList,
    area: "tasks",
  },
  {
    href: "/messages",
    label: "Messages",
    description: "Unanswered notes",
    icon: MessagesSquare,
    area: "messages",
  },
  {
    href: "/documents",
    label: "Documents",
    description: "Files on a member",
    icon: FileText,
    area: "documents",
  },
  {
    href: "/monitoring",
    label: "Monitoring",
    description: "The book for a period",
    icon: LineChart,
    area: "monitoring",
  },
  {
    href: "/audit",
    label: "Audit",
    description: "Who changed what",
    icon: ScrollText,
    area: "audit",
  },
  {
    href: "/staff",
    label: "Staff",
    description: "Access",
    icon: Users,
    area: "staff",
  },
  {
    href: "/copilot",
    label: "Copilot",
    description: "Questions on the book",
    icon: Brain,
    area: "copilot",
  },
];

export function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
