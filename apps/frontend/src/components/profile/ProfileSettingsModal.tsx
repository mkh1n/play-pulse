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
      <div
        className={
          styles.modalHeader
        }
      >
        <h2
          className={
            styles.modalTitle
          }
        >
          Настройки профиля
        </h2>

        <p
          className={
            styles.modalSubtitle
          }
        >
          Изменяй имя,
          логин и пароль
        </p>
      </div>

      <div
        className={
          styles.field
        }
      >
        <label
          htmlFor="name"
          className={
            styles.label
          }
        >
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
          className={
            styles.input
          }
          placeholder="Имя"
        />
      </div>

      <div
        className={
          styles.field
        }
      >
        <label
          htmlFor="login"
          className={
            styles.label
          }
        >
          Логин
        </label>

        <input
          value={login}
          onChange={(e) =>
            setLogin(
              e.target.value,
            )
          }
          id="login"
          className={
            styles.input
          }
          placeholder="@roma223"
        />
      </div>

      <div
        className={
          styles.field
        }
      >
        <label
          htmlFor="password"
          className={
            styles.label
          }
        >
          Новый пароль
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
          className={
            styles.input
          }
          placeholder="••••••••"
        />
      </div>

      <div
        className={
          styles.modalActions
        }
      >
        <button
          onClick={
            handleSave
          }
          className={
            styles.primaryButton
          }
        >
          Сохранить
        </button>

        <button
          onClick={
            onClose
          }
          className={
            styles.secondaryButton
          }
        >
          Закрыть
        </button>
      </div>

      <button
        onClick={logout}
        className={
          styles.logoutButton
        }
      >
        Выйти из аккаунта
      </button>
    </div>
  </div>
);
}