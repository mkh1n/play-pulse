"use client";

import { useEffect, useMemo, useState } from "react";

import Image from "next/image";

import { useAuth } from "@/contexts/AuthContext";

import AuthGuard from "@/components/AuthGuard/AuthGuard";
import StatsCharts from "@/components/StatsCharts/StatsCharts";
import GameActions from "@/components/GameActions/GameActions";

import Link from "next/link";

import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSettingsModal from "@/components/profile/ProfileSettingsModal";
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
interface RawGame {
  id?: number;
  game_id?: number;

  name?: string;
  game_name?: string;

  background_image?: string;
  backgroundImage?: string;
  game_image?: string;

  rating?: number;

  metacritic?: number | null;

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

  action_type?:
    | "like"
    | "dislike"
    | "wishlist"
    | "rate";

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
  games: RawGame[];
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
  const [
    isSettingsOpen,
    setIsSettingsOpen,
  ] = useState(false);

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

      const response = await fetch(
        "/api/users/me/games",
        {
          credentials: "include",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`,
        );
      }

      const data: ApiResponse =
        await response.json();

      console.log(
        "[PROFILE RAW DATA]",
        data,
      );

      if (
        data.success &&
        Array.isArray(
          data.games,
        )
      ) {
       const gamesMap =
  new Map<number, Game>();

for (const game of data.games) {
  const gameId =
    game.game_id ??
    game.id;

  // =========================
  // CREATE GAME
  // =========================

  if (
    !gamesMap.has(
      gameId,
    )
  ) {
    gamesMap.set(
      gameId,
      {
        id: gameId,

        name:
          game.game_name ??
          game.name ??
          "Unknown game",

        background_image:
          game.game_image ??
          game.background_image ??
          game.backgroundImage ??
          null,

        rating:
          game.rating ?? 0,

        metacritic:
          game.metacritic ??
          null,

        liked: false,
        disliked: false,
        in_wishlist: false,

        user_rating:
          null,

        completion_status:
          "not_played",

        purchase_status:
          "not_owned",

        updated_at:
          game.updated_at,

        genres:
          game.genres ??
          [],

        tags:
          game.tags ?? [],
      },
    );
  }

  // =========================
  // MERGE ACTIONS
  // =========================

  const existingGame =
    gamesMap.get(
      gameId,
    );

  switch (
    game.action_type
  ) {
    case "like":
      existingGame.liked =
        true;
      break;

    case "dislike":
      existingGame.disliked =
        true;
      break;

    case "wishlist":
      existingGame.in_wishlist =
        true;
      break;

    case "rate":
      existingGame.user_rating =
        game.rating;
      break;
  }

  // =========================
  // STATUS
  // =========================

  if (
    game.completion_status &&
    game.completion_status !==
      "not_played"
  ) {
    existingGame.completion_status =
      game.completion_status;
  }

  // =========================
  // PURCHASE
  // =========================

  if (
    game.purchase_status &&
    game.purchase_status !==
      "not_owned"
  ) {
    existingGame.purchase_status =
      game.purchase_status;
  }

  // =========================
  // UPDATED AT
  // =========================

  if (
    new Date(
      game.updated_at,
    ).getTime() >
    new Date(
      existingGame.updated_at,
    ).getTime()
  ) {
    existingGame.updated_at =
      game.updated_at;
  }
}

const normalizedGames =
  Array.from(
    gamesMap.values(),
  );

        console.log(
          "[PROFILE NORMALIZED]",
          normalizedGames,
        );

        setGames(
          normalizedGames,
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
  console.log(games)
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
      <ProfileHeader
        onOpenSettings={() =>
          setIsSettingsOpen(true)
        }
      />
      

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
        ) : sortedGames.map(
          (game) => (
            <div
              key={game.id}
              className={
                styles.gameCard
              }
            >
              <Link
                href={`/games/${game.id}`}
                className={
                  styles.cardLink
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
                      alt={game.name}
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
                      {game.name}
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
                        👎 Дизлайк
                      </span>
                    )}

                    {game.in_wishlist && (
                      <span>
                        ❤️ Wishlist
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
                </div>
              </Link>

              <div
                onClick={(e) =>
                  e.stopPropagation()
                }
              >
                <GameActions
                  compact
                  gameId={game.id}
                  gameName={
                    game.name
                  }
                  gameImage={
                    game.background_image
                  }
                />
              </div>
            </div>
          ),
        )}
      </div>
      <ProfileSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}