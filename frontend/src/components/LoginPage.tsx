import React, { useState } from "react";
import { KeyRound, Mail, ShieldAlert, ArrowRight } from "lucide-react";
import { User } from "../types";
import mitconLogo from "../assets/logo.png";

interface LoginPageProps {
  onSuccess: (user: User, token: string) => void;
  mfaDefaultSetting: boolean;
}

export default function LoginPage({ onSuccess, mfaDefaultSetting }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mustChangeUser, setMustChangeUser] = useState<User | null>(null);
  const [pendingToken, setPendingToken] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changeError, setChangeError] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your organizational email address and password.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to match user records.");
      }

      if (data.user.mustChangePassword) {
        setMustChangeUser(data.user);
        setPendingToken(data.token);
        return;
      }

      onSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || "Network Error accessing MITCON Credentia Node.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError("");

    if (!newPassword || newPassword.length < 8) {
      setChangeError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError("New password and confirm password do not match.");
      return;
    }

    setIsChanging(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Send the pending JWT so the backend knows who is changing the password
          "Authorization": `Bearer ${pendingToken}`
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to set new password.");

      setMustChangeUser(null);
      // Use the fresh token returned by the server after password change
      onSuccess(data.user, data.token || pendingToken);
    } catch (err: any) {
      setChangeError(err.message || "Failed to change password.");
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.08),transparent_50%)] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative">
        <div className="flex justify-center items-center">
          <img src={mitconLogo} className="h-16 w-auto" alt="Mitcon Credentia Logo" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-display font-bold tracking-tight text-white">
          Secure Core Repository
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Module Tracker
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative">
        <div className="bg-slate-800/80 backdrop-blur-md py-8 px-4 shadow-xl border border-slate-700/50 rounded-2xl sm:px-10">
          
          {error && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleInitialSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Organizational Work Email
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@mitconindia.com"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Account Passcode
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 transition-all cursor-pointer font-display shadow-lg shadow-amber-500/10"
              >
                {loading ? "Decrypting Session..." : "Authorize Access"}
                {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* FIRST LOGIN MANDATORY PASSWORD CHANGE MODAL */}
      {mustChangeUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-md w-full p-6 text-white animate-scaleIn">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-white">First Login Password Setup</h3>
                <p className="text-xs text-slate-400">Welcome {mustChangeUser.name}! Please set your permanent account password.</p>
              </div>
            </div>

            {changeError && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{changeError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  New Permanent Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters, include letters & numbers"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password..."
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isChanging}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-slate-950 font-bold rounded-xl text-xs font-display shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50"
                >
                  {isChanging ? "Updating Password..." : "Save Password & Proceed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
