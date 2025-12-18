// components/NoteBlock/NoteBlock.tsx
import styles from "./NoteBlock.module.css";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useMediaActions } from "@/hooks/useMediaActions";
import { MediaType } from "@/types/storage";
import { TMDBMediaItem } from "@/types/tmdb";
interface NoteBlockProps {
  mediaId: number;
  mediaType: MediaType;
  mediaData?: TMDBMediaItem; // ДАННЫЕ МЕДИА ДЛЯ КЭШИРОВАНИЯ
  className?: string;
  onNoteSaved?: (note: string) => void;
  onNoteRemoved?: () => void;
}

export default function NoteBlock({ 
  mediaId, 
  mediaType, 
  mediaData,
  className = "", 
  onNoteSaved,
  onNoteRemoved 
}: NoteBlockProps) {
  const [note, setNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [savedNote, setSavedNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { setNote: saveNoteToStore, getNote: getNoteFromStore, ensureMediaCached } = useMediaActions();

  // Кэшируем медиа при монтировании
  useEffect(() => {
    if (mediaData) {
      ensureMediaCached(mediaData, mediaType);
      console.log(`💾 NoteBlock: Медиа ${mediaType}_${mediaId} кэшировано`);
    }
  }, [mediaData, mediaType, mediaId, ensureMediaCached]);
  // Валидация параметров
  const isValidParams = () => {
    const id = Number(mediaId);
    const type = mediaType as MediaType;
    
    return !isNaN(id) && id > 0 && 
           (type === 'movie' || type === 'tv' || type === 'person');
  };

  // Загружаем заметку из хранилища при монтировании
  useEffect(() => {
    if (!isValidParams()) {
      console.warn("Invalid NoteBlock params:", { mediaId, mediaType });
      setIsInitialized(true);
      return;
    }

    const loadSavedNote = () => {
      try {
        const id = Number(mediaId);
        const type = mediaType as MediaType;
        
        console.log(`Loading note for ${type}_${id}`);
        const storedNote = getNoteFromStore(id, type);
        
        if (storedNote) {
          setSavedNote(storedNote);
        } else {
          setSavedNote(""); // Сбрасываем если нет заметки
        }
      } catch (error) {
        console.error("Ошибка при загрузке заметки:", error);
        setSavedNote("");
      } finally {
        setIsInitialized(true);
      }
    };

    loadSavedNote();
  }, [mediaId, mediaType, getNoteFromStore]);

  // Адаптация высоты textarea
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [note, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidParams()) {
      console.error("Cannot save note: invalid params", { mediaId, mediaType });
      return;
    }
    
    if (!note.trim()) {
      // Если поле пустое, удаляем заметку
      deleteNote();
      return;
    }
    
    setIsLoading(true);
    
    try {
      const id = Number(mediaId);
      const type = mediaType as MediaType;
      
      // Сохраняем в хранилище для конкретного медиа
      saveNoteToStore(id, type, note.trim());
      
      // Обновляем локальное состояние
      setSavedNote(note.trim());
      setNote("");
      setIsEditing(false);
      
      // Вызываем callback, если есть
      if (onNoteSaved) {
        onNoteSaved(note.trim());
      }
      
      console.log(`Note saved for ${type}_${id}:`, note.trim());
    } catch (error) {
      console.error("Ошибка при сохранении заметки:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = () => {
    setNote(savedNote);
    setIsEditing(true);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
      }
    }, 10);
  };

  const cancelEditing = () => {
    setNote("");
    setIsEditing(false);
  };

  const deleteNote = () => {
    if (!isValidParams()) {
      console.error("Cannot delete note: invalid params", { mediaId, mediaType });
      return;
    }
    
    if (savedNote && !window.confirm("Вы уверены, что хотите удалить заметку?")) {
      return;
    }
    
    try {
      const id = Number(mediaId);
      const type = mediaType as MediaType;
      
      // Удаляем заметку для конкретного медиа
      saveNoteToStore(id, type, "");
      
      // Обновляем локальное состояние
      setSavedNote("");
      setNote("");
      setIsEditing(false);
      
      // Вызываем callback, если есть
      if (onNoteRemoved) {
        onNoteRemoved();
      }
      
      console.log(`Note deleted for ${type}_${id}`);
    } catch (error) {
      console.error("Ошибка при удалении заметки:", error);
    }
  };

  // Если параметры не валидны, показываем заглушку
  if (!isValidParams() || !isInitialized) {
    return (
      <div className={`${styles.formContainer} ${className}`}>
        <div className={styles.disabledNote}>
          <Image
            src="/icons/note-disabled.svg"
            alt="note disabled"
            height={20}
            width={20}
            className={styles.noteIcon}
          />
          <span className={styles.disabledText}>
            Заметки недоступны
          </span>
        </div>
      </div>
    );
  }

  // Если у нас уже есть сохраненная заметка и мы не в режиме редактирования
  if (!isEditing && savedNote) {
    return (
      <div className={`${styles.formContainer} ${className}`}>
        <div className={styles.noteDisplayContainer}>
          <div className={styles.noteDisplay}>
            <Image
              src="/icons/note.svg"
              alt="note"
              height={20}
              width={20}
              className={styles.noteIcon}
              priority
            />
            <div className={styles.noteContent}>
              <p className={styles.noteText}>{savedNote}</p>
              
            </div>
            <div className={styles.noteActions}>
                <button
                  type="button"
                  className={styles.editButton}
                  onClick={startEditing}
                  aria-label="Редактировать заметку"
                  title="Редактировать"
                >
                  <Image
                    src="/icons/edit.svg"
                    alt="edit"
                    height={16}
                    width={16}
                    className={styles.editIcon}
                    priority
                  />
                </button>
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={deleteNote}
                  aria-label="Удалить заметку"
                  title="Удалить"
                >
                  <Image
                    src="/icons/clear.svg"
                    alt="delete"
                    height={16}
                    width={16}
                    className={styles.removeIcon}
                    priority
                  />
                </button>
              </div>
          </div>
        </div>
      </div>
    );
  }

  // Форма для создания/редактирования заметки
  return (
    <div className={`${styles.formContainer} ${className}`}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.noteInputHolder}>
          <Image
            src="/icons/note.svg"
            alt="note"
            height={20}
            width={20}
            className={styles.noteIcon}
            priority
          />
          <textarea
            ref={textareaRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Оставить заметку..."
            rows={2}
            className={styles.textarea}
            autoFocus={isEditing}
            disabled={isLoading}
            maxLength={1000}
          />
          {note.length > 0 && (
            <div className={styles.charCounter}>
              {note.length}/1000
            </div>
          )}
        </div>
        
        <div className={styles.buttonGroup}>
          {(isEditing || savedNote) && (
            <button
              type="button"
              className={`${styles.submitButton} ${styles.cancelButton}`}
              onClick={cancelEditing}
              disabled={isLoading}
            >
              Отмена
            </button>
          )}
          
          <button
            type="submit"
            className={`${styles.submitButton} ${
              note.trim().length > 0 ? styles.active : ""
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className={styles.loadingText}>Сохранение...</span>
            ) : savedNote ? (
              "Сохранить"
            ) : (
              "Оставить заметку"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}