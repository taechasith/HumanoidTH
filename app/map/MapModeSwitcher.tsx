"use client";

import { useState } from "react";
import { Map, MapPinned } from "lucide-react";
import type { ContributionMapPoint } from "./actions";
import type { ProvinceBoundary } from "./provinceBoundaries";
import GoogleMapClient from "./GoogleMapClient";
import LocationExplorer from "./LocationExplorer";
import styles from "./MapModeSwitcher.module.css";

type Props = {
  apiKey: string;
  points: ContributionMapPoint[];
  provinceBoundaries: ProvinceBoundary[];
  lang: "en" | "th";
};

const localT = {
  en: {
    dataMap: "Data map",
    liveMap: "Live map",
    dataMapHelp: "Browse Atlas records by Thai province.",
    liveMapHelp: "View exact coordinates and map markers."
  },
  th: {
    dataMap: "แผนที่ข้อมูล",
    liveMap: "แผนที่จริง",
    dataMapHelp: "เลือกจังหวัดเพื่อดูข้อมูลใน Atlas",
    liveMapHelp: "ดูตำแหน่งพิกัดและหมุดบนแผนที่จริง"
  }
};

export default function MapModeSwitcher({ apiKey, points, provinceBoundaries, lang }: Props) {
  const [mode, setMode] = useState<"data" | "live">("data");
  const t = localT[lang];

  return (
    <section aria-label={lang === "th" ? "โหมดแผนที่" : "Map mode"}>
      <div className={styles.switcher}>
        <div className={styles.buttons} role="tablist" aria-label={lang === "th" ? "เลือกโหมดแผนที่" : "Choose map mode"}>
          <button
            aria-selected={mode === "data"}
            className={mode === "data" ? styles.active : ""}
            onClick={() => setMode("data")}
            role="tab"
            type="button"
          >
            <Map aria-hidden="true" size={16} /> {t.dataMap}
          </button>
          <button
            aria-selected={mode === "live"}
            className={mode === "live" ? styles.active : ""}
            onClick={() => setMode("live")}
            role="tab"
            type="button"
          >
            <MapPinned aria-hidden="true" size={16} /> {t.liveMap}
          </button>
        </div>
        <p>{mode === "data" ? t.dataMapHelp : t.liveMapHelp}</p>
      </div>
      {mode === "data" ? (
        <LocationExplorer lang={lang} points={points} provinceBoundaries={provinceBoundaries} />
      ) : (
        <GoogleMapClient apiKey={apiKey} lang={lang} points={points} />
      )}
    </section>
  );
}
