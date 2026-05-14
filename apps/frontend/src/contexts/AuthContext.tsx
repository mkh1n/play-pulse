"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import { useRouter } from "next/navigation";

export interface UserProfile {
  name?: string;

  avatar_url?: string;

  bio?: string;
}

export interface User {
  id: number;
  username: string;
  login: string;

  created_at: string;
}

interface AuthContextType {
  user: User | null;

  profile: UserProfile | null;

  token: string | null;

  isLoading: boolean;

  login: (
    login: string,
    password: string,
  ) => Promise<boolean>;

  register: (
    login: string,
    password: string,
  ) => Promise<boolean>;

  logout: () => Promise<void>;

  isAuthenticated: boolean;

  updateUser: (
    userData: Partial<User>,
  ) => void;

  updateProfile: (
    profileData: Partial<UserProfile>,
  ) => void;

  refreshProfile: () => Promise<void>;
}

const AuthContext =
  createContext<AuthContextType>({
    user: null,

    profile: null,

    token: null,

    isLoading: true,

    login: async () => false,

    register:
      async () => false,

    logout: async () => {},

    isAuthenticated: false,

    updateUser: () => {},

    updateProfile:
      () => {},

    refreshProfile:
      async () => {},
  });

export const useAuth = () =>
  useContext(AuthContext);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(
      null,
    );

  const [profile, setProfile] =
    useState<UserProfile | null>(
      null,
    );

  const [token, setToken] =
    useState<string | null>(
      null,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const router = useRouter();

  // =========================
  // LOAD PROFILE
  // =========================

  const refreshProfile =
    async () => {
      try {
        const response =
          await fetch(
            "/api/users/me",
          );

        if (
          !response.ok
        ) {
          return;
        }

        const data =
          await response.json();

        if (
          data.user
        ) {
          setUser(
            data.user,
          );

          localStorage.setItem(
            "user",
            JSON.stringify(
              data.user,
            ),
          );
        }

        if (
          data.profile
        ) {
          setProfile(
            data.profile,
          );

          localStorage.setItem(
            "profile",
            JSON.stringify(
              data.profile,
            ),
          );
        }
      } catch (error) {
        console.error(
          "Profile refresh error:",
          error,
        );
      }
    };

  // =========================
  // SERVER AUTH CHECK
  // =========================

  const checkAuthFromServer =
    async () => {
      try {
        const response =
          await fetch(
            "/api/auth/check",
          );

        if (!response.ok) {
          return false;
        }

        const data =
          await response.json();

        if (
          data.authenticated &&
          data.user &&
          data.token
        ) {
          setUser(data.user);

          setToken(
            data.token,
          );

          localStorage.setItem(
            "token",
            data.token,
          );

          localStorage.setItem(
            "user",
            JSON.stringify(
              data.user,
            ),
          );

          await refreshProfile();

          return true;
        }

        return false;
      } catch (error) {
        console.error(
          "Server auth check failed:",
          error,
        );

        return false;
      }
    };

  // =========================
  // INIT
  // =========================

  useEffect(() => {
    const initAuth =
      async () => {
        try {
          const serverAuthValid =
            await checkAuthFromServer();

          if (
            !serverAuthValid
          ) {
            const storedToken =
              localStorage.getItem(
                "token",
              );

            const storedUser =
              localStorage.getItem(
                "user",
              );

            const storedProfile =
              localStorage.getItem(
                "profile",
              );

            if (
              storedToken &&
              storedUser
            ) {
              setToken(
                storedToken,
              );

              setUser(
                JSON.parse(
                  storedUser,
                ),
              );

              if (
                storedProfile
              ) {
                setProfile(
                  JSON.parse(
                    storedProfile,
                  ),
                );
              }
            }
          }
        } catch (error) {
          console.error(
            "Auth initialization error:",
            error,
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      };

    initAuth();
  }, []);

  // =========================
  // LOGIN
  // =========================

  const login =
    async (
      login: string,
      password: string,
    ): Promise<boolean> => {
      try {
        const response =
          await fetch(
            "/api/auth/login",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                {
                  login,
                  password,
                },
              ),
            },
          );

        if (
          !response.ok
        ) {
          return false;
        }

        const data =
          await response.json();

        setToken(
          data.token,
        );

        setUser(data.user);

        localStorage.setItem(
          "token",
          data.token,
        );

        localStorage.setItem(
          "user",
          JSON.stringify(
            data.user,
          ),
        );

        await refreshProfile();

        return true;
      } catch (error) {
        console.error(
          "Login error:",
          error,
        );

        return false;
      }
    };

  // =========================
  // REGISTER
  // =========================

  const register =
    async (
      login: string,
      password: string,
    ): Promise<boolean> => {
      try {
        const response =
          await fetch(
            "/api/auth/register",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                {
                  login,
                  password,
                },
              ),
            },
          );

        if (
          !response.ok
        ) {
          return false;
        }

        const data =
          await response.json();

        setToken(
          data.token,
        );

        setUser(data.user);

        localStorage.setItem(
          "token",
          data.token,
        );

        localStorage.setItem(
          "user",
          JSON.stringify(
            data.user,
          ),
        );

        await refreshProfile();

        return true;
      } catch (error) {
        console.error(
          "Register error:",
          error,
        );

        return false;
      }
    };

  // =========================
  // LOGOUT
  // =========================

  const logout =
    async () => {
      try {
        await fetch(
          "/api/auth/logout",
          {
            method:
              "POST",
          },
        );
      } catch (error) {
        console.error(
          "Logout API error:",
          error,
        );
      }

      localStorage.removeItem(
        "token",
      );

      localStorage.removeItem(
        "user",
      );

      localStorage.removeItem(
        "profile",
      );

      setUser(null);

      setProfile(
        null,
      );

      setToken(null);

      router.push("/");
    };

  // =========================
  // UPDATE USER
  // =========================

  const updateUser = (
    userData: Partial<User>,
  ) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      ...userData,
    };

    setUser(
      updatedUser,
    );

    localStorage.setItem(
      "user",
      JSON.stringify(
        updatedUser,
      ),
    );
  };

  // =========================
  // UPDATE PROFILE
  // =========================

  const updateProfile = (
    profileData: Partial<UserProfile>,
  ) => {
    const updatedProfile = {
      ...profile,
      ...profileData,
    };

    setProfile(
      updatedProfile,
    );

    localStorage.setItem(
      "profile",
      JSON.stringify(
        updatedProfile,
      ),
    );
  };

  const isAuthenticated =
    !!user && !!token;

  return (
    <AuthContext.Provider
      value={{
        user,

        profile,

        token,

        isLoading,

        login,

        register,

        logout,

        isAuthenticated,

        updateUser,

        updateProfile,

        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}