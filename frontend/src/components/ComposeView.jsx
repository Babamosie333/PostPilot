import { useRef, useState } from "react";
import { api } from "../lib/api";
import { TONE_OPTIONS } from "../lib/tones";

const MAX_IMAGES = 9;
const MAX_VIDEO_MB = 200;

export default function ComposeView({ onGenerated }) {
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [video, setVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [context, setContext] = useState("");
  const [topic, setTopic] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [mode, setMode] = useState("manual");
  const [tone, setTone] = useState("authentic");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  function addFiles(newFiles) {
    const combined = [...files, ...newFiles].slice(0, MAX_IMAGES);
    setFiles(combined);
    setPreviews(combined.map((f) => URL.createObjectURL(f)));
    setResult(null);
  }

  function removeFile(index) {
    const combined = files.filter((_, i) => i !== index);
    setFiles(combined);
    setPreviews(combined.map((f) => URL.createObjectURL(f)));
  }

  function handleVideoPick(f) {
    if (!f) return;
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`Video is over ${MAX_VIDEO_MB}MB — pick a smaller file.`);
      return;
    }
    setError(null);
    setVideo(f);
    setVideoPreview(URL.createObjectURL(f));
    setResult(null);
  }

  function removeVideo() {
    setVideo(null);
    setVideoPreview(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("images", f));
      if (video) fd.append("video", video);
      fd.append("context", context);
      fd.append("topic", topic);
      fd.append("mode", mode);
      fd.append("tone", tone);
      fd.append("linkUrl", linkUrl);
      fd.append("linkTitle", linkTitle);
      const post = await api.generatePost(fd);
      setResult(post);
      onGenerated?.(post);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFiles([]);
    setPreviews([]);
    removeVideo();
    setContext("");
    setTopic("");
    setLinkUrl("");
    setLinkTitle("");
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const hasContent = files.length > 0 || video || context || topic || linkUrl;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-10">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = Array.from(e.dataTransfer.files || []).filter((f) =>
            f.type.startsWith("image/")
          );
          if (dropped.length) addFiles(dropped);
        }}
        onClick={() => fileInputRef.current?.click()}
        className="focus-ring flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-line-bright bg-panel p-4 transition-all hover:border-amber-dim hover:bg-panel-raised"
      >
        {previews.length > 0 ? (
          <div className="flex w-full flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={i} className="group relative h-20 w-20 shrink-0">
                <img src={src} alt="" className="h-full w-full border border-line object-cover" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="focus-ring absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center bg-signal-rust text-[11px] font-700 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
            {files.length < MAX_IMAGES && (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-dashed border-line-bright font-mono text-[10.5px] text-paper-dim">
                + add
              </div>
            )}
          </div>
        ) : (
          <>
            <span className="font-display text-[14px] font-600 text-paper">
              Drop up to {MAX_IMAGES} images, or click to choose
            </span>
            <span className="font-mono text-[11px] text-paper-dim">
              optional — a caption can be generated from text and a link alone
            </span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const picked = Array.from(e.target.files || []);
            if (picked.length) addFiles(picked);
          }}
        />
      </div>

      <div className="mt-3 border border-dashed border-line-bright bg-panel p-4">
        {videoPreview ? (
          <div className="flex items-center gap-3">
            <video src={videoPreview} className="h-20 w-32 border border-line object-cover" muted />
            <div className="flex-1">
              <p className="text-[12.5px] font-600 text-paper">{video.name}</p>
              <p className="font-mono text-[10.5px] text-paper-dim">
                {(video.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
            <button
              onClick={removeVideo}
              className="focus-ring border border-line px-2.5 py-1 text-[11px] text-signal-rust hover:border-signal-rust/50"
            >
              remove
            </button>
          </div>
        ) : (
          <button
            onClick={() => videoInputRef.current?.click()}
            className="focus-ring flex w-full items-center justify-between text-left"
          >
            <span className="font-mono text-[11.5px] text-paper-dim">
              or attach an MP4 video instead of images (max {MAX_VIDEO_MB}MB)
            </span>
            <span className="font-mono text-[11px] text-amber">choose file</span>
          </button>
        )}
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4"
          className="hidden"
          onChange={(e) => handleVideoPick(e.target.files?.[0] ?? null)}
        />
      </div>
      {video && files.length > 0 && (
        <p className="mt-2 font-mono text-[10.5px] leading-relaxed text-amber">
          A video and images are both attached — LinkedIn only allows one
          attachment type, so the video takes priority and the images stay
          dashboard-only.
        </p>
      )}

      <div className="mt-6 grid gap-5">
        <label className="grid gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-wide text-paper-dim">
            Context
          </span>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="What's the story? e.g. shipped the auth flow for my hackathon project after two failed attempts"
            rows={3}
            className="focus-ring resize-none border border-line bg-panel px-3 py-2.5 text-[13.5px] text-paper placeholder:text-paper-dim/60"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-wide text-paper-dim">
            Topic / angle
          </span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. shipping under pressure"
            className="focus-ring border border-line bg-panel px-3 py-2.5 text-[13.5px] text-paper placeholder:text-paper-dim/60"
          />
        </label>

        <div className="grid gap-3 border border-line p-4">
          <p className="font-mono text-[10.5px] uppercase tracking-wide text-paper-dim">
            Link attachment (optional)
          </p>
          <label className="grid gap-1.5">
            <span className="font-mono text-[10.5px] text-paper-dim">
              URL — demo, GitHub repo, etc.
            </span>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://github.com/you/project"
              className="focus-ring border border-line-bright bg-panel-raised px-3 py-2 text-[13px] text-paper placeholder:text-paper-dim/60"
            />
          </label>
          {linkUrl && (
            <label className="grid gap-1.5">
              <span className="font-mono text-[10.5px] text-paper-dim">Link title</span>
              <input
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="Project name or short title"
                className="focus-ring border border-line-bright bg-panel-raised px-3 py-2 text-[13px] text-paper placeholder:text-paper-dim/60"
              />
            </label>
          )}
          {linkUrl && (files.length > 0 || video) && (
            <p className="font-mono text-[10.5px] leading-relaxed text-amber">
              Heads up — LinkedIn only allows one attachment type per post.
              With a link set, this publishes as a link post; your{" "}
              {video ? "video" : "images"} stay attached here for reference
              but won't appear on LinkedIn.
            </p>
          )}
        </div>

        <div className="grid gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-wide text-paper-dim">
            Tone
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TONE_OPTIONS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                className={`focus-ring border px-3 py-1.5 text-[11.5px] font-600 transition-colors ${
                  tone === t.value
                    ? "border-amber bg-panel-raised text-amber"
                    : "border-line text-paper-dim hover:text-paper"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-wide text-paper-dim">
            Mode
          </span>
          <div className="flex border border-line">
            <ModeOption
              label="Review"
              description="Draft first, you approve"
              active={mode === "manual"}
              onClick={() => setMode("manual")}
            />
            <ModeOption
              label="Auto"
              description="Approved on generation"
              active={mode === "auto"}
              onClick={() => setMode("auto")}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 border border-signal-rust/40 bg-signal-rust/10 px-3 py-2 font-mono text-[12px] text-signal-rust">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={busy}
          className="focus-ring border border-amber bg-amber px-5 py-2.5 text-[13px] font-700 text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        >
          {busy ? (video ? "Uploading video…" : "Generating…") : "Generate post"}
        </button>
        {hasContent && !busy && (
          <button
            onClick={reset}
            className="focus-ring font-mono text-[11px] text-paper-dim hover:text-paper"
          >
            clear
          </button>
        )}
      </div>

      {result && (
        <div className="mt-8 border border-signal-green/40 bg-signal-green/5 p-5">
          <p className="font-mono text-[10.5px] uppercase tracking-wide text-signal-green">
            {result.status === "approved" ? "Approved — set a time to send it" : "Saved as draft"}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed text-paper">
            {result.generatedText}
          </p>
        </div>
      )}
    </div>
  );
}

function ModeOption({ label, description, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`focus-ring flex-1 border-r border-line px-4 py-3 text-left last:border-r-0 ${
        active ? "bg-panel-raised" : "bg-transparent hover:bg-panel-raised/50"
      }`}
    >
      <span
        className={`block text-[13px] font-600 ${
          active ? "text-amber" : "text-paper"
        }`}
      >
        {label}
      </span>
      <span className="block font-mono text-[10.5px] text-paper-dim">
        {description}
      </span>
    </button>
  );
}