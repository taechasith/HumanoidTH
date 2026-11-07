// What a session row may keep. Sessions outlive their passport (HriSession.passportId is
// onDelete: SetNull), so care needs and identifiers must never reach them: deleting a passport has
// to leave no sensitive trace. The server applies this to everything a client sends.

// Answers to the care questions: their events are dropped whole, whatever their fields are called.
const SENSITIVE_EVENT_TYPES = new Set(["anxiety", "care_needs_set", "communication", "reach"]);
// Stripped from every summary and from every event that is kept.
const SENSITIVE_KEYS = new Set(["anxiety", "nickname", "code", "captions", "speechPace", "accessible", "noReach", "transcript"]);

const withoutSensitiveKeys = <T extends Record<string, unknown>>(record: T) =>
  Object.fromEntries(Object.entries(record).filter(([key]) => !SENSITIVE_KEYS.has(key)));

export function minimiseSummary(summary: Record<string, unknown>) {
  return withoutSensitiveKeys(summary);
}

export function minimiseEvents<T extends { type: string }>(events: T[]) {
  return events.filter((event) => !SENSITIVE_EVENT_TYPES.has(event.type)).map(withoutSensitiveKeys);
}
