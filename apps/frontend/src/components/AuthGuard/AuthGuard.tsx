"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AuthPopup from '@/components/AuthPopup/AuthPopup';

interface AuthGuardProps {
  children?: React.ReactNode;
  requireAuth?: boolean;
  showPopup?: boolean;
  onClose?: () => void;
}

export default function AuthGuard({ 
  children, 
  requireAuth = true,
  showPopup = false,
  onClose 
}: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated && !showPopup) {
      const currentPath = window.location.pathname + window.location.search;
      router.push(`/auth?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [isLoading, isAuthenticated, requireAuth, showPopup, router]);

  // Показываем лоадер при загрузке
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Если требуется авторизация и пользователь не авторизован
  if (requireAuth && !isAuthenticated) {
    // Показываем попап авторизации, если это указано
    if (showPopup && onClose) {
      return <AuthPopup onClose={onClose} />;
    }
    
    // Если showPopup без onClose
    if (showPopup) {
      return (
        <div className="p-4 text-center">
          <p className="text-red-400">Для выполнения этого действия требуется авторизация</p>
        </div>
      );
    }
    
    // Возвращаем null, так как редирект уже выполнится в useEffect
    return null;
  }

  // Возвращаем детей, если авторизация не требуется или пользователь авторизован
  return <>{children}</>;
}