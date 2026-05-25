"use client";

import styles from "./Skeleton.module.css";

interface SkeletonProps {
  className?: string;
}

export function SkeletonBlock({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`${styles.skeleton} ${className}`}
    />
  );
}

interface SkeletonTextProps extends SkeletonProps {
  lines?: number;
}

export function SkeletonText({
  className = "",
  lines = 3,
}: SkeletonTextProps) {
  return (
    <div
      aria-hidden="true"
      className={`${styles.textStack} ${className}`}
    >
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBlock
          key={index}
          className={
            index === lines - 1 ? styles.shortLine : styles.line
          }
        />
      ))}
    </div>
  );
}
