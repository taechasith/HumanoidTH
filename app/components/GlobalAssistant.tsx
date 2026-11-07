"use client";

import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  CircleHelp,
  MessageCircle,
  Moon,
  Palette,
  RotateCcw,
  Send,
  Sparkles,
  Sun,
  X,
} from "lucide-react";

type ThemeMode = "light" | "dark" | "system";
type ThemeSettings = {
  mode: ThemeMode;
  accent: string;
  textScale: number;
  density: "comfortable" | "compact";
};
type Message = { from: "assistant" | "visitor"; text: string };

const STORAGE_KEY = "humanoidth-interface-preferences";
const defaults: ThemeSettings = { mode: "light", accent: "#2f6b4f", textScale: 1, density: "comfortable" };
const accentChoices = [
  { name: "Forest", color: "#2f6b4f" },
  { name: "Ocean", color: "#3156d3" },
  { name: "Violet", color: "#7656b3" },
  { name: "Coral", color: "#c45f42" },
  { name: "Berry", color: "#a23e68" },
];
const suggestions = ["Find robot models", "How can I contribute?", "What data is in the atlas?"];

function answerFor(message: string, isThai: boolean) {
  const query = message.toLowerCase();
  if (query.includes("contribut") || query.includes("submit") || query.includes("เพิ่มข้อมูล")) {
    return isThai ? "ส่งโมเดลหุ่นยนต์ แหล่งข้อมูลสาธารณะ บทความ ชุดข้อมูล หรือคำแก้ไขได้ที่หน้า Submit data ผู้ดูแลจะตรวจสอบก่อนเผยแพร่ใน Atlas ครับ" : "You can share a robot model, public source, paper, dataset, or correction from Submit data. A reviewer checks each record before it appears in the public atlas.";
  }
  if (query.includes("model") || query.includes("robot") || query.includes("หุ่นยนต์")) {
    return isThai ? "เปิดหมวด Robot models เพื่อดูหุ่นยนต์ฮิวแมนนอยด์ โซเชียล และบริการที่ลงทะเบียนไว้ แต่ละรายการอาจมีผู้พัฒนา รูปแบบการใช้งาน สถานะในไทย และแหล่งอ้างอิงครับ" : "Browse the Robot models collection to explore registered humanoid, social, and service robots. Each record can include its developer, use case, Thailand status, and supporting sources.";
  }
  if (query.includes("source") || query.includes("data") || query.includes("atlas") || query.includes("ข้อมูล")) {
    return isThai ? "Atlas รวบรวมโมเดลหุ่นยนต์ หลักฐานสาธารณะที่ผ่านการตรวจสอบ ข้อมูลจากชุมชน แผนที่ระบบนิเวศ และความเชื่อมโยงต่าง ๆ ดูตัวเลขล่าสุดได้ที่ Dashboard หรือเปิด Database เพื่อดูแหล่งข้อมูลครับ" : "The atlas brings together robot models, accepted public evidence, contributions, ecosystem maps, and relationship data. Open the Dashboard for live counts or the Database to inspect source records.";
  }
  if (query.includes("theme") || query.includes("สี")) {
    return isThai ? "กดปุ่มรูปจานสีข้างแชตเพื่อเลือกธีมสว่าง มืด หรือตามอุปกรณ์ แล้วเปิดปรับแบบละเอียดเพื่อเปลี่ยนสีเน้น ขนาดตัวอักษร และระยะห่างครับ" : "Use the palette button beside this chat to choose a light, dark, or system theme. Open Advanced controls to adjust the accent color, text scale, and spacing.";
  }
  return isThai ? "ผมช่วยพาไปดูโมเดลหุ่นยนต์ หลักฐาน ข้อมูลจากชุมชน แผนที่ และ Dashboard ได้ ลองเลือกคำถามแนะนำหรือบอกสิ่งที่กำลังหาได้เลยครับ" : "I can help you navigate robot models, evidence, contributions, maps, and the atlas dashboard. Try one of the suggested questions, or ask me what you are looking for.";
}

function contrastText(hexColor: string) {
  const hex = hexColor.replace("#", "");
  const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const luminance = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.42 ? "#142a2b" : "#ffffff";
}

export default function GlobalAssistant({ lang = "en" }: { lang?: "en" | "th" }) {
  const isThai = lang === "th";
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [settings, setSettings] = useState<ThemeSettings>(defaults);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { from: "assistant", text: isThai ? "สวัสดีครับ ผมช่วยค้นหาโมเดลหุ่นยนต์ แหล่งข้อมูล และวิธีมีส่วนร่วมใน HumanoidTH Atlas ได้ ลองถามได้เลยครับ" : "Hi! I can help you find robot models, evidence, and ways to contribute to the HumanoidTH Atlas. What are you looking for?" },
  ]);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setSettings({ ...defaults, ...JSON.parse(saved) as Partial<ThemeSettings> });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setPreferencesLoaded(true);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.atlasTheme = settings.mode;
    root.dataset.atlasDensity = settings.density;
    root.style.setProperty("--atlas-accent", settings.accent);
    root.style.setProperty("--atlas-accent-foreground", contrastText(settings.accent));
    root.style.setProperty("--accent", settings.accent);
    root.style.setProperty("--accent-strong", `color-mix(in srgb, ${settings.accent} 82%, #101a14)`);
    root.style.setProperty("--atlas-text-scale", String(settings.textScale));
    try {
      if (!preferencesLoaded) return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Keep the controls usable when storage is blocked.
    }
  }, [settings, preferencesLoaded]);

  useEffect(() => {
    if (open && messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [messages, open]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = input.trim();
    if (!question) return;
    setMessages((current) => [...current, { from: "visitor", text: question }, { from: "assistant", text: answerFor(question, isThai) }]);
    setInput("");
  };

  const askSuggestion = (question: string) => {
    setMessages((current) => [...current, { from: "visitor", text: question }, { from: "assistant", text: answerFor(question, isThai) }]);
  };

  const setMode = (mode: ThemeMode) => setSettings((current) => ({ ...current, mode }));

  return (
    <div className="global-assistant" aria-label={isThai ? "ผู้ช่วยและการตั้งค่าหน้าตา" : "Assistant and appearance settings"}>
      {open && <section className="assistant-panel" aria-label={isThai ? "แชตผู้ช่วย HumanoidTH" : "HumanoidTH assistant chat"}>
        <header className="assistant-panel__header">
          <span className="assistant-avatar"><Bot size={20} aria-hidden="true" /></span>
          <div><strong>{isThai ? "ผู้ช่วย HumanoidTH" : "Atlas assistant"}</strong><small><i />{isThai ? "พร้อมช่วยสำรวจ Atlas" : "Here to explore with you"}</small></div>
          <span className="assistant-panel__preview-tag">PREVIEW</span>
          <button type="button" className="assistant-icon-button" aria-label={isThai ? "ปิดแชต" : "Close chat"} onClick={() => setOpen(false)}><X size={18} /></button>
        </header>
        <div className="assistant-context"><Sparkles size={14} aria-hidden="true" /><span>{isThai ? "ถามเรื่องหุ่นยนต์ งานวิจัย และข้อมูลในไทย" : "Ask about robots, research, and data in Thailand"}</span></div>
        <div className="assistant-messages" ref={messageListRef} aria-live="polite">
          {messages.map((message, index) => <div className={`assistant-message assistant-message--${message.from}`} key={`${index}-${message.from}`}>
            {message.from === "assistant" && <span className="assistant-message__avatar"><Bot size={14} aria-hidden="true" /></span>}
            <p>{message.text}</p>
          </div>)}
        </div>
        {messages.length === 1 && <div className="assistant-suggestions" aria-label={isThai ? "คำถามแนะนำ" : "Suggested questions"}>
          <span className="assistant-suggestions__label">{isThai ? "ลองถามดู" : "TRY ASKING"}</span>
          <div className="assistant-suggestions__options">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => askSuggestion(suggestion)}><span>{suggestion}</span><ChevronDown size={13} aria-hidden="true" /></button>)}</div>
        </div>}
        <form className="assistant-composer" onSubmit={submit}>
          <label className="sr-only" htmlFor="assistant-question">{isThai ? "พิมพ์คำถาม" : "Ask the atlas assistant"}</label>
          <input id="assistant-question" value={input} onChange={(event) => setInput(event.target.value)} placeholder={isThai ? "ถามเกี่ยวกับ Atlas..." : "Ask about the atlas..."} />
          <button type="submit" aria-label={isThai ? "ส่งคำถาม" : "Send message"} disabled={!input.trim()}><Send size={17} aria-hidden="true" /></button>
        </form>
        <div className="assistant-disclaimer">{isThai ? "Mockup · คำตอบยังไม่เชื่อมต่อ AI หรือค้นฐานข้อมูล" : "Mockup · responses are not connected to AI or live search"}</div>
      </section>}

      {themeOpen && <section className="theme-panel" aria-label={isThai ? "ตั้งค่าธีม" : "Theme settings"}>
        <header className="theme-panel__header"><span className="theme-panel__icon"><Palette size={18} aria-hidden="true" /></span><div><strong>{isThai ? "ปรับหน้าตา" : "Appearance"}</strong><small>{isThai ? "ตั้งค่าได้ทุกหน้า" : "Your settings apply across pages"}</small></div><button type="button" className="assistant-icon-button" aria-label={isThai ? "ปิดธีม" : "Close appearance settings"} onClick={() => setThemeOpen(false)}><X size={17} /></button></header>
        <fieldset className="theme-mode-picker"><legend>{isThai ? "เลือกธีม" : "Choose a theme"}</legend>
          {(["light", "dark", "system"] as ThemeMode[]).map((mode) => <button type="button" key={mode} className={settings.mode === mode ? "selected" : ""} onClick={() => setMode(mode)} aria-pressed={settings.mode === mode}>
            {mode === "light" ? <Sun size={17} /> : mode === "dark" ? <Moon size={17} /> : <CircleHelp size={17} />}{isThai ? ({ light: "สว่าง", dark: "มืด", system: "ตามเครื่อง" } as const)[mode] : mode[0].toUpperCase() + mode.slice(1)}{settings.mode === mode && <Check size={14} className="theme-mode-check" />}
          </button>)}
        </fieldset>
        <fieldset className="theme-color-picker"><legend>{isThai ? "เลือกสี" : "Choose a color"}</legend>
          <div className="theme-color-picker__choices">{accentChoices.map(({ name, color }) => <button key={color} type="button" className={settings.accent.toLowerCase() === color ? "selected" : ""} style={{ "--swatch-color": color } as CSSProperties} onClick={() => setSettings((current) => ({ ...current, accent: color }))} aria-label={`${isThai ? "เลือกสี" : "Choose"} ${name}`} aria-pressed={settings.accent.toLowerCase() === color} title={name}>
            <span className="theme-color-picker__swatch">{settings.accent.toLowerCase() === color && <Check size={13} aria-hidden="true" />}</span><span>{isThai ? ({ Forest: "ป่า", Ocean: "ทะเล", Violet: "ม่วง", Coral: "ปะการัง", Berry: "เบอร์รี" } as const)[name] : name}</span>
          </button>)}</div>
        </fieldset>
        <button type="button" className="theme-advanced-toggle" aria-expanded={advanced} onClick={() => setAdvanced((value) => !value)}><span>{isThai ? "ปรับแบบละเอียด" : "Advanced controls"}</span><ChevronDown size={16} className={advanced ? "expanded" : ""} /></button>
        {advanced && <div className="theme-advanced">
          <label className="theme-control theme-control--color"><span>{isThai ? "สีเน้น" : "Accent color"}<small>{isThai ? "ใช้กับปุ่มและสถานะที่เลือก" : "Used for buttons and active states"}</small></span><input type="color" value={settings.accent} onChange={(event) => setSettings((current) => ({ ...current, accent: event.target.value }))} aria-label={isThai ? "เลือกสีเน้น" : "Choose accent color"} /></label>
          <label className="theme-control theme-control--range"><span>{isThai ? "ขนาดข้อความ" : "Text size"}<small>{Math.round(settings.textScale * 100)}%</small></span><input type="range" min="0.9" max="1.15" step="0.05" value={settings.textScale} onChange={(event) => setSettings((current) => ({ ...current, textScale: Number(event.target.value) }))} aria-label={isThai ? "ปรับขนาดข้อความ" : "Adjust text size"} /></label>
          <div className="theme-control theme-control--density"><span>{isThai ? "ระยะห่าง" : "Spacing"}<small>{isThai ? "ความโปร่งของหน้า" : "Page density"}</small></span><div><button type="button" className={settings.density === "comfortable" ? "selected" : ""} onClick={() => setSettings((current) => ({ ...current, density: "comfortable" }))}>{isThai ? "โปร่ง" : "Comfortable"}</button><button type="button" className={settings.density === "compact" ? "selected" : ""} onClick={() => setSettings((current) => ({ ...current, density: "compact" }))}>{isThai ? "กระชับ" : "Compact"}</button></div></div>
        </div>}
        <button type="button" className="theme-reset" onClick={() => setSettings(defaults)}><RotateCcw size={14} aria-hidden="true" />{isThai ? "คืนค่าเริ่มต้น" : "Reset to defaults"}</button>
      </section>}

      <div className="global-assistant__dock">
        <button type="button" className={`theme-launcher${themeOpen ? " is-open" : ""}`} aria-label={isThai ? "เปิดตั้งค่าธีม" : "Open theme settings"} aria-expanded={themeOpen} onClick={() => { setThemeOpen((value) => !value); setOpen(false); }}><Palette size={19} aria-hidden="true" /></button>
        <button type="button" className={`assistant-launcher${open ? " is-open" : ""}`} aria-label={open ? (isThai ? "ปิดผู้ช่วย" : "Close assistant") : (isThai ? "เปิดผู้ช่วยแชต" : "Open chat assistant")} aria-expanded={open} onClick={() => { setOpen((value) => !value); setThemeOpen(false); }}>
          {open ? <X size={22} aria-hidden="true" /> : <MessageCircle size={22} aria-hidden="true" />}<span>{open ? (isThai ? "ปิด" : "Close") : (isThai ? "ถาม Atlas" : "Ask Atlas")}</span>
        </button>
      </div>
    </div>
  );
}
