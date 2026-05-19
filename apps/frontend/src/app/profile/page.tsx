"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";

import AuthGuard from "@/components/AuthGuard/AuthGuard";

import StatsCharts from "@/components/StatsCharts/StatsCharts";

import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSettingsModal from "@/components/profile/ProfileSettingsModal";
import ProfileGamesGrid from "@/components/profile/ProfileGamesGrid";

import styles from "@/components/profile/Profile.module.css";

interface Game {
  id: number;

  name: string;

  slug?: string;

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

  slug?: string;

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
  } = useAuth();

  const [games, setGames] =
    useState<Game[]>([]);

  const [loading, setLoading] =
    useState(true);

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

          if (
            !gamesMap.has(
              gameId,
            )
          ) {
            gamesMap.set(
              gameId,
              {
                id: gameId,

                slug:
                  game.slug ??
                  String(gameId),

                name:
                  game.game_name ??
                  game.name ??
                  "Unknown game",

                background_image:
                  game.game_image ??
                  game.background_image ??
                  game.backgroundImage ??
                  "",

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

          const existingGame =
            gamesMap.get(
              gameId,
            );

          if (!existingGame) {
            continue;
          }

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
                game.user_rating ??
                game.rating ??
                null;
              break;
          }

          if (
            game.completion_status &&
            game.completion_status !==
              "not_played"
          ) {
            existingGame.completion_status =
              game.completion_status;
          }

          if (
            game.purchase_status &&
            game.purchase_status !==
              "not_owned"
          ) {
            existingGame.purchase_status =
              game.purchase_status;
          }

          if (
            game.updated_at &&
            new Date(
              game.updated_at,
            ).getTime() >
              new Date(
                existingGame.updated_at ||
                  "",
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

        setGames(
          normalizedGames,
        );

        const missingMetadataGames =
          normalizedGames.filter(
            (game) =>
              !game.genres
                ?.length &&
              !game.tags
                ?.length,
          );

        if (
          missingMetadataGames.length
        ) {
          Promise.all(
            missingMetadataGames.map(
              async (game) => {
                try {
                  const response =
                    await fetch(
                      `/api/games/${game.id}`,
                    );

                  if (
                    !response.ok
                  ) {
                    return null;
                  }

                  return await response.json();
                } catch {
                  return null;
                }
              },
            ),
          ).then((results) => {
            setGames(
              (prev) =>
                prev.map(
                  (game) => {
                    const metadata =
                      results.find(
                        (
                          item,
                        ) =>
                          item?.id ===
                          game.id,
                      );

                    if (
                      !metadata
                    ) {
                      return game;
                    }

                    return {
                      ...game,

                      genres:
                        metadata.genres ||
                        [],

                      tags:
                        metadata.tags ||
                        [],
                    };
                  },
                ),
            );
          });
        }
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

  const stats = useMemo(() => {
    const genresStats: Record<
      string,
      number
    > = {};

    const tagsStats: Record<
      string,
      number
    > = {};

    const likedGenresStats: Record<
      string,
      number
    > = {};

    const likedTagsStats: Record<
      string,
      number
    > = {};

    const highRatedGenresStats: Record<
      string,
      number
    > = {};

    const highRatedTagsStats: Record<
      string,
      number
    > = {};

    for (const game of games) {
      for (const genre of game.genres || []) {
        if (!genre?.name) {
          continue;
        }

        genresStats[genre.name] =
          (genresStats[
            genre.name
          ] || 0) + 1;
      }

      for (const tag of game.tags || []) {
        if (!tag?.name) {
          continue;
        }

        tagsStats[tag.name] =
          (tagsStats[
            tag.name
          ] || 0) + 1;
      }

      if (game.liked) {
        for (const genre of game.genres || []) {
          if (!genre?.name) {
            continue;
          }

          likedGenresStats[
            genre.name
          ] =
            (likedGenresStats[
              genre.name
            ] || 0) + 1;
        }

        for (const tag of game.tags || []) {
          if (!tag?.name) {
            continue;
          }

          likedTagsStats[
            tag.name
          ] =
            (likedTagsStats[
              tag.name
            ] || 0) + 1;
        }
      }

      if (
        game.user_rating &&
        game.user_rating >= 7
      ) {
        for (const genre of game.genres || []) {
          if (!genre?.name) {
            continue;
          }

          highRatedGenresStats[
            genre.name
          ] =
            (highRatedGenresStats[
              genre.name
            ] || 0) + 1;
        }

        for (const tag of game.tags || []) {
          if (!tag?.name) {
            continue;
          }

          highRatedTagsStats[
            tag.name
          ] =
            (highRatedTagsStats[
              tag.name
            ] || 0) + 1;
        }
      }
    }

    return {
      genresStats,
      tagsStats,

      likedGenresStats,
      likedTagsStats,

      highRatedGenresStats,
      highRatedTagsStats,
    };
  }, [games]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        Загрузка...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthGuard requireAuth />
    );
  }

  return (
    <div className={styles.page}>
      <div
        className={
          styles.backgroundGlow
        }
      />

      <ProfileHeader
        onOpenSettings={() =>
          setIsSettingsOpen(true)
        }
      />

      <StatsCharts
        genresStats={
          stats.genresStats
        }
        tagsStats={
          stats.tagsStats
        }
        likedGenresStats={
          stats.likedGenresStats
        }
        likedTagsStats={
          stats.likedTagsStats
        }
        highRatedGenresStats={
          stats.highRatedGenresStats
        }
        highRatedTagsStats={
          stats.highRatedTagsStats
        }
      />

      {loading ? (
        <div className={styles.center}>
          <div className={styles.text}>
            Загрузка игр...
          </div>
        </div>
      ) : games.length === 0 ? (
        <div className={styles.center}>
          <div className={styles.text}>
            У вас пока нет игр
          </div>
        </div>
      ) : (
        <ProfileGamesGrid
          games={games.map(
            (game) => ({
              ...game,

              isLiked:
                game.liked,

              isDisliked:
                game.disliked,

              inWishlist:
                game.in_wishlist,

              playStatus:
                game.completion_status,

              purchaseStatus:
                game.purchase_status,
            }),
          )}
        />
      )}

      <ProfileSettingsModal
        isOpen={isSettingsOpen}
        onClose={() =>
          setIsSettingsOpen(false)
        }
      />
    </div>
  );
}