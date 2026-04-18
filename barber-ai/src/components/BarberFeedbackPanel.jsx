// src/components/BarberFeedbackPanel.jsx
import React from "react";
import { listenFeedbackForBarber, getCurrentUser } from "../lib/db";
import { Star } from "lucide-react";

function Stars({ n = 0 }) {
  return (
    <div className="flex">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < n ? "text-amber-500" : "text-slate-300"}`} fill={i < n ? "currentColor" : "none"} />
      ))}
    </div>
  );
}

export default function BarberFeedbackPanel() {
  const me = getCurrentUser();
  const barberId = me.id || me.email || "barber-demo";
  const [items, setItems] = React.useState([]);
  const [limit, setLimit] = React.useState(3);

  React.useEffect(() => {
    if (!barberId) return;
    const unsub = listenFeedbackForBarber(barberId, setItems);
    return unsub;
  }, [barberId]);

  // Creative placeholders when no data yet
  const samples = [
    { id: "s1", customerName: "John A.", rating: 5, comment: "Clean skin fade. Sharp lineup — will rebook!", serviceName: "Skin Fade", dateISO: "2025-01-05" },
    { id: "s2", customerName: "Chloe C.", rating: 4, comment: "Loved the taper. Friendly and quick.", serviceName: "Taper + Beard", dateISO: "2025-01-03" },
    { id: "s3", customerName: "Diego R.", rating: 5, comment: "Best beard trim I’ve had in Binghamton.", serviceName: "Beard Trim", dateISO: "2024-12-28" },
    { id: "s4", customerName: "Maya T.", rating: 5, comment: "Classic side part was crisp — thank you!", serviceName: "Haircut & Styling", dateISO: "2024-12-21" },
    { id: "s5", customerName: "Alex K.", rating: 4, comment: "Buzz + clean up was super fast.", serviceName: "Haircut & Styling", dateISO: "2024-12-15" },
    { id: "s6", customerName: "Nina P.", rating: 5, comment: "Low fade + beard came out perfect.", serviceName: "Cut + Beard", dateISO: "2024-12-08" },
  ];
  const show = items.length ? items : samples;
  const visible = show.slice(0, limit);
  const hasMore = show.length > limit;
  const avg = show.length ? (show.reduce((s, x) => s + (x.rating || 0), 0) / show.length).toFixed(2) : "—";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="text-lg font-semibold">Recent Feedback</div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-600">
            Avg: <span className="font-semibold">{avg}</span> • Reviews: <span className="font-semibold">{show.length}</span>
          </div>
          {hasMore ? (
            <button className="btn btn-ghost btn-sm" onClick={() => setLimit((n) => n + 3)}>More</button>
          ) : (
            show.length > 3 && <button className="btn btn-ghost btn-sm" onClick={() => setLimit(3)}>Show less</button>
          )}
        </div>
      </div>
      <div className="px-5 pb-5 space-y-3">
        {visible.map((f) => (
            <div key={f.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{f.customerName || "Customer"}</div>
                <Stars n={f.rating || 0} />
              </div>
              {f.comment && <div className="mt-1 text-slate-700">{f.comment}</div>}
              <div className="mt-2 text-xs text-slate-500">{f.serviceName || "Service"} • {f.dateISO || ""}</div>
            </div>
          ))}

        {/* Mini insights */}
        <div className="rounded-xl border border-slate-200 p-4 bg-amber-50/30">
          <div className="text-sm font-medium text-slate-700">Insights</div>
          <ul className="mt-2 text-sm text-slate-700 space-y-1">
            <li>• Most praised: <span className="font-semibold">Skin Fade</span> and <span className="font-semibold">Beard Trim</span></li>
            <li>• Common keywords: <span className="font-semibold">“clean”, “quick”, “sharp”</span></li>
            <li>• Target next: offer <span className="font-semibold">Hot Towel Shave</span> upsell on tapers</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
