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

import { useAuth } from "@/contexts/AuthContext";

export type GameAction = {
  liked: boolean;

  disliked: boolean;

  in_wishlist: boolean;

  rating: number | null;

  completion_status:
    | "not_played"
    | "playing"
    | "completed"
    | "dropped";

  purchase_status:
    | "owned"
    | "not_owned"
    | "want_to_buy";
};

type ActionsMap = Record<
  number,
  GameAction
>;

interface ContextType {
  actions: ActionsMap;

  setGameAction: (
    gameId: number,
    action: Partial<GameAction>,
  ) => void;

  refreshActions: () => Promise<void>;
}

const defaultGameAction: GameAction =
  {
    liked: false,

    disliked: false,

    in_wishlist: false,

    rating: null,

    completion_status:
      "not_played",

    purchase_status:
      "not_owned",
  };

const GameActionsContext =
  createContext<ContextType | null>(
    null,
  );

export function GameActionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { token, isAuthenticated } =
    useAuth();

  const [actions, setActions] =
    useState<ActionsMap>({});

  const loadedRef =
    useRef(false);

  const loadingRef =
    useRef(false);

  const refreshActions =
    useCallback(async () => {
      if (
        loadingRef.current
      ) {
        return;
      }

      if (
        !isAuthenticated ||
        !token
      ) {
        return;
      }

      loadingRef.current =
        true;

      try {
        const controller =
          new AbortController();

        const timeout =
          setTimeout(
            () =>
              controller.abort(),
            10000, // Увеличили таймаут до 10 секунд
          );

        const response =
          await fetch(
            "/api/preferences/game-actions",
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },

              signal:
                controller.signal,
            },
          );

        clearTimeout(
          timeout,
        );

        if (
          !response.ok
        ) {
          console.error(
            "[GameActions] Failed to fetch actions",
          );

          return;
        }

        const raw =
          await response.json();

        const mapped: ActionsMap =
          {};

        for (const item of raw) {
          const gameId =
            Number(
              item.game_id,
            );

          if (
            !mapped[
              gameId
            ]
          ) {
            mapped[
              gameId
            ] = {
              ...defaultGameAction,
            };
          }

          switch (
            item.action_type
          ) {
            case "like":
              mapped[
                gameId
              ].liked = true;
              break;

            case "dislike":
              mapped[
                gameId
              ].disliked = true;
              break;

            case "wishlist":
              mapped[
                gameId
              ].in_wishlist = true;
              break;

            case "rate":
              mapped[
                gameId
              ].rating =
                item.rating;
              break;

            case "status_change":
              mapped[
                gameId
              ].completion_status =
                item.completion_status || "not_played";
              break;

            case "purchase_change":
              mapped[
                gameId
              ].purchase_status =
                item.purchase_status || "not_owned";
              break;
          }
        }

        setActions(mapped);
      } catch (error: any) {
        // Игнорируем ошибки отмены запроса (AbortError)
        if (error.name === 'AbortError') {
          console.warn("[GameActions] Request was aborted");
          return;
        }
        
        console.error(
          "[GameActions] Error fetching actions:",
          error,
        );
      } finally {
        loadingRef.current =
          false;
      }
    }, [
      token,
      isAuthenticated,
    ]);

  useEffect(() => {
    if (
      loadedRef.current
    ) {
      return;
    }

    if (
      !isAuthenticated ||
      !token
    ) {
      return;
    }

    loadedRef.current =
      true;

    refreshActions();
  }, [
    token,
    isAuthenticated,
    refreshActions,
  ]);

  function setGameAction(
    gameId: number,
    action: Partial<GameAction>,
  ) {
    setActions((prev) => ({
      ...prev,

      [gameId]: {
        ...defaultGameAction,

        ...prev[gameId],

        ...action,
      },
    }));
  }

  return (
    <GameActionsContext.Provider
      value={{
        actions,

        setGameAction,

        refreshActions,
      }}
    >
      {children}
    </GameActionsContext.Provider>
  );
}

export function useGameActions() {
  const context =
    useContext(
      GameActionsContext,
    );

  if (!context) {
    throw new Error(
      "useGameActions must be used inside provider",
    );
  }

  return context;
}