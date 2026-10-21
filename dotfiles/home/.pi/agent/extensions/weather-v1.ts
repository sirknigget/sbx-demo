import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const execFileAsync = promisify(execFile);
const KEY = "openmeteo-weather-v1";
const REFRESH_MS = 15 * 60 * 1000;
const DEFAULT_LOCATION = "40.748,-73.985"; // New York; override with WEGO_LOCATION or /weather lat,lon

function coordinates(value: string): string | undefined {
  const parts = value.trim().split(",");
  if (parts.length !== 2 || parts.some((part) => !/^[+-]?\d+(?:\.\d+)?$/.test(part.trim()))) return;
  const [lat, lon] = parts.map(Number);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
  return `${lat},${lon}`;
}

function condition(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: "☀", label: "Clear sky" };
  if (code >= 1 && code <= 3) return { icon: "☁", label: code === 1 ? "Mostly clear" : "Cloudy" };
  if (code === 45 || code === 48) return { icon: "≋", label: "Foggy" };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: "☂", label: "Drizzle" };
  if ([61, 63, 65, 66, 67].includes(code)) return { icon: "☂", label: "Rain" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: "❄", label: "Snow" };
  if ([80, 81, 82].includes(code)) return { icon: "☂", label: "Showers" };
  if ([95, 96, 99].includes(code)) return { icon: "⚡", label: "Thunderstorm" };
  return { icon: "◌", label: "Current" };
}

export default function (pi: ExtensionAPI) {
  let location = coordinates(process.env.WEGO_LOCATION ?? "") ?? DEFAULT_LOCATION;
  let weather: { temp: number; feels?: number; code: number } | undefined;
  let status: "loading" | "ready" | "error" = "loading";
  let timer: ReturnType<typeof setInterval> | undefined;
  let generation = 0;
  let render: (() => void) | undefined;

  async function refresh() {
    const current = ++generation;
    const requestedLocation = location;
    try {
      const { stdout } = await execFileAsync("wego", [
        "-backend", "openmeteo", "-frontend", "json", "-jsn-no-indent",
        "-days", "1", "-location", requestedLocation, "-cache-ttl", "10m",
      ], { timeout: 15000, maxBuffer: 1024 * 1024 });
      const data = JSON.parse(stdout);
      const temp = data?.Current?.TempC;
      const code = data?.Current?.Code;
      if (typeof temp !== "number" || typeof code !== "number") throw new Error("invalid weather response");
      if (current === generation) {
        weather = { temp, code, feels: typeof data.Current.FeelsLikeC === "number" ? data.Current.FeelsLikeC : undefined };
        status = "ready";
        render?.();
      }
    } catch {
      if (current === generation) {
        status = "error";
        render?.();
      }
    }
  }

  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;
    ctx.ui.setWidget(KEY, (tui, theme) => {
      render = () => tui.requestRender();
      return {
        invalidate() {},
        render(width: number) {
          if (width < 24) return [];
          const cardWidth = Math.min(62, width - 2);
          const contentWidth = cardWidth - 3;
          const indent = " ".repeat(width - cardWidth);
          const line = (content: string) => {
            const clipped = truncateToWidth(content, contentWidth);
            return indent + theme.fg("accent", "┃") + "  " + clipped + " ".repeat(Math.max(0, contentWidth - visibleWidth(clipped)));
          };
          const details = status === "loading"
            ? theme.fg("muted", "◌  Fetching the forecast…")
            : status === "error"
              ? theme.fg("warning", "⚠  Weather unavailable") + theme.fg("dim", "  ·  /weather to retry")
              : (() => {
                  const { icon, label } = condition(weather!.code);
                  const feels = weather!.feels === undefined ? "" : theme.fg("dim", `  ·  Feels ${Math.round(weather!.feels)}°C`);
                  return theme.fg("accent", `${icon}  `) + theme.fg("text", theme.bold(`${Math.round(weather!.temp)}°C`)) + theme.fg("muted", `  ${label}`) + feels;
                })();
          if (width < 48) return [line(details)];
          const title = theme.fg("accent", theme.bold("WEATHER"));
          const place = theme.fg("dim", location.replace(",", ", "));
          const gap = Math.max(2, contentWidth - visibleWidth(title) - visibleWidth(place));
          return [line(title + " ".repeat(gap) + place), line(details)];
        },
        dispose() { render = undefined; },
      };
    }, { placement: "aboveEditor" });
    void refresh();
    timer = setInterval(() => { void refresh(); }, REFRESH_MS);
    timer.unref?.();
  });

  pi.on("session_shutdown", (_event, ctx) => {
    if (timer) clearInterval(timer);
    timer = undefined;
    generation++;
    render = undefined;
    if (ctx.mode === "tui") ctx.ui.setWidget(KEY, undefined);
  });

  pi.registerCommand("weather", {
    description: "Refresh weather or set location: /weather 40.748,-73.985",
    handler: async (args, ctx) => {
      if (args.trim()) {
        const next = coordinates(args);
        if (!next) {
          ctx.ui.notify("Use /weather latitude,longitude (e.g. /weather 40.748,-73.985)", "error");
          return;
        }
        location = next;
      }
      if (ctx.mode === "tui") {
        status = "loading";
        weather = undefined;
        render?.();
        await refresh();
      } else {
        ctx.ui.notify("Weather widget requires interactive Pi", "info");
      }
    },
  });
}
