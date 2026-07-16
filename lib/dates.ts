import { cookies } from "next/headers";

export const DEV_DATE_COOKIE = "zephyriov-dev-date";

/** Today as yyyy-mm-dd in the given IANA timezone. */
export function todayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "UTC",
  }).format(new Date());
}

/**
 * Today for SRS purposes. In development a `zephyriov-dev-date` cookie
 * (yyyy-mm-dd) overrides the real date so multi-day behavior can be tested
 * without waiting. Set it from the browser console:
 *   document.cookie = "zephyriov-dev-date=2026-07-15; path=/"
 */
export async function getToday(timezone: string): Promise<string> {
  if (process.env.NODE_ENV === "development") {
    const cookieStore = await cookies();
    const override = cookieStore.get(DEV_DATE_COOKIE)?.value;
    if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) {
      return override;
    }
  }
  return todayInTimezone(timezone);
}
