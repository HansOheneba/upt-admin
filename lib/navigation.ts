import {
  BadgeCheck,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/operations",
    label: "Operations",
    description: "Today's queues",
    icon: LayoutDashboard,
  },
  {
    href: "/members",
    label: "Members",
    description: "Unitholders and records",
    icon: Users,
  },
  {
    href: "/requests",
    label: "Requests",
    description: "Enquiries, withdrawals and claims",
    icon: LifeBuoy,
  },
  {
    href: "/withdrawals",
    label: "Withdrawals",
    description: "Validation through payment",
    icon: Wallet,
  },
  {
    href: "/funds",
    label: "Funds",
    description: "Personal Pension book",
    icon: Landmark,
  },
  {
    href: "/approvals",
    label: "Approvals",
    description: "Second-person checks",
    icon: BadgeCheck,
  },
];

export function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
