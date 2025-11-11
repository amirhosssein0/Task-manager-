import "./globals.css";
import Navigation from "./components/Navigation";
import { ThemeProvider } from "./components/ThemeProvider";

export const metadata = {
  title: "Task Manager",
  description: "A Django + Next.js To-Do App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
        {/* Set theme class ASAP before hydration to avoid flicker and ensure global persistence */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var theme = saved || (prefersDark ? 'dark' : 'light');
                  document.documentElement.classList.remove('light','dark');
                  document.documentElement.classList.add(theme);
                } catch (e) {}
              })();
            `,
          }}
        />
        <ThemeProvider>
          <Navigation />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}