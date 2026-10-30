/**
 * ROUTING · app/components/page.tsx — the URL  /components.
 *
 * Only wiring: "when someone opens /components, show the component library".
 */
import { ComponentsScreen } from "@/components/ComponentsScreen";

export const metadata = { title: "Components · GenUI Runtime Components" };

export default function Page() {
  return <ComponentsScreen />;
}
