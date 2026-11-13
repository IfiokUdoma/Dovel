import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dovel — Stories beyond imagination",
  description: "Discover and watch original AI-generated films and micro-dramas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
