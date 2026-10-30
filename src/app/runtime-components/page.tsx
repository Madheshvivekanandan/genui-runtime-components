/**
 * ROUTING · app/runtime-components/page.tsx — the URL  /runtime-components.
 *
 * Only wiring: "when someone opens /runtime-components, show the runtime flow explainer".
 */
import { RuntimeFlow } from "@/components/runtime/RuntimeFlow";

export const metadata = { title: "Runtime components · GenUI Runtime Components" };

export default function Page() {
  return <RuntimeFlow />;
}
