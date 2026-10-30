import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

const vazirmatn = localFont({
  src: "./fonts/Vazirmatn[wght].woff2",
  weight: "100 900",
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "دکترها | پلتفرم سلامت و نوبت‌دهی آنلاین",
  description:
    "پلتفرم جامع سلامت «دکترها»؛ رزرو نوبت حضوری و آنلاین، مشاوره تلفنی و متنی، آزمایشگاه و پشتیبانی — نسخه نمایشی فرانت‌اند",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className={`${vazirmatn.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-center" dir="rtl" closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
