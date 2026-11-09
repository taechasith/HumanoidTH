"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BadgeCheck, CircleDashed, Hand, MoveDown, Play, RotateCcw, ShieldCheck } from "lucide-react";
import RobotStage from "@/app/components/robot/RobotStage";
import { adapt } from "@/lib/hri/adapt";
import type { Hue, RobotBehavior, RobotEvent } from "@/lib/hri/behavior-engine";
import { describeDistance } from "@/lib/hri/passport";
import { toPublicProfile } from "@/lib/hri/public-profile";
import { ROBOT_PROFILES } from "@/lib/hri/robot-profiles";
import { recordMeetingAction } from "../../actions";

export type StationTask = "reception" | "delivery" | "telepresence";
export type Station = { task: StationTask; robotId: string; name: string; type: string; org: string | null };

type Passport = {
  code: string;
  greeting: string;
  comfortDistance: number;
  speed: number;
  gaze: string;
  voice: boolean;
  language: string;
  calm: boolean;
  captions: "normal" | "large";
  speechPace: "normal" | "slow";
  noReach: boolean;
};
type LogEvent = { t: number; src: "robot" | "human"; type: string; [key: string]: unknown };
type Mode = "passport" | "default";
type SavedStation = { mode: Mode; comfort: number };

const START_DISTANCE = -2.6;
// What a robot does without a passport: waves, walks up close at full speed, holds eye contact.
const DEFAULT_BEHAVIOUR = { distance: 1.3, speed: 1.4, gaze: "direct", greeting: "wave", voice: true } as const;
// The meet flow has no persisted profile to show, so it reuses one fixed timestamp for adaptation.
const PROFILE_TIME = new Date(0);
const CARE_ROBOT = ROBOT_PROFILES[0];

function hueFor(type: string): Hue {
  if (/hospital|medical|therapy/i.test(type)) return "blue";
  if (/elder|care|companion/i.test(type)) return "amber";
  if (/rehab|assist/i.test(type)) return "green";
  return "teal";
}

const ui = {
  en: {
    eyebrow: "Care Passport hospital journey",
    stationOf: (i: number, n: number) => `Station ${i} of ${n}`,
    journey: "Your hospital journey",
    from: "From the atlas robot registry",
    start: "Start station",
    replay: "Replay",
    withPassport: "With your Care Passport",
    withoutPassport: "Compare: default robot (no passport)",
    appliedTitle: "What this robot read from your passport",
    defaultTitle: "Default behaviour (no passport)",
    greeting: "Greeting", distance: "Stops at", speed: "Movement", gaze: "Eye contact", voice: "Voice",
    wai: "wai + bow", wave: "wave", noGreeting: "no gesture", slow: "slower", normal: "normal", fast: "fast",
    soft: "soft", direct: "direct", on: "spoken", off: "text only",
    accessibility: "slower speech + large text",
    reach: "may reach to hand items", noReach: "never reaches, places items nearby",
    tooClose: "Too close", tooFar: "Too far",
    rateTitle: "How did that station feel?",
    rateHint: "1 = very uncomfortable · 5 = very comfortable",
    rateLow: "Uncomfortable", rateHigh: "Comfortable",
    save: "Save station", saved: "Saved to the Living Lab.",
    saveRateLimited: "Too many tries from this network. Please wait a few minutes, then press Save again.",
    saveNotFound: "This passport no longer exists, so the rating could not be saved.",
    saveFailed: "The rating could not be saved. Please press Save again.",
    next: "Next station", finish: "Finish journey",
    doneTitle: "Journey complete",
    doneBody: "Every care robot in this journey read your Care Passport. Compare the same stations with a default robot to see the difference.",
    avg: "Your average comfort rating",
    back: "Back to the Living Lab",
    ready: "Press start. The robot will read your Care Passport first.",
    empty: "No care robots from the registry were found. Please seed the atlas and try again.",
    robotLabel: "Robot"
  },
  th: {
    eyebrow: "เส้นทางโรงพยาบาลด้วย Care Passport",
    stationOf: (i: number, n: number) => `สถานี ${i} จาก ${n}`,
    journey: "เส้นทางในโรงพยาบาลของคุณ",
    from: "จาก robot registry ของ Atlas",
    start: "เริ่มสถานี",
    replay: "เล่นอีกครั้ง",
    withPassport: "ใช้ Care Passport ของคุณ",
    withoutPassport: "เปรียบเทียบ: หุ่นแบบปกติ (ไม่ใช้พาสปอร์ต)",
    appliedTitle: "สิ่งที่หุ่นอ่านจากพาสปอร์ตของคุณ",
    defaultTitle: "พฤติกรรมปกติ (ไม่มีพาสปอร์ต)",
    greeting: "การทักทาย", distance: "หยุดที่ระยะ", speed: "ความเร็ว", gaze: "การสบตา", voice: "เสียง",
    wai: "ไหว้ + ก้มตัว", wave: "โบกมือ", noGreeting: "ไม่แสดงท่าทาง", slow: "ช้าลง", normal: "ปกติ", fast: "เร็ว",
    soft: "หลบสายตาเล็กน้อย", direct: "มองตรง", on: "พูดออกเสียง", off: "ข้อความอย่างเดียว",
    accessibility: "พูดช้าลง + ตัวอักษรใหญ่",
    reach: "ยื่นของถึงมือได้", noReach: "ไม่ยื่นมือ วางของไว้ใกล้ ๆ",
    tooClose: "ใกล้ไป", tooFar: "ไกลไป",
    rateTitle: "สถานีนี้รู้สึกอย่างไรบ้าง",
    rateHint: "1 = ไม่สบายใจเลย · 5 = สบายใจมาก",
    rateLow: "ไม่สบายใจ", rateHigh: "สบายใจ",
    save: "บันทึกสถานี", saved: "บันทึกสถานีลง Living Lab แล้ว",
    saveRateLimited: "เครือข่ายนี้ลองหลายครั้งเกินไป กรุณารอสักครู่ แล้วกดบันทึกอีกครั้ง",
    saveNotFound: "พาสปอร์ตนี้ไม่มีอยู่แล้ว จึงบันทึกคะแนนไม่ได้",
    saveFailed: "บันทึกคะแนนไม่สำเร็จ กรุณากดบันทึกอีกครั้ง",
    next: "สถานีถัดไป", finish: "จบเส้นทาง",
    doneTitle: "จบเส้นทางแล้ว",
    doneBody: "หุ่นดูแลทุกตัวในเส้นทางนี้อ่าน Care Passport ของคุณ ลองเปรียบเทียบสถานีเดิมกับหุ่นแบบปกติเพื่อดูความต่าง",
    avg: "คะแนนความสบายใจเฉลี่ยของคุณ",
    back: "กลับไป Living Lab",
    ready: "กดเริ่ม หุ่นจะอ่าน Care Passport ของคุณก่อน",
    empty: "ไม่พบหุ่นดูแลใน registry กรุณา seed ข้อมูล atlas แล้วลองอีกครั้ง",
    robotLabel: "หุ่นยนต์"
  }
};

type StationCopy = { title: string; short: string; intro: (name: string) => string; action: string; actionNoReach?: string };

const stationCopy: Record<"en" | "th", Record<StationTask, StationCopy>> = {
  en: {
    reception: {
      title: "Reception & check-in",
      short: "The robot confirms your appointment and points you to the right clinic.",
      intro: (name: string) => `Welcome. I am ${name}. I will check you in for your appointment.`,
      action: "Your appointment is confirmed. Please follow the green line to the clinic."
    },
    delivery: {
      title: "Medicine delivery",
      short: "The robot brings your medicine to your bedside.",
      intro: (name: string) => `Hello. I am ${name}. I have brought your medicine.`,
      action: "Please take your medicine with water.",
      actionNoReach: "I will place your medicine on the tray beside you."
    },
    telepresence: {
      title: "Doctor video call",
      short: "The robot connects your doctor's video call and gives you privacy.",
      intro: (name: string) => `I am ${name}. I will connect your doctor's video call.`,
      action: "The doctor is on screen now. I will step aside for your privacy."
    }
  },
  th: {
    reception: {
      title: "คัดกรองและลงทะเบียน",
      short: "หุ่นยืนยันนัดหมายและบอกทางไปห้องตรวจ",
      intro: (name: string) => `ยินดีต้อนรับครับ ผมชื่อ ${name} ผมจะลงทะเบียนนัดหมายให้คุณครับ`,
      action: "ยืนยันนัดหมายแล้วครับ กรุณาเดินตามเส้นสีเขียวไปที่ห้องตรวจ"
    },
    delivery: {
      title: "ส่งยา",
      short: "หุ่นนำยามาส่งที่เตียงของคุณ",
      intro: (name: string) => `สวัสดีครับ ผมชื่อ ${name} ผมนำยามาส่งครับ`,
      action: "กรุณารับยาพร้อมน้ำครับ",
      actionNoReach: "ผมจะวางยาไว้บนถาดข้าง ๆ คุณครับ"
    },
    telepresence: {
      title: "ต่อสายหาหมอ",
      short: "หุ่นต่อสายวิดีโอคอลกับหมอและเปิดพื้นที่ส่วนตัวให้คุณ",
      intro: (name: string) => `ผมชื่อ ${name} ครับ ผมจะต่อสายวิดีโอคอลกับหมอให้ครับ`,
      action: "หมออยู่บนจอแล้วครับ ผมจะถอยออกไปให้ความเป็นส่วนตัว"
    }
  }
};

export default function MeetClient({
  lang,
  passport,
  stations,
  startIndex
}: {
  lang: "en" | "th";
  passport: Passport;
  stations: Station[];
  startIndex: number;
}) {
  const t = ui[lang];
  const voiceLang = (passport.language === "th" ? "th" : "en") as "th" | "en";
  const largeText = passport.captions === "large";
  const [current, setCurrent] = useState(() => Math.min(Math.max(0, startIndex), Math.max(0, stations.length - 1)));
  const station = stations[current] ?? null;
  const copy = station ? stationCopy[lang][station.task] : null;

  // The robot's behaviour comes from the passport through the same adapter the robot console uses.
  // The server already capped the speed (toJourneyPassport), so only the calm demeanour is left to derive.
  const profile = toPublicProfile({
    ...passport,
    anxiety: passport.calm ? "high" : "low",
    status: "active",
    version: 1,
    updatedAt: PROFILE_TIME,
    expiresAt: null
  });
  const plan = adapt(profile, CARE_ROBOT);
  const careBehaviour = {
    distance: plan.distance.sceneUnits,
    speed: plan.movement.multiplier,
    gaze: plan.eyeContact,
    greeting: plan.greeting,
    voice: plan.voice,
    hue: (passport.calm ? "blue" : hueFor(station?.type ?? "")) as Hue,
    expression: (plan.demeanor === "calm" ? "calm" : "happy") as "calm" | "happy"
  };

  const robotRef = useRef<RobotBehavior | null>(null);
  const timers = useRef<number[]>([]);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("passport");
  const [applied, setApplied] = useState<string[]>([]);
  const [bubble, setBubble] = useState<string>(t.ready);
  const [log, setLog] = useState<LogEvent[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedStations, setSavedStations] = useState<Record<number, SavedStation>>({});
  const [running, setRunning] = useState(false);
  const [comfort, setComfort] = useState<number | null>(null);
  const adjustments = useRef({ tooClose: 0, tooFar: 0 });

  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  useEffect(() => () => { clearTimers(); window.speechSynthesis?.cancel(); }, []);

  // Moving to another station resets the stage and the station's own state.
  useEffect(() => {
    clearTimers();
    setApplied([]);
    setSaved(false);
    setComfort(null);
    setRunning(false);
    setReady(false);
    setMode("passport");
    adjustments.current = { tooClose: 0, tooFar: 0 };
    setBubble(t.ready);
    window.speechSynthesis?.cancel();
  }, [current, t.ready]);

  const record = useCallback((e: LogEvent) => setLog((prev) => [...prev.slice(-299), e]), []);
  const onRobotEvent = useCallback((e: RobotEvent) => record({ ...e, src: "robot" }), [record]);
  const human = (type: string, detail: Record<string, unknown> = {}) => record({ t: +(robotRef.current?.time ?? 0).toFixed(3), src: "human", type, ...detail });

  const behaviour = mode === "passport" ? careBehaviour : DEFAULT_BEHAVIOUR;

  const say = (text: string, voiceOn: boolean) => {
    setBubble(text);
    if (voiceOn && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = voiceLang === "th" ? "th-TH" : "en-US";
      u.rate = passport.speechPace === "slow" ? 0.8 : careBehaviour.speed < 1 ? 0.88 : 1;
      window.speechSynthesis.speak(u);
    }
  };

  const onReady = useCallback((r: RobotBehavior) => {
    robotRef.current = r;
    r.bothArms("relaxed");
    r.setDistance(START_DISTANCE);
    r.setGlow(0.6, hueFor(station?.type ?? ""));
    r.expression("neutral");
    r.snap();
    setReady(true);
  }, [station?.type]);

  function run(nextMode: Mode = mode) {
    const r = robotRef.current;
    if (!r || !station || !copy) return;
    clearTimers();
    window.speechSynthesis?.cancel();
    setMode(nextMode);
    setApplied([]);
    setComfort(null);
    setSaved(false);
    setSaveError(null);
    setRunning(true);
    adjustments.current = { tooClose: 0, tooFar: 0 };
    const b = nextMode === "passport" ? careBehaviour : DEFAULT_BEHAVIOUR;
    human("station_start", { task: station.task, mode: nextMode, robot: station.name });
    if (nextMode === "default") human("passport_not_read", { code: passport.code });

    // Reset to a neutral start, far away.
    r.clearGestures();
    r.setSpeed(1);
    r.bothArms("relaxed");
    r.lean("upright");
    r.setDistance(START_DISTANCE);
    r.lookAt(0, 0.2);
    r.expression("neutral");
    r.setGlow(0.6, hueFor(station.type));

    const mark = (key: string) => setApplied((prev) => [...prev, key]);
    let at = 600;
    if (nextMode === "passport") { say(t.robotLabel + " · " + (lang === "th" ? "กำลังอ่าน Care Passport ของคุณ…" : "Reading your Care Passport…"), b.voice); at = 1500; }

    later(at, () => {
      r.setSpeed(b.speed); mark("speed");
      if (b.greeting === "wai") {
        r.bothArms("wai"); r.expression("calm");
        later(500, () => r.bow(0.36, 1.7));
        later(2600, () => { r.bothArms("relaxed"); r.expression(nextMode === "passport" ? careBehaviour.expression : "happy"); });
      } else if (b.greeting === "wave") {
        r.wave("R", 2.4); r.expression("happy");
      } else {
        // The person asked for no gesture: stay relaxed and greet with the voice only.
        r.bothArms("relaxed"); r.expression(nextMode === "passport" ? careBehaviour.expression : "happy");
      }
      say(copy.intro(station.name), b.voice);
      mark("greeting"); mark("voice");
    });
    later(at + 3200, () => {
      r.setDistance(b.distance);
      if (b.gaze === "soft") r.lookAt(0.25, 0.35); else r.lookAt(0, 0);
      mark("distance"); mark("gaze");
    });
    later(at + 3200 + 3000 / b.speed, () => {
      // The station task itself.
      if (station.task === "delivery") {
        if (nextMode === "passport" && passport.noReach) {
          r.moveArm("R", "relaxed"); r.lean("forward");
          later(900, () => r.lean("upright"));
          say(copy.actionNoReach ?? copy.action, b.voice);
          mark("care");
        } else {
          r.moveArm("R", "offer"); r.expression("happy");
          later(2600, () => r.moveArm("R", "relaxed"));
          say(copy.action, b.voice);
        }
      } else if (station.task === "reception") {
        r.moveArm("R", "point"); r.expression("happy");
        later(2200, () => r.moveArm("R", "relaxed"));
        say(copy.action, b.voice);
      } else {
        r.moveArm("R", "point"); r.expression("happy");
        later(1400, () => { r.bothArms("relaxed"); r.lean("upright"); });
        say(copy.action, b.voice);
      }
      mark("task");
    });
    later(at + 3200 + 3000 / b.speed + 3000 / b.speed, () => {
      r.nod(1);
      if (nextMode === "passport") mark("care");
      setRunning(false);
    });
  }

  function adjust(kind: "too_close" | "too_far") {
    const r = robotRef.current;
    if (!r) return;
    human(kind, { distance: +r.state.distanceTarget.toFixed(2), mode });
    if (kind === "too_close") {
      adjustments.current.tooClose++;
      r.setDistance(r.state.distanceTarget - 0.7); r.moveArm("R", "handOnChest"); r.expression("sorry"); r.lean("back");
      later(1600, () => { r.lean("upright"); r.moveArm("R", "relaxed"); r.expression("neutral"); });
      say(lang === "th" ? "ขอโทษครับ ผมถอยออกมาแล้ว" : "Sorry, I have stepped back.", behaviour.voice);
    } else {
      adjustments.current.tooFar++;
      r.setDistance(r.state.distanceTarget + 0.6); r.expression("happy");
      say(lang === "th" ? "ได้ครับ ผมจะเข้าไปใกล้อีกนิด" : "Okay, I will come a little closer.", behaviour.voice);
    }
  }

  async function saveStation() {
    if (!station || comfort === null) return;
    const r = robotRef.current;
    setSaving(true);
    setSaveError(null);
    try {
      // Care needs stay on the passport only (data minimisation); the server also strips them.
      const result = await recordMeetingAction(passport.code, {
        protocol: "care_journey_station",
        inputMode: "buttons",
        robotModelId: station.robotId,
        events: log.slice(-250),
        summary: {
          mode,
          task: station.task,
          robot: station.name,
          comfort,
          tooClose: adjustments.current.tooClose,
          tooFar: adjustments.current.tooFar,
          finalDistance: r ? +r.state.distanceTarget.toFixed(2) : null
        }
      });
      if (!result.ok) {
        setSaveError(result.error === "rate_limited" ? t.saveRateLimited : result.error === "not_found" ? t.saveNotFound : t.saveFailed);
        return;
      }
      setSaved(true);
      setSavedStations((prev) => ({ ...prev, [current]: { mode, comfort } }));
      human("station_saved", { task: station.task, mode, comfort });
    } catch {
      setSaveError(t.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  function goNext() {
    if (current < stations.length - 1) {
      setCurrent((i) => i + 1);
    }
  }

  const rows: { key: string; label: string; value: string }[] = [
    { key: "greeting", label: t.greeting, value: behaviour.greeting === "wai" ? t.wai : behaviour.greeting === "wave" ? t.wave : t.noGreeting },
    { key: "distance", label: t.distance, value: describeDistance(behaviour.distance)[lang] },
    { key: "speed", label: t.speed, value: behaviour.speed < 1 ? t.slow : behaviour.speed > 1 ? t.fast : t.normal },
    { key: "gaze", label: t.gaze, value: behaviour.gaze === "soft" ? t.soft : t.direct },
    { key: "voice", label: t.voice, value: behaviour.voice ? t.on : t.off }
  ];
  const careRows: { key: string; label: string; value: string }[] = [
    { key: "accessibility", label: lang === "th" ? "การสื่อสาร" : "Communication", value: passport.captions === "large" || passport.speechPace === "slow" ? t.accessibility : t.normal },
    { key: "reach", label: lang === "th" ? "การยื่นของ" : "Handing items", value: passport.noReach ? t.noReach : t.reach }
  ];

  const savedCount = Object.keys(savedStations).length;
  const done = stations.length > 0 && savedCount >= stations.length;
  const average = savedCount
    ? Object.values(savedStations).reduce((sum, s) => sum + s.comfort, 0) / savedCount
    : null;

  if (!station || !copy) {
    return (
      <main style={{ display: "grid", gap: 16 }}>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <h1>{t.journey}</h1>
        <div className="notice" style={{ borderLeftColor: "var(--warning)" }}>{t.empty}</div>
        <Link className="mt-btn" href="/living-lab">{t.back}</Link>
      </main>
    );
  }

  return (
    <main style={{ display: "grid", gap: 16 }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <header className="mt-head">
        <div>
          <p className="mt-eyebrow">{t.eyebrow} · {passport.code}</p>
          <h1>{done ? t.doneTitle : t.journey}</h1>
          <p className="muted">{t.stationOf(current + 1, stations.length)} · {copy.title}</p>
        </div>
        <ol className="mt-steps" aria-label={t.journey}>
          {stations.map((s, i) => {
            const doneHere = savedStations[i];
            return (
              <li key={`${s.robotId}-${i}`} className={`${i === current ? "current" : ""} ${doneHere ? "done" : ""}`}>
                <button onClick={() => setCurrent(i)} aria-current={i === current ? "step" : undefined}>
                  {doneHere ? <BadgeCheck size={16} aria-hidden="true" /> : <CircleDashed size={16} aria-hidden="true" />}
                  <span>{stationCopy[lang][s.task].title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </header>

      {done ? (
        <section className="mt-panel mt-done">
          <h2>{t.doneTitle}</h2>
          <p className="muted">{t.doneBody}</p>
          {average !== null && <p className="mt-avg">{t.avg}: <strong>{average.toFixed(1)}/5</strong></p>}
          <ol className="mt-summary">
            {stations.map((s, i) => (
              <li key={`${s.robotId}-${i}`}>
                <BadgeCheck size={18} aria-hidden="true" />
                <span>{stationCopy[lang][s.task].title} · {s.name}</span>
                <strong>{savedStations[i]?.comfort ?? "–"}/5</strong>
              </li>
            ))}
          </ol>
          <div className="mt-row">
            <Link className="mt-btn primary" href="/living-lab">{t.back}</Link>
            <button className="mt-btn" onClick={() => { setSavedStations({}); setCurrent(0); }}><RotateCcw size={18} aria-hidden="true" /> {t.replay}</button>
          </div>
        </section>
      ) : (
        <section className="mt-grid">
          <div className="mt-stage">
            <div className={`mt-bubble ${largeText ? "large" : ""}`} aria-live="polite">{bubble}</div>
            <RobotStage key={station.robotId} framing="fullBody" onReady={onReady} onEvent={onRobotEvent} className="mt-canvas" ariaLabel={station.name} />
            <div className="mt-chip">{mode === "passport" ? t.withPassport : t.withoutPassport}</div>
          </div>

          <div className="mt-panel">
            <div className="mt-task">
              <h2>{copy.title}</h2>
              <p className="muted">{copy.short}</p>
              <p className="mt-robot"><ShieldCheck size={16} aria-hidden="true" /> {station.name} · {station.type.replace(/_/g, " ")}{station.org ? ` · ${station.org}` : ""}</p>
            </div>

            <div className="mt-row">
              <button className="mt-btn primary" disabled={!ready || running} onClick={() => run("passport")}><Play size={18} aria-hidden="true" /> {applied.length ? t.replay : t.start}</button>
              <button className="mt-btn" disabled={!ready || running} onClick={() => run("default")} aria-pressed={mode === "default"}>
                {t.withoutPassport}
              </button>
            </div>

            <div className="mt-card">
              <h2>{mode === "passport" ? t.appliedTitle : t.defaultTitle}</h2>
              <ul>
                {rows.map((row) => (
                  <li key={row.key} className={applied.includes(row.key) ? "on" : ""}>
                    {applied.includes(row.key) ? <BadgeCheck size={18} aria-hidden="true" /> : <CircleDashed size={18} aria-hidden="true" />}
                    <span>{row.label}</span><strong>{row.value}</strong>
                  </li>
                ))}
              </ul>
              {mode === "passport" && (
                <ul className="mt-care">
                  {careRows.map((row) => (
                    <li key={row.key}><span>{row.label}</span><strong>{row.value}</strong></li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-row">
              <button className="mt-btn" disabled={!ready} onClick={() => adjust("too_close")}><Hand size={18} aria-hidden="true" /> {t.tooClose}</button>
              <button className="mt-btn" disabled={!ready} onClick={() => adjust("too_far")}><MoveDown size={18} aria-hidden="true" /> {t.tooFar}</button>
            </div>

            {!running && applied.length > 0 && !saved && (
              <div className="mt-rating">
                <h2>{t.rateTitle}</h2>
                <p className="muted">{t.rateHint}</p>
                <div className="mt-scale" role="group" aria-label={t.rateTitle}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      className={comfort === n ? "sel" : ""}
                      aria-pressed={comfort === n}
                      aria-label={`${n} — ${n <= 2 ? t.rateLow : n >= 4 ? t.rateHigh : t.normal}`}
                      onClick={() => { setComfort(n); human("comfort_rating", { value: n, task: station.task, mode }); }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="mt-scale-ends"><span>{t.rateLow}</span><span>{t.rateHigh}</span></div>
              </div>
            )}

            <div className="mt-row">
              <button className="mt-btn primary" disabled={comfort === null || saved || saving || running || Boolean(savedStations[current])} onClick={saveStation}>{t.save}</button>
              {(saved || savedStations[current]) && current < stations.length - 1 && (
                <button className="mt-btn" onClick={goNext}>{t.next}</button>
              )}
              <Link className="mt-btn" href="/living-lab">{t.back}</Link>
            </div>
            {(saved || savedStations[current]) && <p className="mt-ok">{t.saved}</p>}
            {saveError && <p className="mt-error" role="alert">{saveError}</p>}
          </div>
        </section>
      )}
    </main>
  );
}

const css = `
.mt-head { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; align-items: flex-end; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
.mt-head h1 { margin: 4px 0; font-size: clamp(24px, 2.2vw, 34px); font-weight: 900; color: #07150f; }
.mt-eyebrow { margin: 0; font-size: 12px; font-weight: 750; letter-spacing: 1.2px; text-transform: uppercase; color: var(--warning); }
.mt-steps { list-style: none; display: flex; gap: 6px; flex-wrap: wrap; margin: 0; padding: 0; }
.mt-steps button { display: inline-flex; align-items: center; gap: 6px; min-height: 42px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border); background: #fff; color: var(--text-secondary); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
.mt-steps .current button { border-color: var(--accent); color: #07150f; box-shadow: inset 0 0 0 2px var(--accent); }
.mt-steps .done button svg { color: var(--accent); }
.mt-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(320px, 1fr); gap: 16px; align-items: start; }
@media (max-width: 960px) { .mt-grid { grid-template-columns: 1fr; } }
.mt-stage { position: relative; height: 620px; border-radius: 14px; overflow: hidden; border: 1px solid var(--border); background: linear-gradient(180deg, #ffffff, #e9eef2); }
@media (max-width: 960px) { .mt-stage { height: 480px; } }
.mt-canvas { position: absolute; inset: 0; }
.mt-bubble { position: absolute; z-index: 2; left: 14px; right: 14px; top: 14px; background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; font-size: 17px; min-height: 50px; box-shadow: 0 8px 20px rgba(0,0,0,.06); transition: font-size .2s; }
.mt-bubble.large { font-size: 22px; line-height: 1.45; font-weight: 600; }
.mt-chip { position: absolute; z-index: 2; left: 14px; bottom: 14px; background: rgba(7,21,15,.85); color: #fff; padding: 7px 13px; border-radius: 999px; font-size: 13px; font-weight: 650; }
.mt-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; display: grid; gap: 14px; }
.mt-task h2 { margin: 0 0 4px; font-size: 20px; }
.mt-task p { margin: 0; }
.mt-robot { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px !important; font-size: 13px; font-weight: 650; color: var(--text-secondary); }
.mt-robot svg { color: var(--accent); }
.mt-row { display: flex; gap: 10px; flex-wrap: wrap; }
.mt-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; padding: 10px 16px; border-radius: 10px; border: 1px solid var(--border); background: #fff; color: #07150f; font: inherit; font-weight: 700; cursor: pointer; text-decoration: none; flex: 1 1 180px; }
.mt-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.mt-btn:disabled { opacity: .55; cursor: not-allowed; }
.mt-btn:focus-visible { outline: 3px solid #19c37d; outline-offset: 2px; }
.mt-card { border: 1px dashed var(--accent); border-radius: 12px; padding: 14px; background: #fcfbf8; }
.mt-card h2 { margin: 0 0 10px; font-size: 17px; }
.mt-card ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.mt-card li { display: grid; grid-template-columns: 22px 1fr auto; gap: 8px; align-items: center; color: var(--text-secondary); transition: color .3s; }
.mt-card li.on { color: #07150f; }
.mt-card li.on svg { color: var(--accent); }
.mt-card .mt-care { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); }
.mt-card .mt-care li { grid-template-columns: 1fr auto; font-size: 13px; }
.mt-rating { border: 1px solid var(--border); border-radius: 12px; padding: 14px; background: #fff; display: grid; gap: 8px; }
.mt-rating h2 { margin: 0; font-size: 17px; }
.mt-rating p { margin: 0; font-size: 13px; }
.mt-scale { display: flex; gap: 8px; }
.mt-scale button { flex: 1 1 0; min-height: 52px; border-radius: 10px; border: 1px solid var(--border); background: #fff; font: inherit; font-size: 20px; font-weight: 800; cursor: pointer; }
.mt-scale button.sel { background: #e8f5ec; border-color: var(--accent); box-shadow: inset 0 0 0 2px var(--accent); color: #07150f; }
.mt-scale button:focus-visible { outline: 3px solid #19c37d; outline-offset: 2px; }
.mt-scale-ends { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary); }
.mt-ok { color: var(--accent); font-weight: 700; margin: 0; }
.mt-error { color: var(--warning); font-weight: 700; margin: 0; }
.mt-done { border-color: var(--accent); }
.mt-done h2 { margin: 0; }
.mt-avg { font-size: 17px; margin: 0; }
.mt-avg strong { font-size: 24px; color: var(--accent); }
.mt-summary { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.mt-summary li { display: grid; grid-template-columns: 22px 1fr auto; gap: 8px; align-items: center; color: var(--text-secondary); }
.mt-summary li svg { color: var(--accent); }
.mt-summary strong { color: #07150f; }
`;
