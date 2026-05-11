export const SERVICE_WORKER_PATH = "/service-worker.js";

type ServiceWorkerRegistrationTarget = {
  register: (scriptUrl: string) => Promise<unknown>;
};

export type PwaRegistrationEnvironment = {
  addEventListener: (type: "load", listener: () => void) => void;
  hostname: string;
  isProductionBuild: boolean;
  protocol: string;
  serviceWorker?: ServiceWorkerRegistrationTarget;
  warn?: (message: string, error: unknown) => void;
};

export function shouldRegisterServiceWorker(
  environment: Pick<
    PwaRegistrationEnvironment,
    "hostname" | "isProductionBuild" | "protocol" | "serviceWorker"
  >
): boolean {
  const isLocalHost =
    environment.hostname === "localhost" ||
    environment.hostname === "127.0.0.1" ||
    environment.hostname === "[::1]";

  return Boolean(
    environment.isProductionBuild &&
      environment.serviceWorker &&
      (environment.protocol === "https:" || isLocalHost)
  );
}

function getDefaultPwaRegistrationEnvironment():
  | PwaRegistrationEnvironment
  | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return null;
  }

  return {
    addEventListener: window.addEventListener.bind(window),
    hostname: window.location.hostname,
    isProductionBuild: import.meta.env.PROD,
    protocol: window.location.protocol,
    serviceWorker: navigator.serviceWorker,
    warn: console.warn.bind(console)
  };
}

export function registerServiceWorker(
  environment = getDefaultPwaRegistrationEnvironment()
): void {
  if (!environment || !shouldRegisterServiceWorker(environment)) {
    return;
  }

  environment.addEventListener("load", () => {
    void environment.serviceWorker?.register(SERVICE_WORKER_PATH).catch(
      (error: unknown) => {
        environment.warn?.("Service worker registration failed", error);
      }
    );
  });
}
