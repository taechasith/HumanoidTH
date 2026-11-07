// The HRI Passport drawn as an identity card. Presentational only: callers pass already-translated text.
// Used by the calibration "done" screen (LivingLabClient) and the passport card page (PassportCardClient).
import { Eye, Gauge, Languages, MessageCircle, MoveHorizontal, ShieldCheck, type LucideIcon } from "lucide-react";
import styles from "./passport-card.module.css";

export type PassportVisualPref = {
  key: "distance" | "speed" | "gaze" | "language" | "speech";
  label: string;
  value: string;
};

const ICONS: Record<PassportVisualPref["key"], LucideIcon> = {
  distance: MoveHorizontal,
  speed: Gauge,
  gaze: Eye,
  language: Languages,
  speech: MessageCircle
};

// Passport-style machine-readable line. Only data already printed on the card: code, language, version.
export function passportMrz(code: string, language: string, version: number) {
  return `HRI<${language.toUpperCase()}<<${code}<<V${version}`.padEnd(36, "<");
}

export default function PassportCardVisual({
  heading,
  motto,
  code,
  codeLabel,
  qr,
  qrAlt,
  statusLabel,
  active,
  prefs,
  language,
  version,
  meta,
  issued = false,
  codeClassName,
  codeTestId,
  qrTestId
}: {
  heading: string;
  motto: string;
  code: string;
  codeLabel: string;
  qr: string | null;
  qrAlt: string;
  statusLabel: string;
  active: boolean;
  prefs: PassportVisualPref[];
  language: string;
  version: number;
  meta?: string;
  issued?: boolean;
  codeClassName?: string;
  codeTestId?: string;
  qrTestId?: string;
}) {
  return (
    <figure className={`${styles.card} ${issued ? styles.issued : ""}`} aria-label={`${heading} ${code}`} style={{ margin: 0 }}>
      <div className={styles.head}>
        <div className={styles.brand}>
          <span className={styles.emblem} aria-hidden="true"><ShieldCheck size={18} /></span>
          <div>
            <p className={styles.heading}>{heading}</p>
            <p className={styles.motto}>{motto}</p>
          </div>
        </div>
        <span className={`${styles.status} ${active ? "" : styles.statusOff}`}>{statusLabel}</span>
      </div>

      <div className={styles.body}>
        <div className={styles.qrTile}>
          {qr ? (
            <img className={styles.qr} src={qr} alt={qrAlt} width={132} height={132} data-testid={qrTestId} />
          ) : (
            <div className={styles.qrEmpty}>{qrAlt}</div>
          )}
        </div>
        <div>
          <p className={styles.codeLabel}>{codeLabel}</p>
          <p className={`${styles.code} ${codeClassName ?? ""}`} data-testid={codeTestId}>{code}</p>
          {meta && <p className={styles.meta}>{meta}</p>}
        </div>
      </div>

      <ul className={styles.prefs}>
        {prefs.map((pref) => {
          const Icon = ICONS[pref.key];
          return (
            <li className={styles.pref} key={pref.key}>
              <span className={styles.prefLabel}><Icon size={13} aria-hidden="true" /> {pref.label}</span>
              <span className={styles.prefValue}>{pref.value}</span>
            </li>
          );
        })}
      </ul>

      <p className={styles.mrz} aria-hidden="true">{passportMrz(code, language, version)}</p>
    </figure>
  );
}
