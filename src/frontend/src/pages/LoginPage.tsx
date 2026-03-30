import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Eye, EyeOff, Settings } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";

export default function LoginPage() {
  const { login, navigate } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const success = login(username, password);
    setIsLoading(false);
    if (success) {
      toast.success("Login successful. Welcome back!");
      navigate("dashboard");
    } else {
      setError("Invalid username or password. Please try again.");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: "url('/assets/generated/login-bg.dim_1440x900.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/75" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(11,18,32,0.9) 0%, rgba(15,23,42,0.85) 100%)",
        }}
      />

      {/* Decorative corner accents */}
      <div
        className="absolute top-0 left-0 w-48 h-48 opacity-10"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.70 0.188 55), transparent)",
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-48 h-48 opacity-10"
        style={{
          background:
            "linear-gradient(315deg, oklch(0.50 0.065 232), transparent)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background: "oklch(0.70 0.188 55 / 0.15)",
              border: "1px solid oklch(0.70 0.188 55 / 0.4)",
            }}
          >
            <Settings
              className="w-8 h-8 animate-spin"
              style={{ color: "oklch(0.80 0.180 55)", animationDuration: "8s" }}
            />
          </div>
          <h1
            className="text-3xl font-bold tracking-tight leading-tight"
            style={{
              fontFamily: "BricolageGrotesque, sans-serif",
              color: "oklch(0.96 0.004 260)",
            }}
          >
            <span style={{ color: "oklch(0.80 0.180 55)" }}>
              Plant Maintenance
            </span>
            <br />
            <span>Management System</span>
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "oklch(0.68 0.010 260)" }}
          >
            Plant Maintenance Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="industrial-card p-8">
          <h2
            className="text-lg font-semibold mb-6"
            style={{ color: "oklch(0.96 0.004 260)" }}
          >
            Sign In to Continue
          </h2>

          <form
            onSubmit={handleLogin}
            className="space-y-4"
            data-ocid="login.modal"
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="username"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                Username
              </Label>
              <Input
                id="username"
                data-ocid="login.input"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="h-11 text-base"
                style={{
                  background: "oklch(0.20 0.022 252)",
                  borderColor: "oklch(0.34 0.030 252)",
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                style={{ color: "oklch(0.68 0.010 260)" }}
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  data-ocid="login.input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-11 text-base pr-10"
                  style={{
                    background: "oklch(0.20 0.022 252)",
                    borderColor: "oklch(0.34 0.030 252)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "oklch(0.68 0.010 260)" }}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                data-ocid="login.error_state"
                className="flex items-center gap-2 p-3 rounded-md"
                style={{
                  background: "oklch(0.63 0.22 27 / 0.15)",
                  border: "1px solid oklch(0.63 0.22 27 / 0.4)",
                  color: "oklch(0.80 0.18 27)",
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <Button
              data-ocid="login.submit_button"
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={isLoading}
              style={{
                background: "oklch(0.70 0.188 55)",
                color: "oklch(0.10 0.010 55)",
              }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                "LOGIN"
              )}
            </Button>
          </form>
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: "oklch(0.50 0.010 260)" }}
        >
          © {new Date().getFullYear()} Plant Maintenance Management System.
          Built with{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "oklch(0.70 0.188 55)" }}
          >
            caffeine.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}
