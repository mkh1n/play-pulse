"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './RegisterForm.module.css';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [login, setLogin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register: authRegister } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    setIsLoading(true);

    try {
      const success = await authRegister(login, password, username || login);
      if (success) {
        onSuccess?.();
      } else {
        setError('Ошибка при регистрации. Возможно, логин уже занят.');
      }
    } catch (err) {
      setError('Ошибка при регистрации. Попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2 className={styles.title}>Регистрация</h2>
      
      {error && (
        <div className={styles.error}>{error}</div>
      )}

      <div className={styles.inputGroup}>
        <label htmlFor="register-login" className={styles.label}>
          Логин *
        </label>
        <input
          id="register-login"
          type="text"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          className={styles.input}
          required
          disabled={isLoading}
        />
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="username" className={styles.label}>
          Имя пользователя
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={styles.input}
          placeholder="Необязательно"
          disabled={isLoading}
        />
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="register-password" className={styles.label}>
          Пароль *
        </label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
          required
          disabled={isLoading}
        />
        <p className={styles.hint}>Не менее 6 символов</p>
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="confirm-password" className={styles.label}>
          Подтвердите пароль *
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
          'Зарегистрироваться'
        )}
      </button>

      <div className={styles.footer}>
        <p className={styles.footerText}>
          Уже есть аккаунт? <a href="/auth?tab=login" className={styles.link}>Войти</a>
        </p>
      </div>
    </form>
  );
}