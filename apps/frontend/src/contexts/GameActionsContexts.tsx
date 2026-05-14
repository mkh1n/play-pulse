"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export type GameAction = {
  liked: boolean;
  disliked: boolean;
  in_wishlist: boolean;
  rating: number | null;
  completion_status: "not_played" | "playing" | "completed" | "dropped";
  purchase_status: "owned" | "not_owned" | "want_to_buy";
};

type ActionsMap = Record<number, GameAction>;

interface ContextType {
  actions: ActionsMap;
  setGameAction: (gameId: number, action: Partial<GameAction>) => void;
  isLoading: boolean;
}

const defaultGameAction: GameAction = {
  liked: false,
  disliked: false,
  in_wishlist: false,
  rating: null,
  completion_status: "not_played",
  purchase_status: "not_owned",
};

const GameActionsContext = createContext<ContextType | null>(null);

// Хранилище для обещаний запросов (дедупликация)
const pendingRequests = new Map<string, Promise<any>>();

export function GameActionsProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [actions, setActions] = useState<ActionsMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const initialLoadedRef = useRef(false);
  const lastPathnameRef = useRef<string>("");

  // Загрузка действий с кешированием и дедупликацией
  const loadActions = useCallback(async (forceRefresh: boolean = false) => {
    if (!isAuthenticated || !token) {
      return null;
    }

    // Ключ для кеша в sessionStorage
    const cacheKey = `game_actions_${token}`;
    
    // Проверяем sessionStorage если не forceRefresh
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // Кеш валиднен 5 минут
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            setActions(data);
            initialLoadedRef.current = true;
            return data;
          }
        }
      } catch (e) {
        console.warn("Failed to read from sessionStorage", e);
      }
    }

    // Дедупликация запросов - если такой запрос уже выполняется, возвращаем его Promise
    const requestKey = `fetch_${token}_${forceRefresh}`;
    if (pendingRequests.has(requestKey)) {
      return pendingRequests.get(requestKey);
    }

    // Создаем новый запрос
    const requestPromise = (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 секунд таймаут

        const response = await fetch("/api/preferences/game-actions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
          cache: 'no-store',
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const raw = await response.json();
        const mapped: ActionsMap = {};

        for (const item of raw) {
          const gameId = Number(item.game_id);

          if (!mapped[gameId]) {
            mapped[gameId] = { ...defaultGameAction };
          }

          switch (item.action_type) {
            case "like":
              mapped[gameId].liked = true;
              break;
            case "dislike":
              mapped[gameId].disliked = true;
              break;
            case "wishlist":
              mapped[gameId].in_wishlist = true;
              break;
            case "rate":
              mapped[gameId].rating = item.rating;
              break;
            case "status_change":
              mapped[gameId].completion_status = item.completion_status || "not_played";
              break;
            case "purchase_change":
              mapped[gameId].purchase_status = item.purchase_status || "not_owned";
              break;
          }
        }

        // Сохраняем в sessionStorage
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            data: mapped,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn("Failed to save to sessionStorage", e);
        }

        setActions(mapped);
        initialLoadedRef.current = true;
        return mapped;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn("[GameActions] Request timeout");
        } else {
          console.error("[GameActions] Error fetching actions:", error);
        }
        return null;
      } finally {
        pendingRequests.delete(requestKey);
      }
    })();

    pendingRequests.set(requestKey, requestPromise);
    return requestPromise;
  }, [token, isAuthenticated]);

  // Загружаем действия при монтировании
  useEffect(() => {
    if (isAuthenticated && token && !initialLoadedRef.current) {
      loadActions(false);
    } else if (!isAuthenticated) {
      setActions({});
      initialLoadedRef.current = false;
    }
  }, [isAuthenticated, token, loadActions]);

  // Обновляем при смене маршрута с debounce
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    
    if (pathname !== lastPathnameRef.current) {
      lastPathnameRef.current = pathname;
      
      // Debounce - не обновляем сразу при каждом переходе
      const timeoutId = setTimeout(() => {
        loadActions(true);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [pathname, isAuthenticated, token, loadActions]);

  function setGameAction(gameId: number, action: Partial<GameAction>) {
    setActions((prev) => {
      const newActions = {
        ...prev,
        [gameId]: {
          ...defaultGameAction,
          ...prev[gameId],
          ...action,
        },
      };
      
      // Опционально: сохраняем в sessionStorage при изменении
      if (token) {
        const cacheKey = `game_actions_${token}`;
        try {
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            const { timestamp } = JSON.parse(cached);
            sessionStorage.setItem(cacheKey, JSON.stringify({
              data: newActions,
              timestamp
            }));
          }
        } catch (e) {}
      }
      
      return newActions;
    });
  }

  return (
    <GameActionsContext.Provider
      value={{
        actions,
        setGameAction,
        isLoading,
      }}
    >
      {children}
    </GameActionsContext.Provider>
  );
}

export function useGameActions() {
  const context = useContext(GameActionsContext);
  if (!context) {
    throw new Error("useGameActions must be used inside provider");
  }
  return context;
}