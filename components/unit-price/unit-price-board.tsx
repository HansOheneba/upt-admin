"use client";

import { BadgeCheck } from "lucide-react";

import { useRecords } from "@/components/records/records-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { controlClass } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate, formatDateTime, todayIso } from "@/lib/format";
import { currentUnitPrice, pricesForScheme, sortedPrices } from "@/lib/pension";

export function UnitPriceBoard() {
  const { book, setUnitPrice, canFinance, schemeId, schemes } = useRecords();
  const scheme = schemes.find((item) => item.id === schemeId) ?? null;
  const series = scheme ? pricesForScheme(book, scheme.id) : [];
  const current = currentUnitPrice(series);
  const history = [...sortedPrices(series)].reverse();
  const setter = (id: string) => book.staff.find((person) => person.id === id)?.name ?? "Finance";

  return (
    <div>
      <PageHeader
        title="Fund settings"
        description={
          scheme
            ? `The unit price for ${scheme.name}. A new price is added. It does not replace history.`
            : "Choose one scheme before setting a unit price."
        }
      />
      {!scheme ? (
        <EmptyState
          icon={BadgeCheck}
          title="Choose a scheme"
          description="Unit prices belong to one scheme. Select it in the scheme menu."
        />
      ) : current ? (
        <article className="rounded-xl border border-line bg-card px-5 py-4">
          <p className="text-xs font-medium text-muted">Current price</p>
          <p className="mt-2 text-2xl font-medium text-navy tabular-nums">{current.price.toFixed(3)}</p>
          <p className="mt-1 text-sm text-muted">
            Applies {formatDate(current.date)} · set by {setter(current.setBy)} · {formatDateTime(current.setAt)}
          </p>
        </article>
      ) : (
        <EmptyState
          icon={BadgeCheck}
          title="No unit price"
          description="Every member pot stays unavailable until finance sets a price."
        />
      )}
      {canFinance && scheme ? (
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const ok = setUnitPrice({
              schemeId: scheme.id,
              date: String(form.get("date") ?? ""),
              price: Number(form.get("price") ?? 0),
            });
            if (ok) event.currentTarget.reset();
          }}
        >
          <label className="text-sm font-medium text-navy">
            Date it applies
            <input name="date" type="date" required defaultValue={todayIso()} className={`${controlClass} mt-1`} />
          </label>
          <label className="text-sm font-medium text-navy">
            Price
            <input name="price" type="number" required min="0.001" step="0.001" placeholder="1.884" className={`${controlClass} mt-1`} />
          </label>
          <Button type="submit">Set unit price</Button>
        </form>
      ) : null}
      <h2 className="mt-6 mb-3 text-base font-semibold text-navy">Price history</h2>
      {history.length === 0 ? (
        <p className="text-sm text-muted">No prices stored.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-card">
          {history.map((row) => (
            <li key={row.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="tabular-nums text-navy">{row.price.toFixed(3)}</span>
              <span className="text-muted">
                {formatDate(row.date)} · {setter(row.setBy)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
