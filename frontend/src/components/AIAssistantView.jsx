import { useState } from "react";
import { Sparkles, Send, Check } from "lucide-react";
import { api } from "../lib/api";
import { TONE_OPTIONS } from "../lib/tones";

export default function AIAssistantView() {
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("authentic");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]); // { role: "user"|"assistant", text, saved? }[]

  async function handleSend() {
    if (!message.trim() || busy) return;
    setBusy(true);
    setError(null);
    const prompt = message.trim();
    const nextHistory = [...history, { role: "user", text: prompt }];
    setHistory(nextHistory);
    setMessage("");
    try {
      const { reply } = await api.aiChat(
        prompt,
        history.map((h) => ({ role: h.role, text: h.text })),
        tone
      );
      setHistory((h) => [...h, { role: "assistant", text: reply, saved: false }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveAsDraft(index) {
    const turn = history[index];
    try {
      await api.saveAsDraft(turn.text, tone);
      setHistory((h) => h.map((item, i) => (i === index ? { ...item, saved: true } : item)));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-4 flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 border border-dashed border-line px-4 py-10 text-center">
            <Sparkles className="h-6 w-6 text-paper-dim" strokeWidth={1.5} />
            <p className="font-mono text-[12px] text-paper-dim">
              Ask anything — about your projects, LinkedIn strategy, or
              whatever's on your mind. Ask it to write a post specifically
              when you actually want one; nothing is saved automatically.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {history.map((turn, i) =>
              turn.role === "user" ? (
                <div
                  key={i}
                  className="ml-auto max-w-[85%] border border-line-bright bg-panel-raised px-3.5 py-2 text-[13px] text-paper"
                >
                  {turn.text}
                </div>
              ) : (
                <div
                  key={i}
                  className="mr-auto max-w-[85%] border border-line bg-panel px-3.5 py-3 text-[13px] leading-relaxed text-paper"
                >
                  <p className="whitespace-pre-wrap">{turn.text}</p>
                  <div className="mt-2.5 border-t border-line pt-2.5">
                    {turn.saved ? (
                      <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-signal-green">
                        <Check className="h-3 w-3" /> Saved to Drafts
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSaveAsDraft(i)}
                        className="focus-ring font-mono text-[10.5px] text-amber hover:underline"
                      >
                        Save as draft
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {TONE_OPTIONS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTone(t.value)}
            className={`focus-ring border px-2.5 py-1 text-[10.5px] font-600 transition-colors ${
              tone === t.value
                ? "border-amber text-amber"
                : "border-line text-paper-dim hover:text-paper"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-2 border border-signal-rust/40 bg-signal-rust/10 px-3 py-2 font-mono text-[11.5px] text-signal-rust">
          {error}
        </p>
      )}

      <div className="flex items-end gap-2 border border-line bg-panel p-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={2}
          placeholder="Ask anything, or say 'write a post about...' when you want one"
          className="focus-ring flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] text-paper placeholder:text-paper-dim/60"
        />
        <button
          onClick={handleSend}
          disabled={busy || !message.trim()}
          className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center bg-amber text-white transition-all active:scale-95 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}