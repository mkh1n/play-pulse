// src/components/NavigationBlock/NavigationBlock.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import styles from "./NavigationBlock.module.css";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";


interface NavigationTabsProps {
  onCollapseChange?: (isCollapsed: boolean) => void;
}

const NavigationTabs = ({ onCollapseChange }: NavigationTabsProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();

  const username = user ? user.username : 'user';

  const tabs = [
    { id: "/", label: "Главная", icon: "/icons/home.svg" },
    { id: "/games", label: "Игры", icon: "/icons/game.svg" },
    { id: "/swipes", label: "Свайпы", icon: "/icons/swipe.svg" },
  ];

  const isTabActive = (tabId: string) => {
    if (tabId === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(tabId);
  };

  const toggleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    
    // Уведомляем родительский компонент об изменении
    if (onCollapseChange) {
      onCollapseChange(newCollapsedState);
    }
    
    // Сохраняем состояние в localStorage для сохранения при перезагрузке
    localStorage.setItem('navCollapsed', JSON.stringify(newCollapsedState));
  };

  // Загружаем сохраненное состояние при монтировании
  useEffect(() => {
    const savedState = localStorage.getItem('navCollapsed');
    if (savedState !== null) {
      const collapsed = JSON.parse(savedState);
      setIsCollapsed(collapsed);
      if (onCollapseChange) {
        onCollapseChange(collapsed);
      }
    }
  }, [onCollapseChange]);

  return (
    <div className={`${styles.navigationContainer} ${isCollapsed ? styles.collapsed : ''}`}>
      <nav className={styles.headerNav}>
    


        <button 
          className={styles.profileSection}
          onClick={() => router.push('/profile')}
        >
          <div className={styles.avatarContainer}>
            <div className={styles.avatarPlaceholder}>
              {username.charAt(0).toUpperCase()}
            </div>
          </div>
          {!isCollapsed && (
            <span className={styles.username}>{username}</span>
          )}
        </button>

        <div className={styles.mainNavigation}>
          <div className={styles.navTabs}>
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.id}
                className={`${styles.navLink} ${
                  isTabActive(tab.id) ? styles.navLinkActive : ""
                }`}
              >
                {tab.icon && (
                  <Image
                    src={tab.icon}
                    alt={tab.label}
                    className={styles.navIcon}
                    height={24}
                    width={24}
                  />
                )}
                {!isCollapsed && <span className={styles.navLabel}>{tab.label}</span>}
              </Link>
            ))}
          </div>
        </div>

            <button 
          className={styles.collapseButton}
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Развернуть" : "Свернуть"}
        >
          <div className={styles.collapseIcon}>
            {isCollapsed ? '⇀' : '↽ Свернуть'}
          </div>
        </button>
      </nav>
    </div>
  );
};

export default NavigationTabs;