import { Globe, User } from "lucide-react";

function GithubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.8 1.18 1.83 1.18 3.09 0 4.43-2.71 5.4-5.29 5.68.42.36.78 1.08.78 2.18 0 1.57-.02 2.84-.02 3.23 0 .31.21.67.8.56A10.51 10.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

function LinkedinIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.56V9h3.56v11.45Z" />
    </svg>
  );
}

// Swap these for your real links whenever you have them.
const CREATOR = {
  name: "Vikram Singh",
  handle: "Babamosie",
  github: "https://github.com/Babamosie333", // placeholder — replace with your real GitHub URL
  portfolio: "https://vikramsingh.itsfolio.tech", // placeholder — replace with your real portfolio URL
  linkedin: "https://linkedin.com/in/vikram14052006", // placeholder — replace with your real LinkedIn URL
  photoUrl: "https://i.ibb.co/v4PNX56N/Vikram-2.jpg", // drop a photo URL here later to replace the placeholder avatar
};

export default function AboutView() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-8">
      <div className="flex flex-col items-center border border-line bg-panel p-6 text-center sm:p-8">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-amber bg-panel-raised">
          {CREATOR.photoUrl ? (
            <img src={CREATOR.photoUrl} alt={CREATOR.name} className="h-full w-full object-cover" />
          ) : (
            <User className="h-10 w-10 text-paper-dim" strokeWidth={1.5} />
          )}
        </div>

        <h2 className="mt-4 font-display text-[18px] font-700 text-paper">{CREATOR.name}</h2>
        <p className="font-mono text-[11px] uppercase tracking-wide text-amber">
          {CREATOR.handle}
        </p>

        <p className="mt-4 text-[13px] leading-relaxed text-paper-dim">
          PostPilot turns a screenshot and a few words into a ready-to-review
          LinkedIn post — draft, approve, schedule, and track it all from one
          control tower, with your own LinkedIn account fully in your own
          hands.
        </p>

        <p className="mt-4 text-[12.5px] leading-relaxed text-paper-dim">
          Built and maintained by {CREATOR.name}. Run into a bug, have an
          idea, or just want to say hi — reach out through any of the links
          below.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <SocialLink href={CREATOR.github} icon={GithubIcon} label="GitHub" />
          <SocialLink href={CREATOR.portfolio} icon={Globe} label="Portfolio" />
          <SocialLink href={CREATOR.linkedin} icon={LinkedinIcon} label="LinkedIn" />
        </div>
      </div>
    </div>
  );
}

function SocialLink({ href, icon: Icon, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="focus-ring flex items-center gap-2 border border-line px-3.5 py-2 text-[12px] font-600 text-paper-dim transition-all hover:-translate-y-0.5 hover:border-amber-dim hover:text-amber"
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      {label}
    </a>
  );
}