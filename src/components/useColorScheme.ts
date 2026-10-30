/**
 * FRONTEND · components/useColorScheme.ts — is the system in light or dark mode?
 *
 * Sample previews (on /components and /runtime-components) follow it, so a
 * dark screen doesn't show a bright white sample in the middle.
 * The assistant's own answers keep the mode the AI chose.
 */
import { useSyncExternalStore } from "react";

const QUERY = "(prefers-color-scheme: dark)";

export function useColorScheme(): "light" | "dark" {
  return useSyncExternalStore(
    (notify) => {
      const media = window.matchMedia(QUERY);
      media.addEventListener("change", notify);
      return () => media.removeEventListener("change", notify);
    },
    () => (window.matchMedia(QUERY).matches ? "dark" : "light"),
    () => "light", // on the server there is no system setting
  );
}
