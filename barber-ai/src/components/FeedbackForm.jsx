// src/components/FeedbackForm.jsx
import React from "react";
import { createFeedback, bumpBarberAggregates, getCurrentUser } from "../lib/db";

export default function FeedbackForm({ appointment, onSubmitted }) {
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!rating || !appointment) return;
    setLoading(true);

    const me = getCurrentUser();
    try {
      const fid = await createFeedback({
        appointmentId: appointment.id,
        barberId: appointment.barber || appointment.barberId,
        customerId: me.id || me.email || "demo-user",
        rating: Number(rating),
        comment,
        customerName: appointment.customerName || me.name || me.firstName || "Customer",
        serviceName: appointment.service || appointment.serviceName,
        dateISO: appointment.dateISO,
      });
      await bumpBarberAggregates(appointment.barber || appointment.barberId, Number(rating));
      onSubmitted?.(fid, Number(rating));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-xl border border-slate-200 p-4 bg-white">
      <div className="font-medium">Leave feedback</div>
      <div className="mt-2 flex items-center gap-3">
        <label className="text-sm text-slate-700">Rating</label>
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1"
        >
          {[5,4,3,2,1].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="How was your cut?"
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
        rows={3}
      />
      <div className="mt-3 flex justify-end">
        <button disabled={loading} className="btn btn-primary disabled:opacity-50">
          {loading ? "Submitting..." : "Submit feedback"}
        </button>
      </div>
    </form>
  );
}

