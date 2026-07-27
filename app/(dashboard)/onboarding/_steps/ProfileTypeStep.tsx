import type { OnboardingData } from "../page";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";

const VALUES: NonNullable<OnboardingData["profileType"]>[] = ["developer", "designer", "photographe", "artist", "fashion", "musicien", "other"];
const MARKS = ["{ }", "◈", "◉", "◇", "—", "♪", "·"];

interface Props {
  selected: OnboardingData["profileType"];
  t: Dictionary["onboarding"];
  onSelect: (type: NonNullable<OnboardingData["profileType"]>) => void;
}

export default function ProfileTypeStep({ selected, t, onSelect }: Props) {
  const profiles = t.profileType.profiles.map((p, i) => ({ ...p, value: VALUES[i], mark: MARKS[i] }));

  return (
    <div>
      <div className="mb-8 text-center">
        <p className="mono text-xs tracking-widest uppercase mb-3" style={{ color: "#a09a94", letterSpacing: "0.12em" }}>{t.profileType.kicker}</p>
        <h1 className="mb-2 text-3xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>
          {t.profileType.title}
        </h1>
        <p className="text-sm" style={{ color: "#78716c" }}>{t.profileType.subtitle}</p>
      </div>

      <div className="grid gap-3">
        {profiles.map((profile) => {
          const isSelected = selected === profile.value;
          return (
            <button key={profile.value} onClick={() => onSelect(profile.value)}
              className="flex items-center gap-5 rounded-2xl p-5 text-left transition hover:-translate-y-0.5"
              style={{
                background: isSelected ? "#1c1917" : "#f0ece6",
                border: `1px solid ${isSelected ? "#1c1917" : "rgba(0,0,0,0.06)"}`,
              }}>
              <span className="mono w-8 text-center text-base shrink-0 select-none"
                style={{ color: isSelected ? "#c9a96e" : "#c8c4bf", letterSpacing: "-0.02em" }}>
                {profile.mark}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: isSelected ? "white" : "#1c1917" }}>{profile.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: isSelected ? "rgba(255,255,255,0.45)" : "#78716c" }}>
                  {profile.description}
                </p>
              </div>
              <div className="shrink-0 h-3.5 w-3.5 rounded-full transition"
                style={{
                  border: `2px solid ${isSelected ? "#c9a96e" : "rgba(0,0,0,0.12)"}`,
                  background: isSelected ? "#c9a96e" : "transparent",
                }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
