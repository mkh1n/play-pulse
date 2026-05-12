"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
  useParams,
} from "next/navigation";

import Image from "next/image";
import Link from "next/link";

import {
  GameDetails,
  getGameById,
  getDealsWithAverage,
  proxifyImage,
} from "@/services/gameService";

import GameActions from "@/components/GameActions/GameActions";
import StarRating from "@/components/StarRating/StarRaing";
import GamesGrid from "@/components/GamesGrid/GamesGrid";
import ScreenshotGallery from "@/components/ScreenshotGallery/ScreenshotGallery";

import styles from "../GameDetailPage.module.css";

import { scrollToSectionWithOffset } from "@/services/scrollService";

export default function GameDetailPage() {
  // ============================================================================
  // ROUTER
  // ============================================================================

  const router = useRouter();

  const params = useParams();

  const id = params?.id as string;

  // ============================================================================
  // STATE
  // ============================================================================

  const [game, setGame] =
    useState<GameDetails | null>(
      null,
    );

  const [
    similarGames,
    setSimilarGames,
  ] = useState<any[]>([]);

  const [deals, setDeals] =
    useState<any[]>([]);

  const [
    averagePrice,
    setAveragePrice,
  ] = useState<number | null>(
    null,
  );

  const [loading, setLoading] =
    useState(true);

  const [
    similarLoading,
    setSimilarLoading,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [sortOrder, setSortOrder] =
    useState<"price" | "rating">(
      "rating",
    );

  const [showAll, setShowAll] =
    useState(false);

  const [activeNav, setActiveNav] =
    useState("screenshots");

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const navItems = [
    {
      id: "screenshots",
      label: "Скриншоты",
    },

    {
      id: "description",
      label: "Описание",
    },

    {
      id: "deals",
      label: "Предложения",
    },

    {
      id: "similar",
      label: "Похожие игры",
    },
  ];

  // ============================================================================
  // DEALS SORTING
  // ============================================================================

  const sortedDeals = useMemo(() => {
    if (
      !Array.isArray(deals)
    ) {
      return [];
    }

    const validDeals =
      deals.filter(
        (deal) =>
          deal.price_rur != null &&
          deal.seller_rating != null,
      );

    const sorted = [
      ...validDeals,
    ].sort((a, b) => {
      if (
        sortOrder === "price"
      ) {
        return (
          a.price_rur -
          b.price_rur
        );
      }

      return (
        b.seller_rating -
        a.seller_rating
      );
    });

    return sorted.slice(
      0,
      showAll ? 16 : 4,
    );
  }, [
    deals,
    sortOrder,
    showAll,
  ]);

  // ============================================================================
  // LOAD DATA
  // ============================================================================

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    const controller =
      new AbortController();

    const numericId =
      Number(id);

    const loadPage =
      async () => {
        try {
          setLoading(true);

          setError(null);

          setSimilarGames([]);

          // ============================================================
          // GAME
          // ============================================================

          const gameData =
            await getGameById(
              numericId,
            );
            console.log(gameData)
          if (
            cancelled ||
            !gameData
          ) {
            return;
          }

          setGame(gameData);

          // ============================================================
          // DEALS
          // ============================================================

          try {
            const dealsResponse =
              await getDealsWithAverage(
                gameData.name,
              );

            if (
              !cancelled
            ) {
              setDeals(
                dealsResponse?.items ||
                  [],
              );

              setAveragePrice(
                dealsResponse?.averagePrice ??
                  null,
              );
            }
          } catch (err) {
            console.error(
              "Deals error:",
              err,
            );
          }

          // ============================================================
          // MAIN CONTENT READY
          // ============================================================

          if (
            !cancelled
          ) {
            setLoading(false);
          }

          // ============================================================
          // SIMILAR GAMES
          // ============================================================

          try {
            setSimilarLoading(
              true,
            );

            const timeout =
              setTimeout(() => {
                controller.abort();
              }, 6000);

            const response =
              await fetch(
                `/api/recommendations/similar/${numericId}?limit=8`,
                {
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
              throw new Error(
                `HTTP ${response.status}`,
              );
            }

            const data =
              await response.json();

            if (
              cancelled
            ) {
              return;
            }
            console.log(data)
            const parsedGames =
              Array.isArray(
                data,
              )
                ? data
                : Array.isArray(
                    data?.games,
                  )
                ? data.games
                : [];

            setSimilarGames(
              parsedGames,
            );
          } catch (err) {
            console.error(
              "Similar games error:",
              err,
            );

            if (
              !cancelled
            ) {
              setSimilarGames(
                [],
              );
            }
          } finally {
            if (
              !cancelled
            ) {
              setSimilarLoading(
                false,
              );
            }
          }
        } catch (err: any) {
          console.error(
            "Page load error:",
            err,
          );

          if (
            !cancelled
          ) {
            setError(
              err?.message ||
                "Ошибка загрузки игры",
            );

            setLoading(
              false,
            );
          }
        }
      };

    loadPage();

    return () => {
      cancelled = true;

      controller.abort();
    };
  }, [id]);

  // ============================================================================
  // TITLE
  // ============================================================================

  useEffect(() => {
    if (game?.name) {
      document.title = `PlayPulse | ${game.name}`;
    }
  }, [game]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const formatDate = (
    dateString: string,
  ) => {
    try {
      return new Date(
        dateString,
      ).toLocaleDateString(
        "ru-RU",
        {
          year: "numeric",
        },
      );
    } catch {
      return dateString;
    }
  };

  // ============================================================================
  // LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button
            onClick={() =>
              router.back()
            }
            className={
              styles.backButton
            }
          >
            <img
              src="../icons/arrow.svg"
              className={
                styles.backButtonArrow
              }
            />
            Назад
          </button>
        </div>

        <div
          className={
            styles.heroSkeleton
          }
        >
          <div
            className={
              styles.heroImageSkeleton
            }
          />

          <div
            className={
              styles.titleSkeleton
            }
          />

          <div
            className={
              styles.heroContentSkeleton
            }
          >
            <div
              className={
                styles.metaSkeleton
              }
            />
          </div>
        </div>

        <div
          className={
            styles.contentSkeleton
          }
        >
          <div
            className={
              styles.sidebarSkeleton
            }
          >
            <div
              className={
                styles.statSkeleton
              }
            />

            <div
              className={
                styles.statSkeleton
              }
            />

            <div
              className={
                styles.statSkeleton
              }
            />

            <div
              className={
                styles.actionsSkeleton
              }
            />
          </div>

          <div
            className={
              styles.detailsSkeleton
            }
          >
            <div
              className={
                styles.sectionSkeleton
              }
            />

            <div
              className={
                styles.sectionSkeleton
              }
            />
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // ERROR
  // ============================================================================

  if (error) {
    return (
      <div className={styles.container}>
        <div
          className={
            styles.errorState
          }
        >
          <h2>
            Что-то пошло не так
          </h2>

          <p>{error}</p>

          <button
            onClick={() =>
              window.location.reload()
            }
            className={
              styles.retryButton
            }
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // NO GAME
  // ============================================================================

  if (!game) {
    return (
      <div className={styles.container}>
        <div
          className={
            styles.errorState
          }
        >
          <div
            className={
              styles.errorIcon
            }
          />

          <h2>
            Игра не найдена
          </h2>

          <p>
            К сожалению,
            мы не смогли
            найти
            информацию об
            этой игре.
          </p>

          <Link
            href="/games"
            className={
              styles.exploreButton
            }
          >
            Перейти к поиску
            игр
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <title>
        {`PlayPulse | ${game.name}`}
      </title>

      <div className={styles.container}>
        <header
          className={
            styles.header
          }
        >
          <div
            className={
              styles.headerContent
            }
          >
            <button
              onClick={() =>
                router.back()
              }
              className={
                styles.backButton
              }
            >
              <img
                src="../icons/arrow.svg"
                className={
                  styles.backButtonArrow
                }
              />

              Назад
            </button>
          </div>
        </header>

        {game.background_image && (
          <section
            className={
              styles.hero
            }
          >
            <div
              className={
                styles.heroBackground
              }
            >
              <Image
                src={proxifyImage(
                  game.background_image,
                )}
                alt={game.name}
                fill
                className={
                  styles.heroImage
                }
                priority
                sizes="100vw"
              />

              <div
                className={
                  styles.heroGradient
                }
              />

              <div
                className={
                  styles.heroBlur
                }
              />
            </div>

            <div
              className={
                styles.heroContent
              }
            >
              <div
                className={
                  styles.heroMain
                }
              >
                <div
                  className={
                    styles.heroText
                  }
                >
                  <h1
                    className={
                      styles.gameTitle
                    }
                  >
                    {game.name}
                  </h1>

                  <div
                    className={
                      styles.gameMeta
                    }
                  >
                    {game.released && (
                      <span
                        className={
                          styles.metaItem
                        }
                        id={
                          styles.releasedTag
                        }
                      >
                        {formatDate(
                          game.released,
                        )}
                      </span>
                    )}

                    {game.developers?.[0] && (
                      <span
                        className={
                          styles.metaItem
                        }
                        id={
                          styles.developerTag
                        }
                      >
                        {
                          game
                            .developers[0]
                            .name
                        }
                      </span>
                    )}

                    {game.genres?.[0] && (
                      <span
                        className={
                          styles.metaItem
                        }
                        id={
                          styles.genreTag
                        }
                      >
                        {
                          game
                            .genres[0]
                            .name
                        }
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={
                  styles.heroActions
                }
              >
                <div
                  className={
                    styles.heroActionsLeft
                  }
                >
                  {averagePrice !==
                    null && (
                    <button
                      className={
                        styles.priceButton
                      }
                      onClick={() =>
                        scrollToSectionWithOffset(
                          "deals",
                        )
                      }
                    >
                      <span
                        className={
                          styles.priceLabel
                        }
                      >
                        Средняя
                        цена
                      </span>

                      <span
                        className={
                          styles.priceValue
                        }
                      >
                        {averagePrice
                          .toLocaleString(
                            "ru-RU",
                          )
                          .split(
                            ",",
                          )[0]}{" "}
                        ₽
                      </span>

                      <img
                        src="../icons/arrow.svg"
                        className={
                          styles.priceArrow
                        }
                      />
                    </button>
                  )}
                </div>

                <div
                  className={
                    styles.ratingBadges
                  }
                >
                  <div
                    className={
                      styles.externalLinks
                    }
                  >
                    {[
                      {
                        href:
                          game.website,
                        label:
                          "Сайт",
                        icon:
                          "../icons/site.svg",
                      },

                      {
                        href:
                          game.reddit_url,
                        label:
                          "Reddit",
                        icon:
                          "../icons/reddit.svg",
                      },

                      {
                        href:
                          game.metacritic_url,
                        label:
                          "Metacritic",
                        icon:
                          "../icons/m.svg",
                      },
                    ]
                      .filter(
                        (l) =>
                          l.href,
                      )
                      .map(
                        (
                          link,
                          i,
                        ) => (
                          <a
                            key={i}
                            href={
                              link.href
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className={
                              styles.externalLink
                            }
                          >
                            <img
                              src={
                                link.icon
                              }
                              className={
                                styles.externalLinkIcon
                              }
                            />
                          </a>
                        ),
                      )}
                  </div>

                  {game.rating && (
                    <div
                      className={
                        styles.ratingBadge
                      }
                    >
                      <span
                        className={
                          styles.ratingValue
                        }
                      >
                        {game.rating.toFixed(
                          1,
                        )}
                      </span>

                      <span
                        className={
                          styles.ratingLabel
                        }
                      >
                        RAWG
                      </span>
                    </div>
                  )}

                  {game.metacritic && (
                    <a
                      href={
                        game.metacritic_url
                      }
                      className={`${styles.ratingBadge} ${styles.metacritic}`}
                    >
                      <span
                        className={
                          styles.ratingValue
                        }
                      >
                        {
                          game.metacritic
                        }
                      </span>

                      <span
                        className={
                          styles.ratingLabel
                        }
                      >
                        MC
                      </span>
                    </a>
                  )}
                </div>
              </div>

              <nav
                className={
                  styles.sectionNav
                }
              >
                {navItems.map(
                  (item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveNav(
                          item.id,
                        );

                        scrollToSectionWithOffset(
                          item.id,
                        );
                      }}
                      className={`${styles.navItem} ${
                        activeNav ===
                        item.id
                          ? styles.navItemActive
                          : ""
                      }`}
                    >
                      <span
                        className={
                          styles.navLabel
                        }
                      >
                        {
                          item.label
                        }
                      </span>

                      {activeNav ===
                        item.id && (
                        <span
                          className={
                            styles.navIndicator
                          }
                        />
                      )}
                    </button>
                  ),
                )}
              </nav>
            </div>
          </section>
        )}

        <main
          className={
            styles.main
          }
        >
          <div
            className={
              styles.contentGrid
            }
          >
            {game.screenshots
              ?.length > 0 && (
              <ScreenshotGallery
                screenshots={
                  game.screenshots
                }
              />
            )}

            <aside
              className={
                styles.sidebar
              }
            >
              <div
                className={
                  styles.actionsCard
                }
              >
                <StarRating
                  gameId={game.id}
                  gameName={game.name}
                  token=""
                  initialRating={game.user_rating ?? null}
                  showLabel={true}
                  compact={false}
                  onRatingSubmit={() => {}}
                />
                
                <GameActions
                  gameId={
                    game.id
                  }
                  gameName={
                    game.name
                  }
                  initialLiked={game.liked ?? false}
                  initialDisliked={game.disliked ?? false}
                  initialWishlist={game.in_wishlist ?? false}
                  initialRating={game.user_rating ?? null}
                  initialCompletionStatus={game.completion_status ?? 'not_played'}
                  initialPurchaseStatus={game.purchase_status ?? 'not_owned'}
                  onActionChange={() => {
                    // Обновляем данные игры после действия
                    const reloadGame = async () => {
                      try {
                        const response = await fetch(`/api/games/${game.id}`, {
                          credentials: 'include',
                        });
                        if (response.ok) {
                          const data = await response.json();
                          setGame(data);
                        }
                      } catch (error) {
                        console.error('Failed to reload game:', error);
                      }
                    };
                    reloadGame();
                  }}
                />
              </div>

              {game.platforms
                ?.length > 0 && (
                <div
                  className={
                    styles.platformsCard
                  }
                >
                  <h4
                    className={
                      styles.cardSubTitle
                    }
                  >
                    Платформы
                  </h4>

                  <div
                    className={
                      styles.platformChips
                    }
                  >
                    {game.platforms.map(
                      (p) => (
                        <span
                          key={
                            p.platform
                              .id
                          }
                          className={
                            styles.platformChip
                          }
                        >
                          {
                            p
                              .platform
                              .name
                          }
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}
            </aside>
          </div>

          <div
            className={
              styles.details
            }
          >
            {(game.description ||
              game.description_raw) && (
              <section
                id="description"
                className={
                  styles.section
                }
              >
                <h2
                  className={
                    styles.sectionTitle
                  }
                >
                  Описание
                </h2>

                <div
                  className={
                    styles.description
                  }
                >
                  {game.description_raw ||
                    game.description}
                </div>
              </section>
            )}

            {sortedDeals.length >
              0 && (
              <section
                id="deals"
                className={
                  styles.section
                }
              >
                <div
                  className={
                    styles.sectionHeader
                  }
                >
                  <h2
                    className={
                      styles.sectionTitle
                    }
                  >
                    Предложения
                  </h2>

                  <div
                    className={
                      styles.sortControl
                    }
                  >
                    <label>
                      Сортировка:
                    </label>

                    <select
                      value={
                        sortOrder
                      }
                      onChange={(
                        e,
                      ) =>
                        setSortOrder(
                          e
                            .target
                            .value as
                            | "price"
                            | "rating",
                        )
                      }
                      className={
                        styles.sortSelect
                      }
                    >
                      <option value="rating">
                        Лучшие
                        продавцы
                      </option>

                      <option value="price">
                        Сначала
                        дешёвые
                      </option>
                    </select>
                  </div>
                </div>

                <div
                  className={
                    styles.dealsGrid
                  }
                >
                  {sortedDeals.map(
                    (deal) => (
                      <a
                        key={
                          deal.id
                        }
                        href={
                          deal.url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className={
                          styles.dealCard
                        }
                      >
                        {deal.image && (
                          <div
                            className={
                              styles.dealImage
                            }
                          >
                            <img
                              src={`/api/crop-image?url=${encodeURIComponent(
                                "https:" +
                                  deal.image,
                              )}`}
                              alt={
                                deal.seller_name
                              }
                              loading="lazy"
                            />
                          </div>
                        )}

                        <div
                          className={
                            styles.dealContent
                          }
                        >
                          <div
                            className={
                              styles.dealHeader
                            }
                          >
                            <h4
                              className={
                                styles.dealSeller
                              }
                            >
                              {
                                deal.seller_name
                              }
                            </h4>

                            <span
                              className={
                                styles.dealRating
                              }
                            >
                              ⭐{" "}
                              {deal.seller_rating?.toFixed(
                                0,
                              )}
                            </span>
                          </div>

                          <p
                            className={
                              styles.dealName
                            }
                          >
                            {
                              deal.name
                            }
                          </p>

                          <div
                            className={
                              styles.dealFooter
                            }
                          >
                            <span
                              className={
                                styles.dealPrice
                              }
                            >
                              {deal.price_rur.toLocaleString(
                                "ru-RU",
                              )}{" "}
                              ₽
                            </span>

                            <span
                              className={
                                styles.dealArrow
                              }
                            >
                              →
                            </span>
                          </div>
                        </div>
                      </a>
                    ),
                  )}
                </div>

                {deals.length >
                  3 && (
                  <button
                    onClick={() =>
                      setShowAll(
                        !showAll,
                      )
                    }
                    className={
                      styles.toggleButton
                    }
                  >
                    {showAll
                      ? "Скрыть"
                      : `Показать ещё (${Math.min(
                          9,
                          deals.length -
                            1,
                        )})`}
                  </button>
                )}
              </section>
            )}

            <div
              className={
                styles.metaGrid
              }
            >
              {game.genres
                ?.length > 0 && (
                <section
                  className={
                    styles.section
                  }
                >
                  <h3
                    className={
                      styles.sectionTitle
                    }
                  >
                    Жанры
                  </h3>

                  <div
                    className={
                      styles.chipGroup
                    }
                  >
                    {game.genres.map(
                      (
                        genre,
                      ) => (
                        <Link
                          key={
                            genre.id
                          }
                          href={`/games?genres=${genre.id}&q=''`}
                          className={
                            styles.chip
                          }
                        >
                          {
                            genre.name
                          }
                        </Link>
                      ),
                    )}
                  </div>
                </section>
              )}

              {game.tags?.length >
                0 && (
                <section
                  className={
                    styles.section
                  }
                >
                  <h3
                    className={
                      styles.sectionTitle
                    }
                  >
                    Теги
                  </h3>

                  <div
                    className={
                      styles.chipGroup
                    }
                  >
                    {game.tags
                      .slice(
                        0,
                        12,
                      )
                      .map(
                        (
                          tag,
                        ) => (
                          <Link
                            key={
                              tag.id
                            }
                            href={`/games?tags=${tag.id}&q=''`}
                            className={
                              styles.chip
                            }
                          >
                            {
                              tag.name
                            }
                          </Link>
                        ),
                      )}
                  </div>
                </section>
              )}

              {game.publishers
                ?.length > 0 && (
                <section
                  className={
                    styles.section
                  }
                >
                  <h3
                    className={
                      styles.sectionTitle
                    }
                  >
                    Издатели
                  </h3>

                  <div
                    className={
                      styles.chipGroup
                    }
                  >
                    {game.publishers.map(
                      (
                        pub,
                      ) => (
                        <span
                          key={
                            pub.id
                          }
                          className={
                            styles.chip
                          }
                        >
                          {
                            pub.name
                          }
                        </span>
                      ),
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>

          {similarGames.length >
            0 && (
            <section
              id="similar"
              className={
                styles.section
              }
            >
              <div
                className={
                  styles.sectionHeader
                }
              >
                <h2
                  className={
                    styles.sectionTitle
                  }
                >
                  Похожие игры
                </h2>

                <Link
                  href="/games"
                  className={
                    styles.viewAllLink
                  }
                >
                  Все игры →
                </Link>
              </div>

              <GamesGrid
                games={
                  similarGames
                }
                showRecommendationReason
              />
            </section>
          )}

          {similarLoading && (
            <div
              className={
                styles.loadingMore
              }
            >
              Загружаем похожие
              игры...
            </div>
          )}
        </main>
      </div>
    </>
  );
}
