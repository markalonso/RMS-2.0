import type { Metadata } from "next";
import { LanguageProvider } from "@/lib/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Restaurant RMS",
  description: "Restaurant Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@200;300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans" style={{ fontFamily: "'Cairo', system-ui, sans-serif" }}>
        <LanguageProvider>
          <div className="min-h-screen flex flex-col">
            <header className="bg-white shadow-sm border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex justify-between items-center">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Restaurant RMS
                  </h1>
                  <LanguageToggle />
                </div>
              </div>
            </header>
            <main className="flex-1">
              {children}
            </main>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
