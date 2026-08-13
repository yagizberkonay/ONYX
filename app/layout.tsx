import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Onyx",
  description: "A local-first, Git-native API client for modern developers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
