"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './LoginForm.module.css';

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login: authLogin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await authLogin(login, password);
      if (success) {
        onSuccess?.();
      } else {
        setError('Неверный логин или пароль');
      }
    } catch (err) {
      setError('Ошибка при входе. Попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2 className={styles.title}>Вход в аккаунт</h2>
      
      {error && (
        <div className={styles.error}>{error}</div>
      )}

      <div className={styles.inputGroup}>
        <label htmlFor="login" className={styles.label}>
          Логин
        </label>
        <input
          id="login"
          type="text"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          className={styles.input}
          required
          disabled={isLoading}
        />
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="password" className={styles.label}>
          Пароль
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
          required
          disabled={isLoading}
        />
      </div>

      <button 
        type="submit" 
        className={styles.submitButton}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className={styles.loader}></span>
        ) : (
          'Войти'
        )}
      </button>

      <div className={styles.footer}>
        <p className={styles.footerText}>
          Нет аккаунта? <a href="/auth?tab=register" className={styles.link}>Зарегистрироваться</a>
        </p>
      </div>
    </form>
  );
}