"use client";

import Image from "next/image";

import styles from "./SearchInput.module.css";

interface SearchInputProps {
  onInput: (value: string) => void;

  initialValue: string;

  disabled?: boolean;

  placeholder?: string;
}

export default function SearchInput({
  onInput,
  initialValue,
  disabled = false,
  placeholder = "",
}: SearchInputProps) {
  return (
    <div className={styles.inputHolder}>
      <Image
        src="/icons/search.svg"
        alt="Search"
        height={30}
        width={30}
        className={styles.image}
      />

      <input
        type="text"
        id={styles.input}
        value={initialValue}
        onChange={(e) =>
          onInput(e.target.value)
        }
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  );
}

