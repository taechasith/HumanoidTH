// Turns what a person said or typed into one answer of the current calibration question.
// Pure and client-safe: no browser APIs, no network. Thai and English are both accepted whatever the
// page language is, because people switch between them. Unit-tested in test/hri-voice-answers.test.ts.
//
// Only a clear answer counts. When nothing matches, or the words point to different answers, the result
// is null and the person is asked again: a misheard answer must never silently change a preference.

export const VOICE_QUESTIONS = {
  greet: {
    wai: ["ไหว้", "สวัสดี", "wai", "hello", "hi", "greet"]
  },
  approach: {
    continue: ["ไปต่อ", "ต่อเลย", "เข้ามาอีก", "เข้ามาได้", "ใกล้อีก", "ขยับเข้ามา", "continue", "closer", "come in", "go on", "next"],
    comfortable: ["พอดี", "สบาย", "ตรงนี้", "พอแล้ว", "หยุด", "comfortable", "just right", "right here", "stop", "good here"],
    too_close: ["ใกล้ไป", "ใกล้เกินไป", "ใกล้มาก", "ถอยไป", "ถอยออก", "ถอย", "too close", "step back", "back up", "move back"],
    too_fast: ["เร็วไป", "เร็วเกินไป", "ช้าลง", "ช้าหน่อย", "too fast", "slow down", "slower"]
  },
  anxiety: {
    low: ["สบายใจ", "สบายดี", "ไม่กังวล", "ไม่กลัว", "ไม่เป็นไร", "comfortable", "relaxed", "fine", "not nervous", "not anxious"],
    medium: ["กังวลนิดหน่อย", "กังวลเล็กน้อย", "กลัวนิดหน่อย", "นิดหน่อย", "เล็กน้อย", "a bit", "a little", "slightly", "nervous"],
    high: ["กังวลมาก", "กังวล", "กลัวมาก", "กลัว", "anxious", "scared", "afraid", "very nervous"]
  },
  communication: {
    normal: ["ปกติ", "ธรรมดา", "normal", "regular"],
    accessible: ["พูดช้า", "ช้าลง", "ช้า", "ตัวใหญ่", "ตัวอักษรใหญ่", "slow", "large", "big text"]
  },
  reach: {
    ok: ["ยื่นได้", "ยื่นให้", "ส่งให้", "ส่งถึงมือ", "ได้", "yes", "okay", "hand it", "hand me"],
    avoid: ["ไม่ต้อง", "ไม่ได้", "ไม่ยื่น", "ไม่", "วางไว้", "วาง", "no", "place it", "nearby", "don't"]
  },
  gaze: {
    direct: ["มองได้", "มองตรง", "มองฉัน", "มองผม", "สบตา", "ได้", "ใช่", "yes", "look at me", "direct"],
    soft: ["ไม่สบตา", "ไม่ต้องมอง", "ไม่มอง", "ไม่ได้", "ไม่", "มองเลี่ยง", "หลบตา", "หลบ", "no", "look away", "away", "soft"]
  },
  voice: {
    on: ["พูดออกเสียง", "ออกเสียง", "พูด", "เสียง", "speak", "out loud", "spoken", "voice"],
    off: ["ไม่พูด", "ไม่ต้องพูด", "ไม่ออกเสียง", "ข้อความ", "เงียบ", "text", "silent", "quiet"]
  },
  confirm: {
    save: ["บันทึก", "ยืนยัน", "ถูกต้อง", "ตกลง", "save", "confirm", "correct"]
  }
} as const;

export type VoiceQuestion = keyof typeof VOICE_QUESTIONS;
export type VoiceAnswer<Q extends VoiceQuestion> = keyof (typeof VOICE_QUESTIONS)[Q] & string;

const isLatin = (phrase: string) => /^[a-z' ]+$/.test(phrase);
const NEGATED_BEFORE = /(ไม่|\b(?:not|never|don't|do not|isn't))\s*$/;

type Span = { answer: string; start: number; end: number };

function findSpans(text: string, answer: string, phrase: string): Span[] {
  const spans: Span[] = [];
  for (let at = text.indexOf(phrase); at !== -1; at = text.indexOf(phrase, at + 1)) {
    const end = at + phrase.length;
    // Latin words must stand alone ("no" is not in "know"). Thai is written without spaces.
    const whole = !isLatin(phrase) || (!/[a-z']/.test(text[at - 1] ?? "") && !/[a-z']/.test(text[end] ?? ""));
    if (whole && !NEGATED_BEFORE.test(text.slice(0, at))) spans.push({ answer, start: at, end });
  }
  return spans;
}

// Longer phrases claim their words first, so "ไม่ได้" hides the "ได้" inside it and "กังวลมาก" hides
// "กังวล". Anything left that points to a different answer is a contradiction, and is refused.
export function matchVoiceAnswer<Q extends VoiceQuestion>(question: Q, transcript: string): VoiceAnswer<Q> | null {
  const text = transcript.toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return null;
  const spans = (Object.entries(VOICE_QUESTIONS[question]) as [string, readonly string[]][])
    .flatMap(([answer, phrases]) => phrases.flatMap((phrase) => findSpans(text, answer, phrase)))
    .sort((a, b) => b.end - b.start - (a.end - a.start));
  const claimed: Span[] = [];
  for (const span of spans) {
    if (!claimed.some((c) => span.start < c.end && c.start < span.end)) claimed.push(span);
  }
  const answers = new Set(claimed.map((span) => span.answer));
  return answers.size === 1 ? ([...answers][0] as VoiceAnswer<Q>) : null;
}

// Recognisers return their best guesses in order: use the first guess that is a clear answer.
export function matchFirstVoiceAnswer<Q extends VoiceQuestion>(question: Q, alternatives: readonly string[]) {
  for (const transcript of alternatives) {
    const answer = matchVoiceAnswer(question, transcript);
    if (answer) return { answer, transcript };
  }
  return null;
}
