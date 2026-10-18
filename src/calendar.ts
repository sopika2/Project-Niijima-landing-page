// In-game style date block: big date, weekday tag, time of day, weather.

import type { SiteConfig } from "./config";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function timeOfDay(hour: number): string {
  if (hour < 5) return "Late Night";
  if (hour < 8) return "Early Morning";
  if (hour < 12) return "Morning";
  if (hour < 15) return "Daytime";
  if (hour < 18) return "After School";
  if (hour < 22) return "Evening";
  return "Late Night";
}

function weatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Sunny";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 85 && code <= 86) return "Snow";
  if (code >= 95) return "Storm";
  return "Cloudy";
}

function parts(tz: string) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
  const weekdayIndex = DAYS.findIndex((d) => d === p.weekday);
  return {
    month: p.month,
    day: p.day,
    weekday: weekdayIndex >= 0 ? DAYS[weekdayIndex] : p.weekday,
    weekdayIndex,
    hour: Number(p.hour),
  };
}

export function createCalendar(cfg: SiteConfig["calendar"]): HTMLElement {
  const el = document.createElement("div");
  el.className = "calendar";
  el.innerHTML = `
    <div class="calendar__date"><span class="calendar__md"></span><span class="calendar__dow"></span></div>
    <div class="calendar__row">
      <span class="calendar__tod"></span>
      <span class="calendar__wx" hidden></span>
    </div>`;

  const render = () => {
    const p = parts(cfg.timezone);
    el.querySelector(".calendar__md")!.textContent = `${p.month}/${p.day}`;
    const dow = el.querySelector<HTMLElement>(".calendar__dow")!;
    dow.textContent = p.weekday;
    dow.classList.toggle("is-weekend", p.weekdayIndex === 0 || p.weekdayIndex === 6);
    el.querySelector(".calendar__tod")!.textContent = timeOfDay(p.hour);
  };
  render();
  setInterval(render, 60_000);

  if (cfg.weather) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${cfg.latitude}&longitude=${cfg.longitude}&current=weather_code,temperature_2m&timezone=auto`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const code = d?.current?.weather_code;
        if (typeof code !== "number") return;
        const wx = el.querySelector<HTMLElement>(".calendar__wx")!;
        const temp = d.current.temperature_2m;
        wx.textContent = `${weatherLabel(code)}${typeof temp === "number" ? ` · ${Math.round(temp)}°` : ""}`;
        wx.hidden = false;
      })
      .catch(() => {});
  }

  return el;
}
