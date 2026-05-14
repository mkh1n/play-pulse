// src/app/ClientLayout.tsx
"use client";

import { useState } from "react";
import styles from "./global.module.css";
import NavigationBlock from "@/components/NavigationBlock/NavigationBlock";
import { AuthProvider } from "@/contexts/AuthContext";
import { GameActionsProvider } from "@/contexts/GameActionsContexts";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  return (
    <AuthProvider>
      <GameActionsProvider>
        <div className={styles.container}>
          <NavigationBlock onCollapseChange={setIsNavCollapsed} />
          <main
            className={`${styles.contentContainer} ${
              isNavCollapsed ? styles.contentContainerCollapsed : ""
            }`}
          >
            {children}
          </main>
        </div>
      </GameActionsProvider>
    </AuthProvider>
  );
}