"use client";

import {
  useState,
} from "react";

import styles from "./Profile.module.css";

import { useAuth } from "@/contexts/AuthContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSettingsModal({
  isOpen,
  onClose,
}: Props) {
  const { user, logout } =
    useAuth();

  const [username, setUsername] =
    useState(
      user?.username || "",
    );

  const [login, setLogin] =
    useState(
      user?.login || "",
    );

  const [password, setPassword] =
    useState("");

  if (!isOpen) return null;

  const handleSave =
    async () => {
      await fetch(
        "/api/users/me",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            username,
            login,
            password,
          }),
        },
      );

      onClose();
    };

  return (
    <div
      className={
        styles.modalOverlay
      }
    >
      <div
        className={
          styles.modal
        }
      >
        <h2>Настройки</h2>

        <input
          value={username}
          onChange={(e) =>
            setUsername(
              e.target.value,
            )
          }
          placeholder="Имя"
        />

        <input
          value={login}
          onChange={(e) =>
            setLogin(
              e.target.value,
            )
          }
          placeholder="Логин"
        />

        <input
          type="password"
          value={password}
          onChange={(e) =>
            setPassword(
              e.target.value,
            )
          }
          placeholder="Новый пароль"
        />

        <div
          className={
            styles.modalActions
          }
        >
          <button
            onClick={
              handleSave
            }
          >
            Сохранить
          </button>

          <button
            onClick={logout}
          >
            Выйти
          </button>

          <button
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}