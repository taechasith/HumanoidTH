"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Copy, Lock, Pencil, Share2, ShieldCheck, Trash2, X } from "lucide-react";
import { describeDistance } from "@/lib/hri/passport";
import { shouldForgetEditKey } from "@/lib/hri/passport-owner";
import PassportCardVisual from "../../PassportCardVisual";
import { deletePassportAction, getOwnerViewAction, updatePassportAction } from "../../actions";
import { cardCopy, type CardLang } from "../copy";
import styles from "../passport.module.css";

export type CardPassport = {
  passport: {
    code: string;
    greeting: string;
    comfortDistance: number;
    speed: number;
    gaze: string;
    voice: boolean;
    language: string;
    captions: string;
    speechPace: string;
    noReach: boolean;
    status: "active" | "revoked" | "expired";
    version: number;
    createdAtLabel: string;
    updatedAtLabel: string;
    expiresAtLabel: string | null;
  };
};

type OwnerValues = { nickname: string | null; anxiety: "low" | "medium" | "high" };

type FormValues = {
  nickname: string;
  greeting: "wai" | "wave" | "none";
  comfortDistance: number;
  speed: number;
  gaze: "direct" | "soft";
  voice: boolean;
  language: "th" | "en";
  anxiety: "low" | "medium" | "high";
  captions: "normal" | "large";
  speechPace: "normal" | "slow";
  noReach: boolean;
};

const asGreeting = (v: string): FormValues["greeting"] => (v === "wave" || v === "none" ? v : "wai");
const asGaze = (v: string): FormValues["gaze"] => (v === "direct" ? "direct" : "soft");
const asAnxiety = (v: string): FormValues["anxiety"] =>
  v === "medium" || v === "high" ? v : "low";

function formFrom(p: CardPassport["passport"], owner: OwnerValues | null): FormValues {
  return {
    nickname: owner?.nickname ?? "",
    greeting: asGreeting(p.greeting),
    comfortDistance: p.comfortDistance,
    speed: p.speed,
    gaze: asGaze(p.gaze),
    voice: p.voice,
    language: p.language === "en" ? "en" : "th",
    anxiety: owner?.anxiety ?? "low",
    captions: p.captions === "large" ? "large" : "normal",
    speechPace: p.speechPace === "slow" ? "slow" : "normal",
    noReach: p.noReach
  };
}

function formatStamp(value: string | Date, lang: CardLang) {
  return new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(new Date(value));
}

function Seg<T extends string | boolean>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.seg} role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={value === option.value}
            className={`${styles.segBtn} ${value === option.value ? styles.segBtnSel : ""}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PassportCardClient({ lang, token, passport }: { lang: CardLang; token: string; passport: CardPassport["passport"] }) {
  const t = cardCopy[lang];
  const storageKey = `hri-passport-edit:${token}`;
  const [live, setLive] = useState(passport);
  const [owner, setOwner] = useState<OwnerValues | null>(null);
  const [access, setAccess] = useState<"checking" | "read_only" | "owner">("checking");
  const [editKey, setEditKey] = useState<string | null>(null);
  const [unlockKey, setUnlockKey] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormValues>(() => formFrom(passport, null));
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const errorText = (error: string) => {
    if (error === "rate_limited") return t.rateLimited;
    if (error === "invalid") return t.invalid;
    return t.notFound;
  };
  // Unlocking always fails the same way, whether the key is wrong or the passport is gone:
  // never confirm which half of the credentials was right.
  const unlockErrorText = (error: string) => (error === "rate_limited" ? t.rateLimited : t.wrongKey);
  const anxietyLabel = (value: string) =>
    value === "high" ? t.anxietyHigh : value === "medium" ? t.anxietyMedium : t.anxietyLow;
  const cardUrl = () => `${window.location.origin}/living-lab/passport/${token}`;

  // The card is public (anyone with the QR may view it). Owner data is only fetched after the
  // edit token in this browser has been verified by the server action.
  useEffect(() => {
    let alive = true;
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(storageKey); } catch { stored = null; }
    if (!stored) { setAccess("read_only"); return; }
    setEditKey(stored);
    getOwnerViewAction(token, stored)
      .then((res) => {
        if (!alive) return;
        if (res.ok) {
          const verified: OwnerValues = { nickname: res.owner.nickname, anxiety: asAnxiety(res.owner.anxiety) };
          setOwner(verified);
          setAccess("owner");
          setForm(formFrom(passport, verified));
        } else {
          setAccess("read_only");
          setUnlockError(unlockErrorText(res.error));
          if (shouldForgetEditKey(res.error)) {
            try { window.localStorage.removeItem(storageKey); } catch { /* private mode */ }
          }
        }
      })
      .catch(() => {
        if (!alive) return;
        setAccess("read_only");
        setUnlockError(cardCopy[lang].wrongKey);
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, storageKey, lang]);

  // The QR encodes this card's own URL, so scanning it opens the same passport anywhere.
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(`${window.location.origin}/living-lab/passport/${token}`, {
      margin: 1,
      width: 240,
      color: { dark: "#07150f", light: "#ffffff" }
    })
      .then((data) => { if (alive) setQr(data); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [token]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(cardUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable: the URL is in the address bar anyway */ }
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: t.title, text: t.subtitle, url: cardUrl() });
        return;
      }
      await copyLink();
    } catch { /* user cancelled the share sheet */ }
  }

  async function unlock(event: FormEvent) {
    event.preventDefault();
    const key = unlockKey.trim();
    if (!key || unlocking) return;
    setUnlocking(true);
    setUnlockError(null);
    try {
      const res = await getOwnerViewAction(token, key);
      if (res.ok) {
        const verified: OwnerValues = { nickname: res.owner.nickname, anxiety: asAnxiety(res.owner.anxiety) };
        setOwner(verified);
        setEditKey(key);
        setAccess("owner");
        setUnlockKey("");
        setForm(formFrom(live, verified));
        try { window.localStorage.setItem(storageKey, key); } catch { /* private mode */ }
      } else {
        setUnlockError(unlockErrorText(res.error));
      }
    } catch {
      setUnlockError(t.wrongKey);
    }
    setUnlocking(false);
  }

  function startEdit() {
    setForm(formFrom(live, owner));
    setSaveMsg(null);
    setSaveError(null);
    setConfirmDelete(false);
    setEditing(true);
  }

  async function save() {
    if (!editKey || saving) return;
    setSaving(true);
    setSaveMsg(null);
    setSaveError(null);
    const patch = { ...form, nickname: form.nickname.trim() || null };
    try {
      const res = await updatePassportAction(token, editKey, patch);
      if (res.ok) {
        setLive((prev) => ({
          ...prev,
          greeting: form.greeting,
          comfortDistance: form.comfortDistance,
          speed: form.speed,
          gaze: form.gaze,
          voice: form.voice,
          language: form.language,
          captions: form.captions,
          speechPace: form.speechPace,
          noReach: form.noReach,
          version: res.version,
          updatedAtLabel: formatStamp(res.updatedAt, lang)
        }));
        setOwner({ nickname: patch.nickname, anxiety: form.anxiety });
        setSaveMsg(t.saved(res.version));
        setEditing(false);
      } else {
        setSaveError(errorText(res.error));
      }
    } catch {
      setSaveError(t.rateLimited);
    }
    setSaving(false);
  }

  async function remove() {
    if (!editKey || deleting) return;
    setDeleting(true);
    setSaveError(null);
    try {
      const res = await deletePassportAction(token, editKey);
      if (res.ok) {
        setDeleted(true);
        try { window.localStorage.removeItem(storageKey); } catch { /* private mode */ }
      } else {
        setSaveError(errorText(res.error));
      }
    } catch {
      setSaveError(t.rateLimited);
    }
    setDeleting(false);
  }

  if (deleted) {
    return (
      <main className={styles.page}>
        <section className={styles.screen} data-testid="passport-deleted">
          <h1>{t.deletedTitle}</h1>
          <p>{t.deletedBody}</p>
          <p><Link className={styles.btn} href="/living-lab">{t.backToLab}</Link></p>
        </section>
      </main>
    );
  }

  const statusLabel = live.status === "active" ? t.active : live.status === "revoked" ? t.revoked : t.expired;
  const speedBand = live.speed < 0.9 ? t.slow : live.speed > 1.1 ? t.fast : t.normal;
  // The five interaction preferences every robot adapts to, then the care and communication extras.
  const corePrefs = [
    { key: "distance", label: t.distance, value: describeDistance(live.comfortDistance)[lang] },
    { key: "speed", label: t.speed, value: `×${live.speed.toFixed(2)} · ${speedBand}` },
    { key: "gaze", label: t.gaze, value: live.gaze === "direct" ? t.direct : t.soft },
    { key: "language", label: t.language, value: live.language === "th" ? t.thai : t.english },
    { key: "speech", label: t.speaking, value: live.speechPace === "slow" ? t.slow : t.normal }
  ] as const;
  const carePrefs = [
    { label: t.voice, value: live.voice ? t.spoken : t.textOnly },
    { label: t.captions, value: live.captions === "large" ? t.large : t.normal },
    { label: t.handover, value: live.noReach ? t.placeNearby : t.handToPerson },
    { label: t.greeting, value: live.greeting === "wave" ? t.wave : live.greeting === "none" ? t.noGreeting : t.wai }
  ];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
        </div>
        <div className={styles.badges}>
          <span
            className={`${styles.badge} ${live.status === "active" ? styles.badgeActive : styles.badgeMuted}`}
            data-testid="passport-status"
          >
            {statusLabel}
          </span>
        </div>
      </header>

      <section className={styles.hero}>
        <PassportCardVisual
          heading={t.cardHeading}
          motto={t.cardMotto}
          code={live.code}
          codeLabel={t.codeLabel}
          qr={qr}
          qrAlt={t.scanLabel}
          statusLabel={statusLabel}
          active={live.status === "active"}
          prefs={corePrefs.map((p) => ({ ...p }))}
          language={live.language}
          version={live.version}
          meta={t.cardMeta(live.version, live.updatedAtLabel)}
          codeTestId="passport-code"
          qrTestId="passport-qr"
        />

        <aside className={styles.aside}>
          <p className={styles.scanLabel}>{t.scanLabel}</p>
          <div className={styles.actions}>
            <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={copyLink}>
              <Copy size={16} aria-hidden="true" /> {copied ? t.copied : t.copyLink}
            </button>
            <button type="button" className={styles.btn} onClick={share}>
              <Share2 size={16} aria-hidden="true" /> {t.share}
            </button>
          </div>
          <h2 className={styles.statusTitle}>{t.statusTitle}</h2>
          <dl className={styles.statusList}>
            <div><dt>{t.statusTitle}</dt><dd>{statusLabel}</dd></div>
            <div><dt>{t.version}</dt><dd data-testid="passport-version">{live.version}</dd></div>
            <div><dt>{t.created}</dt><dd>{live.createdAtLabel}</dd></div>
            <div><dt>{t.updated}</dt><dd>{live.updatedAtLabel}</dd></div>
            <div><dt>{t.expires}</dt><dd>{live.expiresAtLabel ?? t.noExpiry}</dd></div>
          </dl>
        </aside>
      </section>

      <section className={styles.card} aria-labelledby="robot-reads">
        <h2 id="robot-reads" className={styles.sectionTitle}>{t.prefsTitle}</h2>
        <div className={styles.groups}>
          <div>
            <h3 className={styles.groupTitle}>{t.groupCore}</h3>
            <dl className={styles.prefs}>
              {corePrefs.map((pref) => (
                <div className={styles.fact} key={pref.key}><dt>{pref.label}</dt><dd>{pref.value}</dd></div>
              ))}
            </dl>
          </div>
          <div>
            <h3 className={styles.groupTitle}>{t.groupCare}</h3>
            <dl className={styles.prefs}>
              {carePrefs.map((pref) => (
                <div className={styles.fact} key={pref.label}><dt>{pref.label}</dt><dd>{pref.value}</dd></div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className={styles.owner} data-testid="owner-section">
        <div className={styles.ownerHead}>
          <h2><ShieldCheck size={18} aria-hidden="true" /> {t.ownerTitle}</h2>
          <span className={`${styles.badge} ${access === "owner" ? styles.badgeOwner : styles.badgeMuted}`}>
            {access === "owner" ? t.ownerBadge : t.readOnly}
          </span>
        </div>

        {access === "checking" && <p className={styles.note}>{t.checking}</p>}

        {access === "read_only" && (
          <>
            <p className={styles.note}>{t.readOnlyHint}</p>
            <form className={styles.unlock} onSubmit={unlock}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>{t.editKeyLabel}</span>
                <input
                  className={styles.input}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={unlockKey}
                  onChange={(e) => setUnlockKey(e.target.value)}
                  placeholder={t.editKeyPlaceholder}
                  data-testid="edit-key-input"
                />
              </label>
              <button className={styles.btn} type="submit" disabled={unlocking || !unlockKey.trim()} data-testid="unlock-button">
                <Lock size={16} aria-hidden="true" /> {unlocking ? t.checking : t.unlock}
              </button>
            </form>
            {unlockError && <p className={styles.error} role="alert">{unlockError}</p>}
          </>
        )}

        {access === "owner" && owner && (
          <>
            <p className={styles.ownerHint}>{t.ownerHint}</p>

            {!editing && (
              <>
                <dl className={styles.facts}>
                  <div className={styles.fact}><dt>{t.nickname}</dt><dd data-testid="owner-nickname">{owner.nickname || "—"}</dd></div>
                  <div className={styles.fact}><dt>{t.anxiety}</dt><dd data-testid="owner-anxiety">{anxietyLabel(owner.anxiety)}</dd></div>
                </dl>
                {saveMsg && <p className={styles.ok} role="status">{saveMsg}</p>}
                {saveError && <p className={styles.error} role="alert">{saveError}</p>}
                <div className={styles.row}>
                  <button className={`${styles.btn} ${styles.primary}`} onClick={startEdit} data-testid="edit-button">
                    <Pencil size={16} aria-hidden="true" /> {t.edit}
                  </button>
                  <button className={`${styles.btn} ${styles.danger}`} onClick={() => setConfirmDelete(true)} data-testid="delete-button">
                    <Trash2 size={16} aria-hidden="true" /> {t.delete}
                  </button>
                </div>
              </>
            )}

            {editing && (
              <>
                <div className={styles.form}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{t.nickname}</span>
                    <input
                      className={styles.input}
                      maxLength={40}
                      value={form.nickname}
                      onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                      placeholder={t.nicknamePlaceholder}
                      data-testid="nickname-input"
                    />
                  </label>

                  <Seg
                    label={t.anxiety}
                    value={form.anxiety}
                    options={[
                      { value: "low", label: t.anxietyLow },
                      { value: "medium", label: t.anxietyMedium },
                      { value: "high", label: t.anxietyHigh }
                    ] as const}
                    onChange={(value) => setForm({ ...form, anxiety: value })}
                  />

                  <div className={styles.field}>
                    <div className={styles.fieldTop}>
                      <span className={styles.fieldLabel}>{t.distance}</span>
                      <span className={styles.value}>{describeDistance(form.comfortDistance)[lang]} · {form.comfortDistance.toFixed(1)}</span>
                    </div>
                    <input
                      className={styles.range}
                      type="range"
                      min={-3}
                      max={1.8}
                      step={0.1}
                      value={form.comfortDistance}
                      onChange={(e) => setForm({ ...form, comfortDistance: Number(e.target.value) })}
                      aria-label={t.distance}
                      data-testid="distance-input"
                    />
                    <span className={styles.hint}>{t.editHintDistance}</span>
                  </div>

                  <div className={styles.field}>
                    <div className={styles.fieldTop}>
                      <span className={styles.fieldLabel}>{t.speed}</span>
                      <span className={styles.value}>×{form.speed.toFixed(2)}</span>
                    </div>
                    <input
                      className={styles.range}
                      type="range"
                      min={0.25}
                      max={2}
                      step={0.05}
                      value={form.speed}
                      onChange={(e) => setForm({ ...form, speed: Number(e.target.value) })}
                      aria-label={t.speed}
                      data-testid="speed-input"
                    />
                    <span className={styles.hint}>{t.editHintSpeed}</span>
                  </div>

                  <Seg
                    label={t.gaze}
                    value={form.gaze}
                    options={[{ value: "direct", label: t.direct }, { value: "soft", label: t.soft }] as const}
                    onChange={(value) => setForm({ ...form, gaze: value })}
                  />

                  <Seg
                    label={t.language}
                    value={form.language}
                    options={[{ value: "th", label: t.thai }, { value: "en", label: t.english }] as const}
                    onChange={(value) => setForm({ ...form, language: value })}
                  />

                  <Seg
                    label={t.speaking}
                    value={form.speechPace}
                    options={[{ value: "normal", label: t.normal }, { value: "slow", label: t.slow }] as const}
                    onChange={(value) => setForm({ ...form, speechPace: value })}
                  />

                  <Seg
                    label={t.voice}
                    value={form.voice}
                    options={[{ value: true, label: t.spoken }, { value: false, label: t.textOnly }] as const}
                    onChange={(value) => setForm({ ...form, voice: value })}
                  />

                  <Seg
                    label={t.captions}
                    value={form.captions}
                    options={[{ value: "normal", label: t.normal }, { value: "large", label: t.large }] as const}
                    onChange={(value) => setForm({ ...form, captions: value })}
                  />

                  <Seg
                    label={t.handover}
                    value={form.noReach}
                    options={[{ value: false, label: t.handToPerson }, { value: true, label: t.placeNearby }] as const}
                    onChange={(value) => setForm({ ...form, noReach: value })}
                  />

                  <Seg
                    label={t.greeting}
                    value={form.greeting}
                    options={[
                      { value: "wai", label: t.wai },
                      { value: "wave", label: t.wave },
                      { value: "none", label: t.noGreeting }
                    ] as const}
                    onChange={(value) => setForm({ ...form, greeting: value })}
                  />
                </div>

                {saveError && <p className={styles.error} role="alert">{saveError}</p>}
                <div className={styles.row}>
                  <button className={`${styles.btn} ${styles.primary}`} onClick={save} disabled={saving} data-testid="save-button">
                    {saving ? t.saving : t.save}
                  </button>
                  <button className={styles.btn} onClick={() => setEditing(false)} disabled={saving}>
                    <X size={16} aria-hidden="true" /> {t.cancel}
                  </button>
                </div>
              </>
            )}

            {confirmDelete && !editing && (
              <div className={styles.dangerZone}>
                <h3>{t.dangerTitle}</h3>
                <p className={styles.note}>{t.dangerHint}</p>
                <div className={styles.row}>
                  <button className={`${styles.btn} ${styles.danger}`} onClick={remove} disabled={deleting} data-testid="delete-confirm">
                    <Trash2 size={16} aria-hidden="true" /> {deleting ? t.saving : t.deleteConfirm}
                  </button>
                  <button className={styles.btn} onClick={() => setConfirmDelete(false)} disabled={deleting}>
                    <X size={16} aria-hidden="true" /> {t.keep}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
