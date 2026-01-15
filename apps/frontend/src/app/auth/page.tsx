"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/LoginForm/LoginForm';
import RegisterForm from '@/components/RegisterForm/RegisterForm';

export default function AuthPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'register') setActiveTab('register');
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated) {
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    }
  }, [isAuthenticated, router, searchParams]);

  if (isAuthenticated) return null;

  return (
    <>
      <div>
        <button onClick={() => setActiveTab('login')}>Вход</button>
        <button onClick={() => setActiveTab('register')}>Регистрация</button>
      </div>
      
      {activeTab === 'login' ? (
        <LoginForm onSuccess={() => router.push('/')} />
      ) : (
        <RegisterForm onSuccess={() => router.push('/')} />
      )}
    </>
  );
}