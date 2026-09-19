import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "FlowCare — Your digital activity, in context", description: "A calmer perspective on your digital day. Personal activity insights powered by RescueTime." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
