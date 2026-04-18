import React from "react";
import { Quote, Star } from "lucide-react";

/** Small star rating component (supports 0–5 with halves/decimals) */
/** Precise per-star rating (0–5, supports decimals) */
function StarRating({ value }) {
    // clamp 0..5
    const v = Math.max(0, Math.min(5, value));
    const full = Math.floor(v);
    const frac = v - full;              // 0..1
    const empty = 5 - Math.ceil(v);
  
    // Solid (filled) and outline stars (no external deps)
    const StarSolid = ({ className = "h-5 w-5" }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z"
        />
      </svg>
    );
    const StarOutline = ({ className = "h-5 w-5" }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z"
        />
      </svg>
    );
  
    return (
      <div className="inline-flex items-center gap-0 leading-none">
        {/* full stars */}
        {Array.from({ length: full }).map((_, i) => (
          <StarSolid key={`full-${i}`} className="h-5 w-5 text-brand-gold" />
        ))}
  
        {/* partial star (if needed) */}
        {frac > 0 && (
          <div className="relative h-5 w-5">
            <StarOutline className="h-5 w-5 text-slate-300" />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${frac * 100}%` }}
              aria-hidden="true"
            >
              <StarSolid className="h-5 w-5 text-brand-gold" />
            </div>
          </div>
        )}
  
        {/* empty stars */}
        {Array.from({ length: empty }).map((_, i) => (
          <StarOutline key={`empty-${i}`} className="h-5 w-5 text-slate-300" />
        ))}
      </div>
    );
  }
  

const reviews = [
  {
    name: "Lebron J.",
    title: "Software Engineer",
    rating: 5,
    quote:
      "The AI style suggestions were spot on. Booking took 30 seconds and the cut was the best I’ve had in years.",
  },
  {
    name: "Lionel M.",
    title: "Student",
    rating: 4.5,
    quote:
      "Love the reminders and rebook flow. My barber already knew my preferred fade and beard trim settings.",
  },
  {
    name: "Lewis H.",
    title: "Photographer",
    rating: 5,
    quote:
      "Premium experience from start to finish. Gallery history helps me keep the exact look before a shoot.",
  },
  {
    name: "Stephen C.",
    title: "Product Designer",
    rating: 4.5,
    quote:
      "Clean UI, fast checkout, and the recommendations actually match my face shape. I’m sold.",
  },
  {
    name: "JJ O.",
    title: "Athlete",
    rating: 5,
    quote:
      "Same-day availability and quick rebooking saved me before a game. Barbers on here are pros.",
  },
  {
    name: "Israel A.",
    title: "Consultant",
    rating: 4.6,
    quote:
      "Consistent results every visit. Ratings and profiles make it easy to pick the right barber when I travel.",
  },
];

export default function Reviews() {
  // simple average from the array above
  const avg =
    Math.round(
      (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10
    ) / 10;

  return (
    <section id="reviews" className="bg-white">
      {/* top accent line (reusable gradient rule) */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-brand-gold/60 to-transparent" />

      <div className="container-xl py-16 sm:py-20">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            What Our Users Say
          </h2>

          <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
            <StarRating value={avg} />
            <span className="text-slate-700 font-semibold">{avg}</span>
            <span className="text-slate-500">out of 5 • {reviews.length}+ reviews</span>
          </div>
        </div>

        {/* reviews grid */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <article
              key={r.name}
              className="relative rounded-2xl p-[1px] bg-gradient-to-r from-brand-gold/40 via-brand-gold/10 to-transparent"
            >
              <div className="rounded-2xl bg-white p-6 shadow-soft h-full">
                <Quote className="h-6 w-6 text-brand-gold" />
                <blockquote className="mt-3 text-slate-700">
                  “{r.quote}”
                </blockquote>

                <footer className="mt-6 flex items-center gap-3">
                  {/* simple avatar circle from initials */}
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-gold/80 to-amber-400 text-white grid place-items-center font-bold">
                    {r.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{r.name}</div>
                    <div className="text-sm text-slate-500">{r.title}</div>
                    <div className="mt-1">
                      <StarRating value={r.rating} />
                    </div>
                  </div>
                </footer>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
