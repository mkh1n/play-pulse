"use client";

import { useState } from 'react';
import LoginForm from '@/components/LoginForm/LoginForm';
import RegisterForm from '@/components/RegisterForm/RegisterForm';
import styles from './AuthPopup.module.css';

interface AuthPopupProps {
  onClose: () => void;
  overlay: boolean;
}

export default function AuthPopup({ onClose, overlay=true }: AuthPopupProps) {
  const [isLogin, setIsLogin] = useState(true);

  return (

    <div className={overlay ? styles.overlay : ''} onClick={onClose}>
      <div className={styles.popup}>
        
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${isLogin ? styles.activeTab : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Вход
          </button>
          <button 
            className={`${styles.tab} ${!isLogin ? styles.activeTab : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Регистрация
          </button>
        </div>

        <div className={styles.content}>
          {isLogin ? (
            <LoginForm 
              onSuccess={() => {
                onClose();
                window.location.reload();
              }}
            />
          ) : (
            <RegisterForm 
              onSuccess={() => {
                onClose();
                window.location.reload();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}