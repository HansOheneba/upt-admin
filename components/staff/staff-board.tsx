"use client";

import { useState } from "react";
import { Users } from "lucide-react";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { controlClass } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ROLE_LABEL, type Role } from "@/lib/domain";

const ROLES: Role[] = [
  "member_services",
  "finance",
  "review",
  "relationship_manager",
  "supervisor",
];

export function StaffBoard() {
  const { book, addStaff, removeStaff, staff } = useRecords();
  const [roles, setRoles] = useState<Role[]>(["member_services"]);
  const active = book.staff.filter((person) => person.active);

  return (
    <div>
      <PageHeader
        title="Users & permissions"
        description="Add or remove access, and set the role. Seeing a queue and changing it stay separate."
      />
      {active.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No staff"
          description="Add a person and choose the role they work in."
        />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-card">
          {active.map((person) => (
            <li key={person.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-sm font-medium text-navy">{person.name}</p>
                <p className="text-xs text-muted">{person.email}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {person.roles.map((role) => (
                    <StatusBadge key={role} label={ROLE_LABEL[role]} />
                  ))}
                </div>
              </div>
              {person.id !== staff?.id ? (
                <Button variant="secondary" onClick={() => removeStaff(person.id)}>
                  Remove access
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-6 grid max-w-lg gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const ok = addStaff({
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            roles,
          });
          if (ok) event.currentTarget.reset();
        }}
      >
        <h2 className="text-sm font-medium text-navy">Add staff</h2>
        <label className="text-sm font-medium text-navy">
          Name
          <input name="name" required className={`${controlClass} mt-1`} />
        </label>
        <label className="text-sm font-medium text-navy">
          Work email
          <input name="email" type="email" required placeholder="name@upt.com.gh" className={`${controlClass} mt-1`} />
        </label>
        <fieldset className="flex flex-col gap-2 text-sm text-navy">
          <legend className="mb-1 font-medium">Roles</legend>
          {ROLES.map((role) => (
            <label key={role} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={roles.includes(role)}
                onChange={(event) =>
                  setRoles((current) =>
                    event.target.checked
                      ? [...current, role]
                      : current.filter((item) => item !== role),
                  )
                }
              />
              {ROLE_LABEL[role]}
            </label>
          ))}
        </fieldset>
        <Button type="submit">Add staff</Button>
      </form>
    </div>
  );
}
