"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("abena.owusu@upt.com.gh");
  const [password, setPassword] = useState("");

  return (
    <form
      className="mt-6 flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        router.push("/operations");
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-navy">
        Work email
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-10 rounded-md border border-line bg-white px-3 text-sm font-normal text-foreground outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-navy">
        Password
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-10 rounded-md border border-line bg-white px-3 text-sm font-normal text-foreground outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
        />
      </label>
      <button
        type="submit"
        className="mt-2 h-10 cursor-pointer rounded-md bg-navy text-sm font-medium text-white hover:bg-navy-deep"
      >
        Continue
      </button>
    </form>
  );
}
