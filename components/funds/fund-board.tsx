"use client";

import { useRecords } from "@/components/records/records-provider";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { FUNDS } from "@/lib/demo";
import { ghs } from "@/lib/format";

export function FundBoard() {
  const { fund, setFundId } = useRecords();

  return (
    <div>
      <PageHeader
        title="Funds"
        description="Scheme books for United Pension Trustees. Choose a scheme to work in that book."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {FUNDS.map((item) => {
          const selected = item.id === fund.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFundId(item.id)}
              className={`cursor-pointer rounded-xl border bg-card px-4 py-3 text-left ${
                selected ? "border-navy" : "border-line hover:border-navy/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-navy">{item.name}</p>
                {selected ? (
                  <span className="rounded-full bg-gold px-3 py-1 text-xs font-medium text-navy">
                    In view
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted">
                {item.alsoKnownAs} · {item.kind}
              </p>
            </button>
          );
        })}
      </div>
      <section className="mt-4 rounded-xl border border-line bg-card p-5">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          In view
        </p>
        <h2 className="mt-1 text-lg font-medium text-navy">{fund.name}</h2>
        <p className="text-sm text-muted">
          {fund.alsoKnownAs} · as at {fund.asAt}
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Net asset value" value={ghs(fund.netAssetValue)} />
          <StatCard label="Contributions" value={ghs(fund.contributions)} />
          <StatCard label="Withdrawals" value={ghs(fund.withdrawals)} />
          <StatCard label="Gain / loss" value={ghs(fund.gainLoss)} />
        </div>
      </section>
    </div>
  );
}
