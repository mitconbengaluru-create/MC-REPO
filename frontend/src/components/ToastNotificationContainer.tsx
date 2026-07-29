import React, { useEffect } from "react";
import { CheckCircle2, Clock, X, ArrowRight, FileCheck, ShieldAlert, Bell } from "lucide-react";
import { Notification } from "../types";

export interface ToastItem extends Notification {
  toastId: string;
}

interface ToastNotificationContainerProps {
  toasts: ToastItem[];
  onDismiss: (toastId: string) => void;
  onNavigateToReports?: () => void;
}

// Subtle audio chime sound player using Web Audio API
export function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5 note

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // ignore user interaction audio context restrictions
  }
}

export default function ToastNotificationContainer({
  toasts,
  onDismiss,
  onNavigateToReports
}: ToastNotificationContainerProps) {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none select-none">
      {toasts.map((toast) => (
        <ToastCard
          key={toast.toastId}
          toast={toast}
          onDismiss={() => onDismiss(toast.toastId)}
          onNavigateToReports={onNavigateToReports}
        />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
  onNavigateToReports
}: {
  toast: ToastItem;
  onDismiss: () => void;
  onNavigateToReports?: () => void;
}) {
  useEffect(() => {
    // Play subtle audio alert chime
    playNotificationChime();

    // Trigger Native Browser Desktop Notification Pop-up
    if ("Notification" in window && window.Notification.permission === "granted") {
      try {
        new window.Notification(toast.title, {
          body: toast.message,
          icon: "/logo.png"
        });
      } catch (err) {
        console.warn("Desktop notification trigger failed:", err);
      }
    }

    const timer = setTimeout(() => {
      onDismiss();
    }, 7000);
    return () => clearTimeout(timer);
  }, [toast.toastId]);

  const getIcon = () => {
    const title = (toast.title || "").toLowerCase();
    const message = (toast.message || "").toLowerCase();
    if (title.includes("return") || title.includes("check in") || message.includes("returned")) {
      return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
    }
    if (title.includes("checkout") || title.includes("out") || message.includes("checked out")) {
      return <Clock className="w-5 h-5 text-amber-400 shrink-0" />;
    }
    if (title.includes("alert") || title.includes("delete") || title.includes("revoked")) {
      return <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />;
    }
    return <FileCheck className="w-5 h-5 text-sky-400 shrink-0" />;
  };

  return (
    <div className="pointer-events-auto bg-slate-950/95 backdrop-blur-md border-2 border-slate-700/90 shadow-2xl rounded-2xl p-4 text-white animate-scaleIn flex items-start gap-3 transition-all hover:border-amber-500/50">
      <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/60 shrink-0">
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex justify-between items-center pr-1">
          <h4 className="text-xs font-bold text-slate-100 font-display truncate flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block shrink-0" />
            {toast.title}
          </h4>
          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider shrink-0 ml-1">
            Just Now
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-snug font-sans">
          {toast.message}
        </p>

        {onNavigateToReports && (
          <button
            onClick={() => {
              onDismiss();
              onNavigateToReports();
            }}
            className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer pt-1"
          >
            <span>View Compliance Log</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
