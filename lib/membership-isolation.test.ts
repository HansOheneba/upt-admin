import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addContribution,
  closeMembership,
  confirmEnrolment,
  reverseContribution,
  setUnitPrice,
  type ActionResult,
} from "./actions.ts";
import type { Book, Member, Membership, Staff } from "./domain.ts";
import { visibleMemberships } from "./domain.ts";
import { migrateBook } from "./migrate.ts";
import { membershipPosition } from "./pension.ts";
import { createSeed } from "./seed.ts";

function must(result: ActionResult) {
  if ("error" in result) throw new Error(result.error);
  return result.book;
}

function person(): Member {
  return {
    id: "mem-kwame",
    firstName: "Kwame",
    lastName: "Mensah",
    displayName: "",
    email: "kwame@example.com",
    mobile: "0244000000",
    dateOfBirth: "1988-04-12",
    gender: "Male",
    title: "Mr",
    profession: "Engineer",
    location: "Accra",
    nextOfKin: "Ama Mensah",
    nextOfKinContact: "0244111111",
  };
}

function membership(input: Partial<Membership> & Pick<Membership, "id" | "schemeId" | "membershipNumber">): Membership {
  return {
    memberId: "mem-kwame",
    status: "active",
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    companyId: null,
    relationshipManagerId: "stf-rm",
    monthlyContribution: 200,
    retirementAge: 60,
    targetPot: 100000,
    ...input,
  };
}

function staff(id: string, roles: Staff["roles"], leadId: string | null = null): Staff {
  return { id, name: id, email: `${id}@upt.com.gh`, roles, active: true, leadId };
}

function blank(overrides: Partial<Book>): Book {
  return {
    version: 4,
    staff: [
      staff("stf-lead", ["team_lead"]),
      staff("stf-rm", ["relationship_manager"], "stf-lead"),
      staff("stf-finance", ["finance"]),
    ],
    schemes: [
      {
        id: "sch-personal",
        name: "My Own Pension",
        code: "MOP",
        status: "open",
        leadId: "stf-lead",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "sch-employer",
        name: "Harbour Staff Pension",
        code: "HSP",
        status: "open",
        leadId: "stf-lead",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    schemeAssignments: [
      {
        id: "sra-rm-personal",
        schemeId: "sch-personal",
        relationshipManagerId: "stf-rm",
        assignedAt: "2026-01-01T00:00:00.000Z",
        assignedBy: "stf-lead",
      },
    ],
    companies: [],
    companySchemes: [],
    employments: [],
    members: [person()],
    memberships: [
      membership({ id: "ship-personal", schemeId: "sch-personal", membershipNumber: "MOP-1" }),
      membership({
        id: "ship-employer",
        schemeId: "sch-employer",
        membershipNumber: "HSP-1",
        companyId: "co-harbour",
        relationshipManagerId: "stf-other",
      }),
    ],
    unitPrices: [
      {
        id: "px-personal",
        schemeId: "sch-personal",
        date: "2026-01-01",
        price: 1.5,
        setBy: "stf-finance",
        setAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "px-employer",
        schemeId: "sch-employer",
        date: "2026-01-01",
        price: 2,
        setBy: "stf-finance",
        setAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    contributions: [],
    payments: [],
    withdrawals: [],
    requests: [],
    assets: [],
    properties: [],
    goals: [],
    cashFlow: [],
    liabilities: [],
    insurance: [],
    retirement: [],
    risk: [],
    emergency: [],
    appointments: [],
    sessions: [],
    tasks: [],
    messages: [],
    documents: [],
    audit: [],
    ...overrides,
  };
}

describe("membership isolation", () => {
  it("keeps a contribution, a reversal, and a price on one membership", () => {
    const finance = staff("stf-finance", ["finance"]);
    const lead = staff("stf-lead", ["team_lead"]);
    let book = blank({});
    book = must(addContribution(book, finance, { membershipId: "ship-personal", date: "2026-10-01", amount: 150 }));
    assert.equal(membershipPosition(book, "ship-personal").units, 100);
    assert.equal(membershipPosition(book, "ship-personal").pot, 150);
    assert.equal(membershipPosition(book, "ship-employer").units, 0);
    assert.equal(membershipPosition(book, "ship-employer").pot, 0);

    book = must(addContribution(book, finance, { membershipId: "ship-employer", date: "2026-10-01", amount: 200 }));
    assert.equal(membershipPosition(book, "ship-employer").units, 100);
    assert.equal(membershipPosition(book, "ship-employer").pot, 200);
    assert.equal(membershipPosition(book, "ship-personal").units, 100);
    assert.equal(membershipPosition(book, "ship-personal").pot, 150);

    book = must(setUnitPrice(book, finance, { schemeId: "sch-employer", date: "2026-11-01", price: 4 }));
    assert.equal(membershipPosition(book, "ship-employer").pot, 400);
    assert.equal(membershipPosition(book, "ship-personal").pot, 150);

    const employerContribution = book.contributions.find((row) => row.membershipId === "ship-employer" && row.amount > 0);
    assert.ok(employerContribution);
    book = must(reverseContribution(book, finance, employerContribution.id));
    assert.equal(membershipPosition(book, "ship-employer").units, 0);
    assert.equal(membershipPosition(book, "ship-personal").units, 100);

    book = must(closeMembership(book, lead, "ship-employer"));
    const personal = book.memberships.find((row) => row.id === "ship-personal");
    const employer = book.memberships.find((row) => row.id === "ship-employer");
    assert.equal(personal?.status, "active");
    assert.equal(employer?.status, "closed");
    assert.equal(book.contributions.filter((row) => row.membershipId === "ship-personal").length, 1);
    assert.equal(membershipPosition(book, "ship-personal").units, 100);
  });

  it("opens a second membership on the same person", () => {
    const lead = staff("stf-lead", ["team_lead"]);
    const book = blank({
      staff: [
        staff("stf-lead", ["team_lead"]),
        staff("stf-rm", ["relationship_manager"], "stf-lead"),
        staff("stf-finance", ["finance"]),
      ],
      companies: [{ id: "co-harbour", name: "Harbour Co Ltd", reference: "HCO", status: "active" }],
      companySchemes: [
        {
          id: "csa-1",
          companyId: "co-harbour",
          schemeId: "sch-employer",
          effectiveFrom: "2026-01-01",
          effectiveTo: null,
          status: "active",
        },
      ],
      employments: [
        {
          id: "emp-1",
          memberId: "mem-kwame",
          companyId: "co-harbour",
          effectiveFrom: "2026-01-01",
          effectiveTo: null,
        },
      ],
      schemeAssignments: [
        {
          id: "sra-rm-employer",
          schemeId: "sch-employer",
          relationshipManagerId: "stf-rm",
          assignedAt: "2026-01-01T00:00:00.000Z",
          assignedBy: "stf-lead",
        },
      ],
      memberships: [membership({ id: "ship-personal", schemeId: "sch-personal", membershipNumber: "MOP-1" })],
    });
    const next = must(
      confirmEnrolment(book, lead, {
        memberId: "mem-kwame",
        schemeId: "sch-employer",
        companyId: "co-harbour",
        relationshipManagerId: "stf-rm",
        monthlyContribution: 350,
        retirementAge: 60,
        targetPot: 80000,
      }),
    );
    assert.equal(next.members.length, 1);
    assert.equal(next.memberships.filter((row) => row.memberId === "mem-kwame").length, 2);
    const opened = next.memberships.find((row) => row.schemeId === "sch-employer");
    assert.equal(opened?.companyId, "co-harbour");
    assert.equal(opened?.status, "active");
  });

  it("limits a relationship manager to assigned clients on assigned schemes", () => {
    const book = blank({});
    const rm = staff("stf-rm", ["relationship_manager"], "stf-lead");
    const visible = visibleMemberships(book, rm).map((row) => row.id);
    assert.deepEqual(visible, ["ship-personal"]);
  });
});

describe("stored book migration", () => {
  it("converts a stored book in place and leaves the multi-scheme seed for an empty store", () => {
    const migrated = migrateBook({
      version: 3,
      staff: [
        { id: "stf-abena", name: "Abena Owusu", email: "abena.owusu@upt.com.gh", roles: ["supervisor"], active: true },
        { id: "stf-kojo", name: "Kojo Mensah", email: "kojo.mensah@upt.com.gh", roles: ["member_services"], active: true },
      ],
      members: [
        {
          id: "mem-ama",
          firstName: "Ama",
          lastName: "Boateng",
          displayName: "",
          email: "ama@example.com",
          mobile: "0244000001",
          dateOfBirth: "1990-01-01",
          gender: "Female",
          title: "Ms",
          profession: "Teacher",
          location: "Accra",
          nextOfKin: "Kofi",
          nextOfKinContact: "0244000002",
          memberNumber: "MOP-10482",
          scheme: "My Own Pension",
          status: "active",
          memberSince: "2022-04-01",
          monthlyContribution: 500,
          retirementAge: 60,
          targetPot: 200000,
          relationshipManagerId: "stf-ama-rm",
        },
      ],
      unitPrices: [{ id: "px-1", date: "2026-08-03", price: 1.884, setBy: "stf-efua", setAt: "2026-08-03T08:00:00.000Z" }],
      contributions: [{ id: "con-1", memberId: "mem-ama", date: "2026-10-06", amount: 500, unitPrice: 1.884, units: 265.39, postedBy: "stf-efua", postedAt: "2026-10-06T09:15:00.000Z" }],
      withdrawals: [],
      requests: [],
    });
    assert.ok(migrated);
    assert.equal(migrated.schemes.length, 1);
    assert.equal(migrated.schemes[0]?.code, "MOP");
    assert.equal(migrated.companies.length, 0);
    assert.equal(migrated.members.length, 1);
    assert.equal("scheme" in migrated.members[0], false);
    assert.equal(migrated.memberships[0]?.membershipNumber, "MOP-10482");
    assert.equal(migrated.contributions[0]?.membershipId, "memship-mem-ama");
    assert.equal(migrated.unitPrices[0]?.schemeId, "sch-mop");
    const abena = migrated.staff.find((person) => person.id === "stf-abena");
    const kojo = migrated.staff.find((person) => person.id === "stf-kojo");
    assert.deepEqual(abena?.roles, ["team_lead"]);
    assert.equal(abena?.roles.includes("management"), false);
    assert.deepEqual(kojo?.roles, ["relationship_manager"]);
    assert.equal(kojo?.leadId, "stf-abena");
    assert.equal(migrated.staff.some((person) => person.roles.includes("management")), true);

    const seed = createSeed();
    assert.ok(seed.schemes.length >= 4);
    assert.equal(seed.staff.find((person) => person.id === "stf-abena")?.roles.includes("team_lead"), true);
    assert.equal(seed.staff.find((person) => person.id === "stf-kojo")?.roles.includes("relationship_manager"), true);
    const ama = seed.memberships.filter((row) => row.memberId === "mem-ama");
    assert.equal(ama.length, 2);
    assert.equal(new Set(ama.map((row) => row.schemeId)).size, 2);
  });
});
