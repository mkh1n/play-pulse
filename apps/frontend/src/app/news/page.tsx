"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import styles from "./NewsPage.module.css";
import NewsCard from "@/components/NewsCard/NewsCard";
import RssSourcesPanel from "@/components/RssSourcesPanel/RssSourcesPanel";
import { DEFAULT_SOURCES, RssSource, RssItem } from "../api/news/rss/utils";

const PAGE_SIZE = 20;

export default function NewsPage() {
  const [sources, setSources] = useState<RssSource[]>([]);
  const [allArticles, setAllArticles] = useState<RssItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest");

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const getVariant = (id: string): "medium" | "tall" | "wide" => {
    let hash = 0;

    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }

    const value = Math.abs(hash % 10);

    if (value < 2) return "tall";
    if (value < 4) return "wide";
    return "medium";
  };

  // ===== SOURCES =====
  useEffect(() => {
    const saved = localStorage.getItem("news-sources");
    if (saved) {
      setSources(JSON.parse(saved));
    } else {
      setSources(DEFAULT_SOURCES);
      localStorage.setItem("news-sources", JSON.stringify(DEFAULT_SOURCES));
    }
  }, []);

  useEffect(() => {
    if (sources.length > 0) {
      localStorage.setItem("news-sources", JSON.stringify(sources));
    }
  }, [sources]);

  // ===== FETCH =====
  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const enabledIds = sources
          .filter(s => s.isEnabled)
          .map(s => s.id)
          .join(",");

        const res = await fetch(`/api/news/rss`, {
          method: "POST",
          body: JSON.stringify({
            sources: sources.filter(s => s.isEnabled)
          }),
        })
        const data = await res.json();

        if (data.success) {
          setAllArticles(data.items);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (sources.some(s => s.isEnabled)) {
      fetchNews();
    }
  }, [sources]);

  const visibleArticles = allArticles.slice(0, visibleCount);

  const featured = visibleArticles.slice(0, 2);
  const rest = visibleArticles.slice(2);

  // ===== INFINITE SCROLL =====
  const loadMore = useCallback(() => {
    setVisibleCount(prev => prev + PAGE_SIZE);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  // ===== HANDLERS =====
  const handleToggleSource = (id: string) => {
    setSources(prev =>
      prev.map(s =>
        s.id === id ? { ...s, isEnabled: !s.isEnabled } : s
      )
    );
  };

  const handleDeleteSource = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
  };

  const handleAddSource = (source: RssSource) => {
    setSources(prev => [...prev, source]);
  };
  return (
    
    <div className={styles.container}>
      <title>PlayPulse | Новости и статьи</title>
      <div className={styles.newsLayout}>
        <main className={styles.content}>
          {
            visibleArticles.length == 0 && !loading?
              <div>Включите хотя бы один источник</div>
              :
              <>
                <div className={styles.featured}>
                  {featured.map(article => (
                    <NewsCard
                      key={article.id}
                      article={article}
                      variant="large"
                    />
                  ))}
                </div>

                <div className={styles.grid}>
                  {rest.map((article) => (
                    <NewsCard
                      key={article.id}
                      article={article}
                      variant={getVariant(article.id)}
                    />
                  ))}
                </div>

                <div ref={loadMoreRef} className={styles.loadMore} />


               
              </>
          }
        </main>
 <aside className={styles.sidebar}>
                  <RssSourcesPanel
                    sources={sources}
                    onToggleSource={handleToggleSource}
                    onDeleteSource={handleDeleteSource}
                    onAddSource={handleAddSource}
                  />
                </aside>
      </div>
    </div >
  );
}