"use client";

import { useEffect, useMemo, useState } from "react";

import Image from "next/image";

import { useAuth } from "@/contexts/AuthContext";

import AuthGuard from "@/components/AuthGuard/AuthGuard";
import StatsCharts from "@/components/StatsCharts/StatsCharts";
import GameActions from "@/components/GameActions/GameActions";

import { proxifyImage } from "@/services/gameService";

import styles from "@/components/profile/Profile.module.css";

interface Game {
  id: number;

  name: string;

  background_image?: string;

  rating: number;

  metacritic: number | null;

  liked?: boolean;
  disliked?: boolean;
  in_wishlist?: boolean;

  user_rating?: number | null;

  completion_status?:
    | "not_played"
    | "playing"
    | "completed"
    | "dropped";

  purchase_status?:
    | "owned"
    | "not_owned"
    | "want_to_buy";

  actions_count?: number;

  updated_at?: string;

  genres?: {
    id: number;
    name: string;
  }[];

  tags?: {
    id: number;
    name: string;
  }[];
}

interface ApiResponse {
  success: boolean;
  games: Game[];
}

export default function ProfilePage() {
  const {
    user,
    isAuthenticated,
    isLoading,
    logout,
  } = useAuth();

  const [games, setGames] =
    useState<Game[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [sort, setSort] =
    useState("recent");

  useEffect(() => {
    if (
      isAuthenticated &&
      user
    ) {
      loadGames();
    }
  }, [
    isAuthenticated,
    user,
  ]);

 async function loadGames() {
  try {
    setLoading(true);

    const response =
      await fetch(
        "/api/users/me/games",
        {
          credentials:
            "include",

          cache:
            "no-store",
        },
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`,
      );
    }

    const data: ApiResponse =
      await response.json();

    if (
      data.success &&
      Array.isArray(
        data.games,
      )
    ) {
      setGames(
        data.games,
      );
    } else {
      setGames([]);
    }
  } catch (error) {
    console.error(
      "Profile games error:",
      error,
    );

    setGames([]);
  } finally {
    setLoading(false);
  }
}

  const sortedGames =
    useMemo(() => {
      const arr = [
        ...games,
      ];

      switch (
        sort
      ) {
        case "rating":
          return arr.sort(
            (
              a,
              b,
            ) =>
              (b.user_rating ||
                0) -
              (a.user_rating ||
                0),
          );

        case "name":
          return arr.sort(
            (
              a,
              b,
            ) =>
              a.name.localeCompare(
                b.name,
              ),
          );

        case "metacritic":
          return arr.sort(
            (
              a,
              b,
            ) =>
              (b.metacritic ||
                0) -
              (a.metacritic ||
                0),
          );

        default:
          return arr.sort(
            (
              a,
              b,
            ) =>
              new Date(
                b.updated_at ||
                  "",
              ).getTime() -
              new Date(
                a.updated_at ||
                  "",
              ).getTime(),
          );
      }
    }, [
      games,
      sort,
    ]);

  if (isLoading) {
    return (
      <div
        className={
          styles.loading
        }
      >
        Загрузка...
      </div>
    );
  }

  if (
    !isAuthenticated
  ) {
    return (
      <AuthGuard
        requireAuth
      />
    );
  }

  return (
    <div
      className={
        styles.container
      }
    >
      <div
        className={
          styles.profileHeader
        }
      >
        <div
          className={
            styles.userBlock
          }
        >
          <div
            className={
              styles.avatar
            }
          >
            {user?.username?.[0]}
          </div>

          <div>
            <h1
              className={
                styles.username
              }
            >
              {
                user?.username
              }
            </h1>

            <p
              className={
                styles.login
              }
            >
              @
              {
                user?.login
              }
            </p>
          </div>
        </div>

        <div
          className={
            styles.headerButtons
          }
        >
          <button
            className={
              styles.logoutButton
            }
            onClick={
              logout
            }
          >
            Выйти
          </button>
        </div>
      </div>

      <div
        className={
          styles.toolbar
        }
      >
        <select
          value={sort}
          onChange={(e) =>
            setSort(
              e.target.value,
            )
          }
          className={
            styles.sortSelect
          }
        >
          <option value="recent">
            Сначала новые
          </option>

          <option value="rating">
            По рейтингу
          </option>

          <option value="name">
            По названию
          </option>

          <option value="metacritic">
            Metacritic
          </option>
        </select>
      </div>

      <div
        className={
          styles.gamesContainer
        }
      >
        {loading ? (
          <div
            className={
              styles.loading
            }
          >
            Загрузка...
          </div>
        ) : sortedGames.length ===
          0 ? (
          <div
            className={
              styles.empty
            }
          >
            Игр пока нет
          </div>
        ) : (
          sortedGames.map(
            (
              game,
            ) => (
              <div
                key={
                  game.id
                }
                className={
                  styles.gameCard
                }
              >
                <div
                  className={
                    styles.gameImage
                  }
                >
                  {game.background_image ? (
                    <Image
                      src={proxifyImage(
                        game.background_image,
                      )}
                      alt={
                        game.name
                      }
                      fill
                      className={
                        styles.image
                      }
                    />
                  ) : (
                    <div
                      className={
                        styles.placeholder
                      }
                    >
                      🎮
                    </div>
                  )}
                </div>

                <div
                  className={
                    styles.gameContent
                  }
                >
                  <div
                    className={
                      styles.topRow
                    }
                  >
                    <h3
                      className={
                        styles.gameName
                      }
                    >
                      {
                        game.name
                      }
                    </h3>

                    {game.user_rating && (
                      <div
                        className={
                          styles.ratingBadge
                        }
                      >
                        ⭐{" "}
                        {
                          game.user_rating
                        }
                      </div>
                    )}
                  </div>

                  <div
                    className={
                      styles.badges
                    }
                  >
                    {game.liked && (
                      <span>
                        👍 Лайк
                      </span>
                    )}

                    {game.disliked && (
                      <span>
                        👎
                        Дизлайк
                      </span>
                    )}

                    {game.in_wishlist && (
                      <span>
                        ❤️
                        Wishlist
                      </span>
                    )}

                    {game.completion_status !==
                      "not_played" && (
                      <span>
                        {
                          game.completion_status
                        }
                      </span>
                    )}

                    {game.purchase_status !==
                      "not_owned" && (
                      <span>
                        {
                          game.purchase_status
                        }
                      </span>
                    )}
                  </div>

                 <GameActions
  compact
  gameId={
    game.id
  }
  gameName={
    game.name
  }
/>
                </div>
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
}