import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { closeMembership, postPayment, type ActionResult } from "./actions.ts";
import { membershipPosition } from "./pension.ts";
import { createSeed } from "./seed.ts";

function must(result: ActionResult) {
  if ("error" in result) throw new Error(result.error);
  return result.book;
}

describe("posting a receipt", () => {
  it("posts one receipt to one membership and refuses a second post", () => {
    const book = createSeed();
    const finance = book.staff.find((person) => person.id === "stf-efua");
    const lead = book.staff.find((person) => person.id === "stf-abena");
    assert.ok(finance && lead);
    const otherUnits = membershipPosition(book, "memship-nana-prv").units;
    const denied = postPayment(book, lead, "pay-88421", "memship-mem-ama");
    assert.equal("error" in denied, true);

    const posted = must(postPayment(book, finance, "pay-88421", "memship-mem-ama"));
    assert.equal(posted.payments.some((payment) => payment.id === "pay-88421"), false);
    const row = posted.contributions.find((item) => item.paymentId === "pay-88421");
    assert.equal(row?.membershipId, "memship-mem-ama");
    assert.equal(posted.audit[0]?.schemeId, "sch-mop");
    assert.equal(membershipPosition(posted, "memship-nana-prv").units, otherUnits);

    const again = postPayment(posted, finance, "pay-88421", "memship-mem-ama");
    assert.equal("error" in again, true);
    assert.equal(posted.contributions.filter((item) => item.paymentId === "pay-88421").length, 1);
  });

  it("does not post a receipt to a closed membership", () => {
    const book = createSeed();
    const finance = book.staff.find((person) => person.id === "stf-efua");
    const lead = book.staff.find((person) => person.id === "stf-abena");
    assert.ok(finance && lead);
    const closed = must(closeMembership(book, lead, "memship-mem-ama"));
    const result = postPayment(closed, finance, "pay-88421", "memship-mem-ama");
    assert.equal("error" in result, true);
    if ("error" in result) {
      assert.match(result.error, /closed/);
    }
  });
});
