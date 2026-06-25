import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { PublicHeader } from "@/components/shared/PublicHeader";
import "leaflet/dist/leaflet.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Guruba - Book Trusted Purohits & Pandits Online",
  description: "Guruba is your trusted platform for booking experienced Purohits for Pujas, Havans, and ceremonies. Simplify your spiritual journey today.",
  keywords: "Purohit booking, online pandit, hindu priest, puja services, Guruba, havan, rituals",
  openGraph: {
    title: "Guruba - Book Trusted Purohits Online",
    description: "Find and book experienced Purohits for all your religious ceremonies. Trusted, transparent, and easy.",
    url: "https://guruba.com/",
    siteName: "Guruba",
    images: [
      {
        url: "/images/guruba-featured-image.jpg",
        width: 1200,
        height: 630,
      }
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Guruba - Book Trusted Purohits Online",
    description: "Find and book experienced Purohits for all your religious ceremonies.",
    images: ["/images/guruba-featured-image.jpg"],
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased text-stone-900`}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <PublicHeader />
            <main className="flex-grow">
              <div className="animate-in fade-in duration-300">
                {children}
              </div>
            </main>
            <footer className="bg-stone-900 py-8 text-center text-stone-400">
              <p>&copy; {new Date().getFullYear()} Guruba Connect. All rights reserved.</p>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
