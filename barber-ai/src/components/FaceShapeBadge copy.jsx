// src/components/FaceShapeBadge.jsx
import React from "react";
import { Pencil } from "lucide-react";

export default function FaceShapeBadge({ shape = "Oval", onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-sm inline-flex items-center gap-2 text-slate-800 hover:bg-amber-100"
      aria-label="Edit face shape"
   >
      <span className="font-medium">Face shape:</span>
      <span className="font-semibold">{shape}</span>
      <Pencil className="h-4 w-4 text-amber-700" />
    </button>
  );
}

