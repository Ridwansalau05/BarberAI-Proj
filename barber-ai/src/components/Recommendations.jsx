// src/components/Recommendations.jsx
import React from "react";
import { Star, Sparkles, Scissors, Clock, Bookmark } from "lucide-react";
import { getStyleRecommendations } from "../ai/rules";
import FaceShapeBadge from "./FaceShapeBadge";
import FaceShapePickerModal from "./FaceShapePickerModal";
import { useNavigate } from "react-router-dom";

function Chip({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function ConfidenceBadge({ score }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 90 ? "bg-emerald-100 text-emerald-700" :
    pct >= 80 ? "bg-amber-100 text-amber-700" :
                "bg-slate-100 text-slate-700";
  return (
    <div className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>
      <Star className="h-3.5 w-3.5" />
      {pct}%
    </div>
  );
}

function StyleCard({ s, onBook, onBookLocal }) {
  const [saved, setSaved] = React.useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[16/8] w-full overflow-hidden">
        <img
          src={s.image}
          alt={s.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <ConfidenceBadge score={s.score} />
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{s.name}</h3>
            <p className="mt-1 text-slate-600">
              A great match for your face shape and recent bookings.
            </p>
          </div>

          <button
            onClick={() => setSaved((v) => !v)}
            className={`ml-3 rounded-full p-2 transition ${
              saved ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            title={saved ? "Saved" : "Save"}
          >
            <Bookmark className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
          <div className="inline-flex items-center gap-2">
            <Scissors className="h-4 w-4 text-amber-600" />
            <span>Service: <span className="font-medium">{s.service}</span></span>
          </div>
          <div className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <span>Maintenance: <span className="font-medium">{s.maintenance}</span></span>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-medium text-slate-500">Suitable face shapes:</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {s.faceShapes.map((fs) => (
              <Chip key={fs}>{fs}</Chip>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            if (onBookLocal) onBookLocal(s);
            else if (onBook) onBook(s);
          }}
          className="mt-5 w-full rounded-xl bg-amber-500 px-4 py-3 font-semibold text-slate-900 hover:brightness-95"
        >
          Book This Style
        </button>
      </div>
    </div>
  );
}

export default function Recommendations({
  profile: profileProp = { faceShape: "Oval" },
  history: historyProp = [],
  limit = 4,
  onBook,
}) {
  function getUserId() {
    const auth = JSON.parse(localStorage.getItem("authUser") || "{}");
    return auth.id || auth.email || "demo-user";
  }

  const userId = getUserId();
  const [profile, setProfile] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`profile:${userId}`) || "{}");
    } catch (_) {
      return {};
    }
  });
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerStartTab, setPickerStartTab] = React.useState("Quick Pick");

  // History: prefer prop, else from localStorage
  const historyLocal = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(`history:${userId}`) || "[]");
    } catch (_) {
      return [];
    }
  }, [userId]);
  const history = historyProp?.length ? historyProp : historyLocal.slice().reverse();

  // Combine face shape from local profile with any extra prefs from prop (e.g., prefWeights)
  const mergedProfile = {
    ...profileProp,
    faceShape: profile?.faceShape || profileProp?.faceShape || "Oval",
    liked: profile?.liked || profileProp?.liked,
  };

  const recs = React.useMemo(
    () => getStyleRecommendations(mergedProfile, history).slice(0, limit),
    [mergedProfile.faceShape, mergedProfile.liked, history, limit]
  );

  function saveProfile(next) {
    localStorage.setItem(`profile:${userId}`, JSON.stringify(next));
    setProfile(next);
  }

  const navigate = useNavigate();
  function handleBookLocal(style) {
    try {
      localStorage.setItem("prefillService", style.service);
    } catch (_) {}
    if (onBook) onBook(style);
    else navigate("/book");
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold">Personalized for You</h2>
        </div>
        <FaceShapeBadge shape={mergedProfile.faceShape || "Oval"} onClick={() => { setPickerStartTab("Quick Pick"); setPickerOpen(true); }} />
      </div>

      <div className="mb-4 text-sm text-slate-600">
        These picks are tailored to your <span className="font-medium">{mergedProfile.faceShape || "Oval"}</span> face shape and recent bookings.
      </div>

      {/* Don't know face shape CTA */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="font-medium">Don’t know your face shape?</div>
        <p className="mt-1 text-sm text-slate-600">Take a 60‑second guided quiz and we’ll fine‑tune your suggestions automatically.</p>
        <button
          onClick={() => { setPickerStartTab("Guided Quiz"); setPickerOpen(true); }}
          className="mt-3 btn btn-primary"
        >
          Find my face shape
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {recs.map((s) => (
          <StyleCard key={s.id} s={s} onBook={onBook} onBookLocal={handleBookLocal} />
        ))}
      </div>

      <FaceShapePickerModal
        open={pickerOpen}
        defaultShape={mergedProfile.faceShape || "Oval"}
        onClose={() => setPickerOpen(false)}
        onSave={(shape) => saveProfile({ ...profile, faceShape: shape })}
        startTab={pickerStartTab}
      />
    </div>
  );
}
