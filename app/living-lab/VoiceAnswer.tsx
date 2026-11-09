"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Mic, Square } from "lucide-react";
import { findSpeechRecognition, listenOnce, type RecognitionConstructor, type SpeechProblem } from "@/lib/hri/speech-input";
import { matchFirstVoiceAnswer, type VoiceAnswer as Answer, type VoiceQuestion } from "@/lib/hri/voice-answers";
import { copy, type Lang } from "./copy";

// Answer the current question by speaking or typing. Listening starts only when the person presses
// the button, so the microphone never picks up the robot's own voice. What was heard is shown so the
// person can check it, and it is never saved: only the chosen preference is.
export default function VoiceAnswerBox<Q extends VoiceQuestion>({
  lang,
  question,
  onAnswer
}: {
  lang: Lang;
  question: Q;
  onAnswer: (answer: Answer<Q>) => void;
}) {
  const t = copy[lang].voiceInput;
  const [Recognition, setRecognition] = useState<RecognitionConstructor | null>(null);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const [problem, setProblem] = useState<SpeechProblem | "not_understood" | null>(null);
  const [typed, setTyped] = useState("");
  const stop = useRef<(() => void) | null>(null);
  // Listening outlives renders, so a result must reach the latest handler, not the one it started with.
  const latestOnAnswer = useRef(onAnswer);
  latestOnAnswer.current = onAnswer;

  // Read only after mounting: the server cannot know what this browser supports.
  useEffect(() => { setRecognition(() => findSpeechRecognition(window)); }, []);
  useEffect(() => () => { stop.current?.(); }, []);

  function handle(alternatives: readonly string[]) {
    const match = matchFirstVoiceAnswer(question, alternatives);
    setHeard(match?.transcript ?? alternatives[0] ?? null);
    setProblem(match ? null : "not_understood");
    if (match) latestOnAnswer.current(match.answer);
  }

  function startListening() {
    if (!Recognition) return;
    window.speechSynthesis?.cancel();
    setHeard(null);
    setProblem(null);
    setListening(true);
    stop.current = listenOnce(Recognition, lang, ({ alternatives, problem: failed }) => {
      setListening(false);
      stop.current = null;
      if (failed) setProblem(failed);
      else handle(alternatives);
    });
  }

  function stopListening() {
    stop.current?.();
    stop.current = null;
    setListening(false);
  }

  function submitTyped(event: FormEvent) {
    event.preventDefault();
    const text = typed.trim();
    if (!text) return;
    stopListening();
    setTyped("");
    handle([text]);
  }

  return (
    <div className="ll-voice">
      <p className="ll-q">{t.prompts[question]}</p>
      <p className="ll-note">{t.examples[question]}</p>
      {Recognition ? (
        <button type="button" className={`ll-btn big ${listening ? "warn" : "primary"}`} aria-pressed={listening} onClick={listening ? stopListening : startListening}>
          {listening ? <Square size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />} {listening ? t.listening : t.speak}
        </button>
      ) : (
        <p className="ll-note" role="status">{t.notSupported}</p>
      )}
      <div aria-live="polite">
        {heard && <p className="ll-heard" data-testid="voice-heard">{t.heard(heard)}</p>}
        {problem && <p className="ll-error">{t.problems[problem]}</p>}
      </div>
      <form className="ll-type" onSubmit={submitTyped}>
        <label htmlFor="ll-typed-answer">{t.typeLabel}</label>
        <div className="ll-type-row">
          <input id="ll-typed-answer" value={typed} maxLength={120} autoComplete="off" onChange={(e) => setTyped(e.target.value)} />
          <button type="submit" className="ll-btn" disabled={!typed.trim()}>{t.send}</button>
        </div>
      </form>
      <p className="ll-note">{t.privacy}</p>
    </div>
  );
}
