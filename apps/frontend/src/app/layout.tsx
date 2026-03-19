// src/app/layout.tsx
"use client";

import { useState } from "react";
import styles from "./global.module.css";
import NavigationBlock from "@/components/NavigationBlock/NavigationBlock";
import { AuthProvider } from "@/contexts/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&family=Roboto:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <div className={styles.container}>
            <NavigationBlock onCollapseChange={setIsNavCollapsed} />
            <main
              className={`${styles.contentContainer} ${isNavCollapsed ? styles.contentContainerCollapsed : ''
                }`}
            >
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}