// components/RssSourcesPanel/RssSourcesPanel.tsx
"use client";

import { useState } from "react";
import styles from "./RssSourcesPanel.module.css";

interface RssSource {
  id: string;
  name: string;
  url: string;
  isEnabled: boolean;
  isDefault: boolean;
  category: string;
}

interface RssSourcesPanelProps {
  sources: RssSource[];
  onToggleSource: (id: string) => void;
  onDeleteSource: (id: string) => void;
  onAddSource: (source: RssSource) => void;
}

export default function RssSourcesPanel({
  sources,
  onToggleSource,
  onDeleteSource,
  onAddSource,
}: RssSourcesPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newSource, setNewSource] = useState({ name: "", url: "", category: "gaming" });
  const [error, setError] = useState("");

  const handleAdd = async () => {
    if (!newSource.name || !newSource.url) {
      setError("Заполните все поля");
      return;
    }

    // Валидация URL
    try {
      new URL(newSource.url);
    } catch {
      setError("Некорректный URL");
      return;
    }

    const source: RssSource = {
      id: `custom-${Date.now()}`,
      name: newSource.name,
      url: newSource.url,
      isEnabled: true,
      isDefault: false,
      category: newSource.category,
    };

    onAddSource(source);
    setNewSource({ name: "", url: "", category: "gaming" });
    setIsAdding(false);
    setError("");
  };

  const categories = ["gaming", "tech", "general"];

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Источники</h3>
        <button 
          className={styles.addButton}
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? "Отмена" : "+ Добавить RSS"}
        </button>
      </div>

      {/* Форма добавления */}
      {isAdding && (
        <div className={styles.addForm}>
          <input
            type="text"
            placeholder="Название источника"
            value={newSource.name}
            onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
            className={styles.input}
          />
          <input
            type="url"
            placeholder="https://example.com/rss"
            value={newSource.url}
            onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
            className={styles.input}
          />
          <select
            value={newSource.category}
            onChange={(e) => setNewSource({ ...newSource, category: e.target.value })}
            className={styles.select}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {error && <span className={styles.error}>{error}</span>}
          <button onClick={handleAdd} className={styles.submitButton}>
            Добавить источник
          </button>
        </div>
      )}

      {/* Список источников */}
      <div className={styles.sourcesList}>
        {sources.map(source => (
          <div 
            key={source.id} 
            className={`${styles.sourceItem} ${!source.isEnabled ? styles.disabled : ''}`}
            onClick={() => onToggleSource(source.id)}
          >
            <div className={styles.sourceInfo}>
              <span className={styles.sourceName}>{source.name}</span>
              <span className={styles.sourceCategory}>{source.category}</span>
            </div>
            
            <div className={styles.sourceActions}>
              {/* Toggle */}
              <button
                className={`${styles.toggleButton} ${source.isEnabled ? styles.enabled : ''}`}
                
                title={source.isEnabled ? "Отключить" : "Включить"}
              >
                {source.isEnabled ? "●" : "○"}
              </button>
              
              {/* Delete (только для кастомных) */}
              {!source.isDefault && (
                <button
                  className={styles.deleteButton}
                  onClick={() => onDeleteSource(source.id)}
                  title="Удалить источник"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Статистика */}
      <div className={styles.stats}>
        <span className={styles.stat}>
          Активных: <strong>{sources.filter(s => s.isEnabled).length}</strong>
        </span>
        <span className={styles.stat}>
          Всего: <strong>{sources.length}</strong>
        </span>
      </div>
    </div>
  );
}