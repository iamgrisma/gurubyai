import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { PublicHeader } from "@/components/shared/PublicHeader";
import "leaflet/dist/leaflet.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: 'swap' });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: 'swap' });

export const viewport: Viewport = {
  themeColor: '#eab308', // Saffron color
}

export const metadata: Metadata = {
  manifest: "/manifest.json",
  title: {
    template: "%s | Guruba",
    default: "Guruba - Book Trusted Purohits & Pandits Online",
  },
  description: "Guruba is your trusted premium platform for booking experienced Purohits for Pujas, Havans, and sacred ceremonies.",
  keywords: ["Purohit booking", "online pandit", "hindu priest", "puja services", "Guruba", "havan", "rituals"],
  openGraph: {
    title: "Guruba - Premium Purohit Booking",
    description: "Find and book experienced Purohits for all your religious ceremonies. Trusted, transparent, and easy.",
    url: "https://guruba.com/",
    siteName: "Guruba",
    images: [
      {
        url: "/images/guruba-featured-image.jpg",
        width: 1200,
        height: 630,
        alt: "Guruba Connect Platform",
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
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans antialiased text-stone-900 bg-stone-50 min-h-screen flex flex-col selection:bg-saffron-500 selection:text-white">
        <Providers>
          <PublicHeader />
          <main className="flex-grow flex flex-col relative z-0">
            <div className="animate-in fade-in duration-500 ease-out flex-grow flex flex-col">
              {children}
            </div>
          </main>
          <footer className="bg-stone-950 py-12 text-center text-stone-400 mt-auto border-t border-stone-800">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-gradient-to-br from-saffron-500 to-orange-600 flex items-center justify-center text-white font-bold">G</div>
                <span className="font-outfit font-bold text-xl text-white tracking-tight">Guruba</span>
              </div>
              <p className="text-sm">&copy; {new Date().getFullYear()} Guruba Connect. All rights reserved.</p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
