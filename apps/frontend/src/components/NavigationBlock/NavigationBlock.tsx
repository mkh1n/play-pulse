"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import styles from "./NavigationBlock.module.css";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Tab {
  id: string;
  label: string;
}

interface Friend {
  id: number;
  name: string;
  avatar: string;
  isOnline: boolean;
}

const NavigationTabs = () => {
  const pathname = usePathname();
  const router = useRouter();

  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);

  const tabs: Tab[] = [
    { id: "/", label: "home" },
    { id: "/explore", label: "explore" },
    { id: "/me", label: "me" },
  ];

  // Фейковый список друзей
  const fakeFriends: Friend[] = [
    { id: 1, name: "Алексей Иванов", avatar: "/avatars/user1.jpg", isOnline: true },
    { id: 2, name: "Мария Петрова", avatar: "/avatars/user2.jpg", isOnline: true },
    { id: 3, name: "Дмитрий Сидоров", avatar: "/avatars/user3.jpg", isOnline: false },
    { id: 4, name: "Екатерина Волкова", avatar: "/avatars/user4.jpg", isOnline: true },
    { id: 5, name: "Иван Козлов", avatar: "/avatars/user5.jpg", isOnline: false },
  ];

  // Функция для определения активной вкладки
  const isTabActive = (tabId: string) => {
    if (tabId === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(tabId);
  };

  // Эффект для отслеживания скролла
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollThreshold = 50;
      const isScrollingDown = currentScrollY > lastScrollY;
      const isNearTop = currentScrollY < 100;

      if (isNearTop) {
        setIsVisible(true);
        setIsAtTop(true);
      } else {
        setIsAtTop(false);
        
        if (Math.abs(currentScrollY - lastScrollY) > scrollThreshold) {
          if (isScrollingDown && isVisible) {
            setIsVisible(false);
          } else if (!isScrollingDown && !isVisible) {
            setIsVisible(true);
          }
          setLastScrollY(currentScrollY);
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY, isVisible]);

  const handleClick = (path: string) => {
    router.push(path);
  };

  return (
    <div 
      className={`${styles.navigationContainer} ${isAtTop ? styles.atTop : ''}`}
    >
      <nav className={styles.headerNav}>
        {/* Верхняя панель с иконками */}
        <div className={styles.topPanel}>
          <button 
            className={styles.iconButton}
            onClick={() => router.push('/settings')}
            aria-label="Настройки"
          >
            <Image
                        src={'/icons/settings.svg'}
                        alt={'Настройки'}
                        className={styles.icon}
                        priority
                        height={24}
                        width={24}
                      />
          </button>
          
          <button 
            className={styles.avatarButton}
            onClick={() => router.push('/profile')}
            aria-label="Профиль"
          >
            <div className={styles.avatarContainer}>
              {/* Замените на ваш компонент Image или img */}
              <div className={styles.avatarPlaceholder}>
                U
              </div>
            </div>
          </button>
        </div>

        {/* Основная навигация */}
        <div className={styles.mainNavigation}>
          {/* Заголовок "Игры" и ссылки */}
          <div className={styles.gamesSection}>
            <h3 className={styles.sectionTitle}>Игры</h3>
            <div className={styles.gameLinks}>
              <button 
                className={styles.gameLink}
                onClick={() => router.push('/library')}
              >
                Библиотека
              </button>
              <button 
                className={styles.gameLink}
                onClick={() => router.push('/swipes')}
              >
                Свайпы
              </button>
              <button 
                className={styles.gameLink}
                onClick={() => router.push('/recommendations')}
              >
                Рекомендации
              </button>
            </div>
          </div>

          {/* Секция друзей */}
          <div className={styles.friendsSection}>
            <h3 className={styles.sectionTitle}>Друзья</h3>
            <div className={styles.friendsList}>
              {fakeFriends.map((friend) => (
                <div key={friend.id} className={styles.friendItem}>
                  <div className={styles.friendAvatarContainer}>
                    <div className={styles.friendAvatarPlaceholder}>
                      {friend.name.charAt(0)}
                    </div>
                    <div className={`${styles.statusIndicator} ${friend.isOnline ? styles.online : styles.offline}`} />
                  </div>
                  <span className={styles.friendName}>{friend.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Навигационные табы */}
          <div className={styles.navTabs}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.navLink} ${
                  isTabActive(tab.id) ? styles.navLinkActive : ""
                }`}
                onClick={() => handleClick(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default NavigationTabs;