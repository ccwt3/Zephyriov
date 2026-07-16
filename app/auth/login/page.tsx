import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl text-primary [text-shadow:2px_2px_0_hsl(var(--ink)/0.25)]">
            ♞ Zephyriov
          </h1>
          <p className="label-vintage mt-1 text-xs text-muted-foreground">
            ★ Chess opening trainer ★
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
