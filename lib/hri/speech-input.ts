// Thin wrapper over the browser's Web Speech recognition. Availability varies by browser, so every
// caller must also offer typed input. Browsers may send the audio to their own speech service, which
// is why the consent text says so. This module never records or stores audio or transcripts.

type RecognitionAlternative = { transcript: string };
type RecognitionEvent = { results: ArrayLike<ArrayLike<RecognitionAlternative> & { isFinal?: boolean }> };

export type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};
export type RecognitionConstructor = new () => Recognition;

export type SpeechProblem = "denied" | "no_speech" | "unavailable";

export function findSpeechRecognition(scope: object): RecognitionConstructor | null {
  const candidate = scope as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

function toProblem(error: string): SpeechProblem | null {
  if (error === "aborted") return null; // we stopped it ourselves
  if (error === "not-allowed" || error === "service-not-allowed") return "denied";
  if (error === "no-speech") return "no_speech";
  return "unavailable"; // network, audio-capture, language-not-supported, ...
}

// Listens for one utterance. onDone fires exactly once with the guesses, or with a problem, or with
// neither if stop() ended it. Nothing is reported after stop().
export function listenOnce(
  Constructor: RecognitionConstructor,
  lang: "th" | "en",
  onDone: (result: { alternatives: string[]; problem: SpeechProblem | null }) => void
) {
  const recognition = new Constructor();
  recognition.lang = lang === "th" ? "th-TH" : "en-US";
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 3;

  let finished = false;
  const finish = (alternatives: string[], problem: SpeechProblem | null) => {
    if (finished) return;
    finished = true;
    onDone({ alternatives, problem });
  };

  recognition.onresult = (event) => {
    const first = event.results[0];
    const alternatives: string[] = [];
    for (let i = 0; first && i < first.length; i++) alternatives.push(first[i].transcript);
    finish(alternatives, null);
  };
  recognition.onerror = (event) => finish([], toProblem(event.error));
  // Ended without a result or an error: treated as hearing nothing.
  recognition.onend = () => finish([], "no_speech");

  try {
    recognition.start();
  } catch {
    finish([], "unavailable");
  }

  return () => {
    finished = true;
    recognition.abort();
  };
}
