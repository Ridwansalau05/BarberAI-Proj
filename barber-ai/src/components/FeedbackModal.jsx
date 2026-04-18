// src/components/FeedbackModal.jsx
import React from "react";
import { X } from "lucide-react";
import StarRating from "./StarRating";

export default function FeedbackModal({ open, onClose, onSubmit, context }) {
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setRating(0);
      setComment("");
    }
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm grid place-items-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-semibold">Rate Your Experience</div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-slate-700">
            How was your {context?.service || "service"} with {context?.barberName || "your barber"}?
          </div>
          <StarRating value={rating} onChange={setRating} size={22} />
          <div>
            <label className="text-sm font-medium text-slate-700">Comments (optional)</label>
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500 min-h-[96px]"
              placeholder="What went well? Anything to improve?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button
            disabled={rating === 0}
            onClick={() => onSubmit?.({ rating, comment })}
            className="btn btn-primary disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

