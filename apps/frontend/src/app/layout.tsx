"use client";

import { IBM_Plex_Mono } from "next/font/google";
import styles from "./global.module.css";
import NavigationBlock from "@/components/NavigationBlock/NavigationBlock";

const IBMPlexMono = IBM_Plex_Mono({
  weight: "400",
});
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={IBMPlexMono.className}>
      <body>
        <div className={styles.container}>
          <NavigationBlock></NavigationBlock>
          <div className={styles.contentContainer}>{children}</div>
        </div>
      </body>
    </html>
  );
}
