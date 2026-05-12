"use client";

import styles from "./Profile.module.css";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  onOpenSettings: () => void;
}

export default function ProfileHeader({
  onOpenSettings,
}: Props) {
  const { user } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.avatar}>
          {user?.username?.[0]?.toUpperCase()}
        </div>

        <div>
          <h1 className={styles.username}>
            {user?.username}
          </h1>

          <p className={styles.login}>
            @{user?.login}
          </p>
        </div>
      </div>

      <button
        className={styles.settingsButton}
        onClick={onOpenSettings}
      >
        ⚙️ Настройки
      </button>
    </header>
  );
}