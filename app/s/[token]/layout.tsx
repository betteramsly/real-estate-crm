import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Подборка — MANTAEV CAPITAL",
  robots: { index: false, follow: false },
};

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="brand-mesh min-h-screen bg-background">
      {children}
    </div>
  );
}