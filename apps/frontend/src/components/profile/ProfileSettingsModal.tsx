"use client";

import {
  useEffect,
  useState,
} from "react";

import styles from "./Profile.module.css";

import { useAuth }
from "@/contexts/AuthContext";

interface Props {
  isOpen: boolean;

  onClose: () => void;
}

export default function ProfileSettingsModal({
  isOpen,
  onClose,
}: Props) {
  const {
    user,
    profile,
    logout,
  } = useAuth();

  const [username, setUsername] =
    useState("");

  const [login, setLogin] =
    useState("");

  const [password, setPassword] =
    useState("");

  useEffect(() => {
    setUsername(
      profile?.name || "",
    );

    setLogin(
      user?.login || "",
    );
  }, [
    profile,
    user,
  ]);

  if (!isOpen)
    return null;

  const handleSave =
    async () => {
      try {
        // PROFILE

        const profileResponse =
          await fetch(
            "/api/users/me/profile",
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                name:
                  username,
              }),
            },
          );

        console.log(
          "PROFILE RESPONSE",
          await profileResponse.json(),
        );

        // USER

        const userResponse =
          await fetch(
            "/api/users/me",
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                login,

                password:
                  password ||
                  undefined,
              }),
            },
          );

        console.log(
          "USER RESPONSE",
          await userResponse.json(),
        );

        window.location.reload();
      } catch (error) {
        console.error(
          error,
        );
      }
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
        <h2>
          Настройки
        </h2>

        <label htmlFor="name">
          Имя
        </label>

        <input
          value={username}
          onChange={(e) =>
            setUsername(
              e.target.value,
            )
          }
          id="name"
          placeholder="Имя"
        />

        <label htmlFor="login">
          Username
        </label>

        <input
          value={login}
          onChange={(e) =>
            setLogin(
              e.target.value,
            )
          }
          id="login"
          placeholder="Логин"
        />

        <label htmlFor="password">
          Пароль
        </label>

        <input
          type="password"
          value={password}
          onChange={(e) =>
            setPassword(
              e.target.value,
            )
          }
          id="password"
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
            onClick={
              logout
            }
          >
            Выйти
          </button>

          <button
            onClick={
              onClose
            }
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}