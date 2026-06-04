"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createOrRepairAdmin } from "@/lib/auth-actions";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const [email, setEmail] = useState("md@richagroup.co");
  const [password, setPassword] = useState("");
  const [magicEmail, setMagicEmail] = useState("md@richagroup.co");
  const [message, setMessage] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const created = params.get("created");

    if (error) {
      setMessage(error);
    } else if (created) {
      setMessage("Admin login is ready. Please sign in with the password you just set.");
    }
  }, []);

  async function signInWithPassword() {
    setIsPasswordLoading(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setIsPasswordLoading(false);

    if (error) {
      setMessage(
        error.message.toLowerCase().includes("invalid")
          ? "Email or password is incorrect. Use First admin setup below if this is your first login."
          : error.message
      );
      return;
    }

    window.location.href = "/dashboard";
  }

  async function signInWithEmail() {
    setIsMagicLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });
    setIsMagicLoading(false);

    if (error) {
      setMessage(
        error.message.toLowerCase().includes("rate")
          ? "Email rate limit hit. Please use password login, or wait before requesting another magic link."
          : error.message
      );
      return;
    }

    setMessage("Check your email for the sign-in link.");
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-background p-4"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background:
          "radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 30rem), linear-gradient(135deg, #f8fbff 0%, #eef6ff 42%, #f7f4ff 100%)"
      }}
    >
      <section
        className="w-full max-w-lg rounded-md border bg-white/95 p-6 shadow-xl shadow-blue-950/10"
        style={{
          width: "100%",
          maxWidth: 520,
          border: "1px solid #d5dfec",
          borderRadius: 8,
          background: "rgba(255,255,255,0.96)",
          padding: 24,
          boxShadow: "0 24px 60px rgba(30, 64, 175, 0.14)",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        }}
      >
        <div
          className="mb-5 overflow-hidden rounded-md border bg-white p-2"
          style={{ marginBottom: 20, overflow: "hidden", border: "1px solid #d5dfec", borderRadius: 8, background: "#fff", padding: 8 }}
        >
          <Image
            src="/brand/richa-group-logo.jpeg"
            alt="Richa Group"
            width={420}
            height={180}
            className="h-auto w-full"
            style={{ display: "block", width: "100%", height: "auto" }}
            priority
          />
        </div>
        <h1 className="text-2xl font-semibold" style={{ margin: 0, color: "#172554", fontSize: 28, fontWeight: 700 }}>
          Sign in to Ram Setu ERP
        </h1>
        <p className="mt-2 text-sm text-muted-foreground" style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>
          Use password login for reliable access. Magic link is available only as a backup.
        </p>
        <div className="mt-6 space-y-3" style={{ marginTop: 24, display: "grid", gap: 12 }}>
          <label className="block text-sm font-medium" htmlFor="email" style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#172554" }}>
            Work email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="you@company.com"
            style={{
              height: 42,
              width: "100%",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              background: "#f8fbff",
              padding: "0 12px",
              fontSize: 14,
              boxSizing: "border-box",
              outline: "none"
            }}
          />
          <label className="block text-sm font-medium" htmlFor="password" style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#172554" }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Enter your password"
            style={{
              height: 42,
              width: "100%",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              background: "#f8fbff",
              padding: "0 12px",
              fontSize: 14,
              boxSizing: "border-box",
              outline: "none"
            }}
          />
          <button
            disabled={!email || !password || isPasswordLoading}
            onClick={signInWithPassword}
            style={{
              height: 44,
              width: "100%",
              border: 0,
              borderRadius: 6,
              background: !email || !password || isPasswordLoading ? "#93a4bd" : "linear-gradient(135deg, #2563eb, #0ea5e9)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: !email || !password || isPasswordLoading ? "not-allowed" : "pointer"
            }}
          >
            {isPasswordLoading ? "Signing in" : "Sign in"}
          </button>
          {message ? (
            <p className="text-sm text-muted-foreground" style={{ margin: 0, color: "#475569", fontSize: 14, lineHeight: 1.5 }}>
              {message}
            </p>
          ) : null}
        </div>
        <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
          <button
            type="button"
            onClick={() => setShowSetup((current) => !current)}
            style={{
              minHeight: 40,
              width: "100%",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              background: "#fff",
              color: "#1e40af",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {showSetup ? "Hide first admin setup" : "First admin setup / repair login"}
          </button>

          {showSetup ? (
            <form action={createOrRepairAdmin} style={{ display: "grid", gap: 10, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
                Use this once to create or repair the Richa admin user with a password and starter ERP data.
              </p>
              <label htmlFor="setup-email" style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#172554" }}>
                Admin email
              </label>
              <input
                id="setup-email"
                name="email"
                type="email"
                defaultValue="md@richagroup.co"
                required
                style={{
                  height: 40,
                  width: "100%",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  background: "#f8fbff",
                  padding: "0 12px",
                  fontSize: 14,
                  boxSizing: "border-box"
                }}
              />
              <label htmlFor="setup-password" style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#172554" }}>
                New password
              </label>
              <input
                id="setup-password"
                name="password"
                type="password"
                minLength={8}
                required
                placeholder="Minimum 8 characters"
                style={{
                  height: 40,
                  width: "100%",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  background: "#f8fbff",
                  padding: "0 12px",
                  fontSize: 14,
                  boxSizing: "border-box"
                }}
              />
              <label htmlFor="setup-code" style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#172554" }}>
                Setup code
              </label>
              <input
                id="setup-code"
                name="setup_code"
                type="password"
                required
                placeholder="Private setup code"
                style={{
                  height: 40,
                  width: "100%",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  background: "#f8fbff",
                  padding: "0 12px",
                  fontSize: 14,
                  boxSizing: "border-box"
                }}
              />
              <button
                type="submit"
                style={{
                  minHeight: 42,
                  width: "100%",
                  border: 0,
                  borderRadius: 6,
                  background: "#172554",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Create / repair admin login
              </button>
            </form>
          ) : null}

          <details style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
            <summary style={{ cursor: "pointer", color: "#1e40af", fontSize: 14, fontWeight: 700 }}>
              Magic link fallback
            </summary>
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <input
                type="email"
                value={magicEmail}
                onChange={(event) => setMagicEmail(event.target.value)}
                placeholder="you@company.com"
                style={{
                  height: 40,
                  width: "100%",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  background: "#f8fbff",
                  padding: "0 12px",
                  fontSize: 14,
                  boxSizing: "border-box"
                }}
              />
              <button
                type="button"
                disabled={!magicEmail || isMagicLoading}
                onClick={signInWithEmail}
                style={{
                  minHeight: 40,
                  width: "100%",
                  border: "1px solid #bfdbfe",
                  borderRadius: 6,
                  background: !magicEmail || isMagicLoading ? "#e2e8f0" : "#eff6ff",
                  color: !magicEmail || isMagicLoading ? "#64748b" : "#1d4ed8",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: !magicEmail || isMagicLoading ? "not-allowed" : "pointer"
                }}
              >
                {isMagicLoading ? "Sending link" : "Send magic link"}
              </button>
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}
