import { Logo } from "@/components/brand/logo";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata = {
  title: "Staff sign in",
};

export default function SignInPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <Logo width={220} priority />
        </div>
        <section className="rounded-2xl border border-line bg-card px-8 py-8">
          <h1 className="text-xl font-medium tracking-tight text-navy">
            Staff sign in
          </h1>
          <p className="mt-1 text-sm text-muted">
            United Pension Trustees operations hub.
          </p>
          <SignInForm />
        </section>
      </div>
    </main>
  );
}
