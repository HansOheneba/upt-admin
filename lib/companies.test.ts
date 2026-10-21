import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addCompany,
  assignCompanyToScheme,
  endCompanyScheme,
  endEmployment,
  linkEmployment,
  setCompanyManager,
  type ActionResult,
} from "./actions.ts";
import { companiesForStaff } from "./domain.ts";
import { createSeed } from "./seed.ts";

function must(result: ActionResult) {
  if ("error" in result) throw new Error(result.error);
  return result.book;
}

describe("companies", () => {
  it("keeps company scope, employment, and memberships separate", () => {
    const book = createSeed();
    const abena = book.staff.find((person) => person.id === "stf-abena");
    const adwoa = book.staff.find((person) => person.id === "stf-adwoa");
    const darko = book.staff.find((person) => person.id === "stf-darko");
    const kojo = book.staff.find((person) => person.id === "stf-kojo");
    assert.ok(abena && adwoa && darko && kojo);

    assert.equal(companiesForStaff(book, abena).some((company) => company.id === "co-harbour"), true);
    assert.equal(companiesForStaff(book, darko).some((company) => company.id === "co-harbour"), true);
    assert.equal(companiesForStaff(book, adwoa).some((company) => company.id === "co-harbour"), false);
    assert.equal(companiesForStaff(book, kojo).some((company) => company.id === "co-harbour"), false);

    const duplicate = addCompany(book, abena, { name: "Other Harbour", reference: "hco" });
    assert.equal("error" in duplicate, true);

    const beforeMemberships = book.memberships.length;
    const employed = must(
      linkEmployment(book, abena, {
        memberId: "mem-kofi",
        companyId: "co-harbour",
        effectiveFrom: "2026-02-01",
      }),
    );
    assert.equal(employed.memberships.length, beforeMemberships);
    assert.equal(
      employed.employments.some(
        (employment) => employment.memberId === "mem-kofi" && employment.companyId === "co-harbour" && !employment.effectiveTo,
      ),
      true,
    );
    assert.equal("error" in linkEmployment(book, adwoa, { memberId: "mem-nana", companyId: "co-harbour" }), true);

    const joined = must(
      assignCompanyToScheme(employed, abena, {
        companyId: "co-harbour",
        schemeId: "sch-mop",
        effectiveFrom: "2026-03-01",
      }),
    );
    assert.equal(joined.companies.filter((company) => company.id === "co-harbour").length, 1);
    assert.equal(
      joined.companySchemes.filter((row) => row.companyId === "co-harbour" && row.status === "active").length,
      2,
    );
    const personal = joined.memberships.find((membership) => membership.id === "memship-mem-ama");
    assert.equal(personal?.status, "active");
    assert.equal(personal?.companyId, null);

    const ended = must(endEmployment(joined, abena, "emp-ama"));
    assert.equal(ended.employments.find((employment) => employment.id === "emp-ama")?.effectiveTo !== null, true);
    assert.equal(ended.memberships.find((membership) => membership.id === "memship-mem-ama")?.status, "active");
    assert.equal(ended.memberships.find((membership) => membership.id === "memship-ama-hsp")?.status, "active");

    const participation = ended.companySchemes.find((row) => row.id === "csa-harbour-hsp");
    assert.ok(participation);
    const closedScheme = must(endCompanyScheme(ended, abena, participation.id));
    assert.equal(closedScheme.companySchemes.find((row) => row.id === "csa-harbour-hsp")?.status, "ended");
    assert.equal(closedScheme.memberships.find((membership) => membership.id === "memship-ama-hsp")?.status, "active");

    assert.equal("error" in setCompanyManager(book, adwoa, "co-harbour", "stf-esi"), true);
    const managed = must(setCompanyManager(book, abena, "co-harbour", "stf-kojo"));
    assert.equal(companiesForStaff(managed, kojo).some((company) => company.id === "co-harbour"), true);
  });
});
