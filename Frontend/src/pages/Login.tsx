import { useState } from "react";
import type React from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import PageMeta from "@/components/common/PageMeta";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const { user, isLoading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const destination = (location.state as { from?: string } | null)?.from ?? "/";

  if (isLoading) return null;
  if (user) return <Navigate to={destination} replace />;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await signIn(identifier, password);
      navigate(destination, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageMeta title="Sign in | Yatzar Operations" description="Sign in to Yatzar Operations" />
      <main className="flex min-h-screen bg-white dark:bg-gray-950">
        <section className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <img src="/images/logo/yatzar-logo.png" alt="Yatzar Operations" className="size-10 object-contain" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">Yatzar Operations</span>
            </div>
            <h1 className="text-title-md font-bold text-gray-900 dark:text-white">Welcome back</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Sign in with your Yatzar Operations account.</p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Username or email
                <input required value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-gray-300 px-4 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/5 dark:text-white" autoComplete="username" />
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
                <div className="relative mt-2">
                  <input required type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-lg border border-gray-300 px-4 pe-16 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/5 dark:text-white" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-e-0 top-0 h-full px-4 text-xs text-gray-500">{showPassword ? "Hide" : "Show"}</button>
                </div>
              </label>
              {error && <p role="alert" className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">{error}</p>}
              <button disabled={isSubmitting} className="h-12 w-full rounded-lg bg-brand-500 px-4 font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Signing in..." : "Sign in"}</button>
            </form>
          </div>
        </section>
        <section className="relative hidden items-center justify-center overflow-hidden bg-brand-950 lg:flex lg:w-1/2">
          <div className="relative z-10 text-center text-white">
            <img src="/images/logo/yatzar-logo.png" alt="Yatzar Operations" className="mx-auto size-20 object-contain" />
            <h2 className="mt-6 text-4xl font-bold">Yatzar Operations</h2>
            <p className="mt-3 text-brand-200">Manage your people and operations in one place.</p>
          </div>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.25) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
        </section>
      </main>
    </>
  );
}
