// src/app/layout.tsx
"use client";

import styles from "./global.module.css";
import NavigationBlock from "@/components/NavigationBlock/NavigationBlock";
import { AuthProvider } from "@/contexts/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Подключаем IBM Plex Mono из Google Fonts */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <div className={styles.container}>
            <NavigationBlock />
            <div className={styles.contentContainer}>{children}</div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}