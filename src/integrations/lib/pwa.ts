/**
 * Service worker registration wrapper.
 * This is the ONLY place the app-shell service worker (/sw.js) may be
 * registered. Registration is refused — and any stale app SW unregistered —
 * in dev, in iframes, and on Lovable preview hosts.
 */

const SW_URL = "/sw.js";

function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return true;
  if (!("serviceWorker" in navigator)) return true;

  try {
    if (window.self !== window.top) return true; // inside an iframe
  } catch {
    return true;
  }

  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;

  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;

  return false;
}

async function unregisterAppServiceWorkers(): Promise<void> {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((reg) => {
          const scriptUrl =
            reg.active?.scriptURL ?? reg.waiting?.scriptURL ?? reg.installing?.scriptURL ?? "";
          return scriptUrl.endsWith(SW_URL);
        })
        .map((reg) => reg.unregister()),
    );
  } catch {
    // best-effort cleanup
  }
}

export async function registerAppServiceWorker(): Promise<void> {
  if (isRefusedContext()) {
    await unregisterAppServiceWorkers();
    return;
  }

  try {
    await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch (err) {
    console.warn("Service worker registration failed:", err);
  }
}
