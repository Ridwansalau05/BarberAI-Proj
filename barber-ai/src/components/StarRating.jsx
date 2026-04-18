// src/components/StarRating.jsx
import React from "react";
import { Star } from "lucide-react";

export default function StarRating({ value = 0, onChange, size = 20 }) {
  return (
    <div className="inline-flex items-center gap-1">
      {[...Array(5)].map((_, i) => {
        const filled = i < value;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange?.(i + 1)}
            className="p-1"
            aria-label={`Rate ${i + 1} star`}
          >
            <Star
              className={filled ? "text-amber-500" : "text-slate-300"}
              style={{ width: size, height: size }}
              fill={filled ? "currentColor" : "none"}
            />
          </button>
        );
      })}
    </div>
  );
}

