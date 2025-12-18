"use client";
import Image from "next/image";
import styles from "./SearchInput.module.css";

export default function SearchInput({onInput, initialValue}) {
  return (
    <div className={styles.inputHolder}>
        <Image
        src="/icons/search.svg"
        alt="Описание изображения"
        height={30}
        width={30}
        className={styles.image}
      />
      <input type="text" id={styles.input} value={initialValue} onInput={(e) : String => onInput((e.target as HTMLInputElement).value )}/>
    </div>
  );
}
