"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { loadBook, loadSession, writeSession } from "@/lib/storage";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("abena.owusu@upt.com.gh");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    const book = loadBook();
    if (book.staff.some((person) => person.id === session && person.active)) {
      router.replace("/operations");
    }
  }, [router]);

  return (
    <form
      className="mt-6 flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const book = loadBook();
        const person = book.staff.find(
          (item) =>
            item.active && item.email.toLowerCase() === email.trim().toLowerCase(),
        );
        if (!person) {
          setError("That work email is not on the staff list.");
          return;
        }
        writeSession(person.id);
        router.push("/operations");
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-navy">
        Work email
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@upt.com.gh"
          className="h-10 rounded-md border border-line bg-white px-3 text-sm font-normal text-foreground outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
        />
      </label>
      {error ? <p className="text-sm text-[#8A3030]">{error}</p> : null}
      <button
        type="submit"
        className="mt-2 h-10 cursor-pointer rounded-md bg-navy text-sm font-medium text-white hover:bg-navy-deep"
      >
        Continue
      </button>
    </form>
  );
}
