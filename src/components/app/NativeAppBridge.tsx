import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function toAppPath(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    const path = url.pathname.startsWith("/") ? url.pathname : `/${url.pathname}`;
    const search = url.search || "";
    const hash = url.hash || "";

    if (url.protocol === "http:" || url.protocol === "https:") {
      if (!path || path === "/") {
        return "/";
      }

      return `${path}${search}${hash}`;
    }

    const hostSegment = url.hostname && url.hostname !== "localhost" ? `/${url.hostname}` : "";
    const pathSegment = path === "/" ? "" : path;
    const appPath = `${hostSegment}${pathSegment}` || "/";

    return `${appPath}${search}${hash}`;
  } catch {
    return null;
  }
}

const NativeAppBridge = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let removeListener: (() => void) | undefined;

    const attach = async () => {
      try {
        const [{ App }, { Capacitor }] = await Promise.all([
          import("@capacitor/app"),
          import("@capacitor/core"),
        ]);

        if (!Capacitor.isNativePlatform()) {
          return;
        }

        const listener = await App.addListener("appUrlOpen", (event) => {
          const nextPath = toAppPath(event.url);
          if (nextPath) {
            navigate(nextPath, { replace: true });
          }
        });

        removeListener = () => {
          listener.remove();
        };
      } catch {
        // Native shell dependencies may be absent in the browser/dev environment.
      }
    };

    void attach();

    return () => {
      removeListener?.();
    };
  }, [navigate]);

  return null;
};

export default NativeAppBridge;
