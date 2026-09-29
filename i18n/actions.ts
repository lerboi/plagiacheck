"use server"

import { cookies } from "next/headers"
import { isLocale, LOCALE_COOKIE } from "./config"

/** Stores the chosen language for a year. Setting the cookie re-renders the current route. */
export async function setUserLocale(locale: string) {
  if (!isLocale(locale)) return
  ;(await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
}
