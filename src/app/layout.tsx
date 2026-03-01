import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Global Economy Simulation",
  description: "A real-time multiplayer educational simulation of global economic inequality",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-950 text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
