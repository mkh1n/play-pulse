"use client";

import styles from "./Profile.module.css";

import { useAuth } from "@/contexts/AuthContext";

import { supabase } from "@/lib/supabase";

import {
  Upload,
  X,
} from "lucide-react";

interface Props {
  onOpenSettings: () => void;
}

export default function ProfileHeader({
  onOpenSettings,
}: Props) {
  const {
    user,
    profile,
  } = useAuth();

  const handleAvatarUpload =
    async (
      e: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const file =
        e.target.files?.[0];

      if (!file || !user)
        return;

      const filePath =
        `${user.id}/avatar`;

      const {
        error,
      } =
        await supabase.storage
          .from(
            "avatars",
          )
          .upload(
            filePath,
            file,
            {
              upsert: true,
            },
          );

      if (error) {
        console.error(
          error,
        );

        return;
      }

      const {
        data,
      } =
        supabase.storage
          .from(
            "avatars",
          )
          .getPublicUrl(
            filePath,
          );

      await fetch(
        "/api/users/me/profile",
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            avatar_url:
              `${data.publicUrl}?t=${Date.now()}`,
          }),
        },
      );

      window.location.reload();
    };

  const handleRemoveAvatar =
    async () => {
      if (!user)
        return;

      const filePath =
        `${user.id}/avatar`;

      await supabase.storage
        .from(
          "avatars",
        )
        .remove([
          filePath,
        ]);

      await fetch(
        "/api/users/me/profile",
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            avatar_url:
              null,
          }),
        },
      );

      window.location.reload();
    };

  return (
    <header
      className={
        styles.header
      }
    >
      <div
        className={
          styles.headerLeft
        }
      >
        <div
          className={
            styles.avatarWrapper
          }
        >
         {profile?.avatar_url ? (
  <img
    src={
      profile.avatar_url
    }
    alt="avatar"
    className={
      styles.avatar
    }
  />
) : (
  <div
    className={
      styles.avatarPlaceholder
    }
  >
    {(
      profile?.name ||
      user?.login ||
      "U"
    )
      .charAt(0)
      .toUpperCase()}
  </div>
)}

          <div
            className={
              styles.avatarOverlay
            }
          >
            <label
              className={
                styles.avatarButton
              }
            >
              <Upload
                size={18}
              />

              <input
                type="file"
                accept="image/*"
                onChange={
                  handleAvatarUpload
                }
                hidden
              />
            </label>

            {profile?.avatar_url && (
              <button
                className={
                  styles.avatarButton
                }
                onClick={
                  handleRemoveAvatar
                }
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div>
          <h1
            className={
              styles.username
            }
          >
            {profile?.name ||
              user?.login}
          </h1>

          <p
            className={
              styles.login
            }
          >
            @{user?.login}
          </p>
        </div>
      </div>

      <button
        className={
          styles.settingsButton
        }
        onClick={
          onOpenSettings
        }
      >
        ⚙️ Настройки
      </button>
    </header>
  );
}