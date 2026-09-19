/**
 * Device-level alerts: uses the browser/OS notification centre (with the
 * system notification sound) plus a short in-app chime so an alert is never
 * silent while the tab is focused.
 */

const STORAGE_KEY = "device-alerts-enabled";

export type PermissionState = "unsupported" | "blocked-in-preview" | "default" | "granted" | "denied";

export function deviceAlertsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function inIframe(): boolean {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

export function permissionState(): PermissionState {
  if (!deviceAlertsSupported()) return "unsupported";
  const p = Notification.permission;
  if (p === "default" && inIframe()) return "blocked-in-preview";
  return p as PermissionState;
}

export function deviceAlertsEnabled(): boolean {
  if (!deviceAlertsSupported() || Notification.permission !== "granted") return false;
  return localStorage.getItem(STORAGE_KEY) !== "off";
}

export function setDeviceAlertsEnabled(on: boolean) {
  localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
}

/** Must be called from a click handler — browsers ignore silent requests. */
export async function requestDeviceAlerts(): Promise<PermissionState> {
  if (!deviceAlertsSupported()) return "unsupported";
  if (Notification.permission === "granted") {
    setDeviceAlertsEnabled(true);
    return "granted";
  }
  if (Notification.permission === "denied") return "denied";
  if (inIframe()) return "blocked-in-preview";
  const result = await Notification.requestPermission();
  if (result === "granted") setDeviceAlertsEnabled(true);
  return result as PermissionState;
}

/** Short two-tone chime, similar to a social-app ping. */
export function playAlertChime() {
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;
    [
      { f: 880, t: 0 },
      { f: 1320, t: 0.12 },
    ].forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.25, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.3);
    });
    setTimeout(() => ctx.close().catch(() => undefined), 900);
  } catch {
    /* audio is best-effort */
  }
}

export interface DeviceAlert {
  title: string;
  body: string;
  tag?: string;
  /** Path opened when the alert is clicked. */
  url?: string;
  /** Urgent alerts keep the banner on screen until dismissed. */
  urgent?: boolean;
}

export function showDeviceAlert({ title, body, tag, url, urgent }: DeviceAlert) {
  playAlertChime();
  if (!deviceAlertsEnabled()) return;
  try {
    const n = new Notification(title, {
      body,
      tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      requireInteraction: !!urgent,
    });
    n.onclick = () => {
      window.focus();
      if (url) window.location.assign(url);
      n.close();
    };
  } catch {
    /* notification centre unavailable */
  }
}
