// Simple, explainable, rule-based engine: face shape + booking history boosts.
// src/ai/rules.js
export const STYLES = [
  {
    id: "modern-fade",
    name: "Modern Fade",
    faceShapes: ["Oval", "Square"],
    maintenance: "Medium",
    difficulty: "Medium",
    image: 
      "https://image.pollinations.ai/prompt/portrait%20male%20modern%20skin%20fade%20%2B%20clean%20lineup%2C%20barbershop%20studio%2C%2035mm%20photo%2C%20sharp%20focus%2C%20neutral%20background?width=1200&height=800&nologo=true",
    imageAlt: "AI image of a clean modern skin fade with sharp lineup",
    service: "Skin Fade",
  },
  {
    id: "classic-side-part",
    name: "Classic Side Part",
    faceShapes: ["Oval", "Square", "Heart"],
    maintenance: "Low",
    difficulty: "Easy",
    image:
      "https://image.pollinations.ai/prompt/portrait%20male%20classic%20side%20part%20%2B%20comb%20line%2C%20barbershop%20studio%2C%20soft%20lighting%2C%20editorial%20look?width=1200&height=800&nologo=true",
    imageAlt: "AI image of a classic side part hairstyle with defined part",
    service: "Haircut & Styling",
  },
  {
    id: "textured-crop",
    name: "Textured Crop",
    faceShapes: ["Round", "Oval"],
    maintenance: "Medium",
    difficulty: "Medium",
    image:
      "https://image.pollinations.ai/prompt/portrait%20male%20textured%20crop%20%2B%20short%20sides%2C%20matte%20finish%2C%20studio%20lighting%2C%20high%20detail?width=1200&height=800&nologo=true",
    imageAlt: "AI image of a short textured crop with matte finish",
    service: "Haircut & Styling",
  },
  {
    id: "tight-taper",
    name: "Tight Taper",
    faceShapes: ["Round", "Diamond", "Square"],
    maintenance: "Low",
    difficulty: "Medium",
    image:
      "https://image.pollinations.ai/prompt/portrait%20male%20tight%20taper%20%2B%20natural%20neckline%2C%20clean%20barbershop%20studio%2C%20sharp%20detail%2C%20professional%20look?width=1200&height=800&nologo=true",
    imageAlt: "AI image of a tight taper haircut with clean neckline",
    service: "Haircut & Styling",
  },
  {
    id: "low-fade-beard",
    name: "Low Fade + Beard",
    faceShapes: ["Oval", "Square", "Round"],
    maintenance: "Medium",
    difficulty: "Medium",
    image:
      "https://image.pollinations.ai/prompt/portrait%20male%20low%20fade%20%2B%20well-groomed%20full%20beard%2C%20barbershop%20studio%2C%20dramatic%20lighting%2C%20high%20detail?width=1200&height=800&nologo=true",
    imageAlt: "AI image of a low fade blended into a shaped full beard",
    service: "Cut + Beard",
  },
  {
    id: "buzz-clean",
    name: "Buzz & Clean",
    faceShapes: ["Square", "Diamond"],
    maintenance: "Very Low",
    difficulty: "Easy",
    image:
      "https://image.pollinations.ai/prompt/portrait%20male%20very%20short%20buzz%20cut%20%2B%20clean%20shaven%2C%20studio%20lighting%2C%20minimal%20background%2C%20sharp%20focus?width=1200&height=800&nologo=true",
    imageAlt: "AI image of a very short buzz cut with clean-shaven face",
    service: "Haircut & Styling",
  },
];




export function getStyleRecommendations(profile = {}, history = []) {
  const face = (profile.faceShape || "Oval").toLowerCase();
  const prefWeights = (profile.prefWeights || {});

  // Count bookings by service for a simple popularity signal
  const serviceCounts = history.reduce((acc, a) => {
    acc[a.service] = (acc[a.service] || 0) + 1;
    return acc;
  }, {});
  const mostRecentService = history[0]?.service;

  const scored = STYLES.map((style) => {
    let score = 0;

    // Face shape match (biggest factor)
    const matchesFace = style.faceShapes.some(
      (fs) => fs.toLowerCase() === face
    );
    score += matchesFace ? 0.6 : 0.2; // if no match, still allow but lower

    // Popularity with this user (how often they've booked that service)
    const svcBoost = Math.min((serviceCounts[style.service] || 0) * 0.08, 0.24);
    score += svcBoost;

    // Recency nudge if the last appointment matches this service
    if (mostRecentService && mostRecentService === style.service) {
      score += 0.08;
    }

    // Preference weights from feedback keywords (simple rule-based)
    const name = `${style.name} ${style.service}`.toLowerCase();
    const prefMap = {
      fade: /fade/.test(name),
      taper: /taper/.test(name),
      beard: /beard/.test(name),
      buzz: /buzz/.test(name),
      classic: /classic|side part/.test(name),
      crop: /crop/.test(name),
    };
    Object.entries(prefMap).forEach(([k, matches]) => {
      if (matches && prefWeights[k]) {
        // each +1 weight adds up to +0.06 (max small nudge)
        const w = Math.max(-2, Math.min(3, Number(prefWeights[k])));
        score += 0.06 * w;
      }
    });

    // Clamp
    if (score > 1) score = 1;

    return { ...style, score };
  });

  // Sort by confidence (desc)
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// Utility: pick the next good time window (for your sidebar hints, if needed)
export function bestTimeWindow(history = []) {
  // naive example: if most history is on weekends, suggest Thu–Sat evenings
  const win = { label: "Thu 5–7pm or Sat 10–12", reason: "based on your history" };
  return win;
}

// Persist recommendations for a user based on current profile + history
// Used by BookingPage after a booking is confirmed.
export function writeRecommendationsForUser(userId, profile = {}, recentBooking = null) {
  try {
    const keyHistory = `history:${userId}`;
    const keyRecs = `recs:${userId}`;

    const history = JSON.parse(localStorage.getItem(keyHistory) || "[]");
    // Optionally include the just-confirmed booking in the signal
    const enrichedHistory = recentBooking
      ? [
          {
            dateISO: recentBooking.dateISO,
            time: recentBooking.time,
            service: recentBooking?.service?.name,
            duration: recentBooking?.service?.duration,
            barber: recentBooking?.barber?.id,
            shop: recentBooking?.shop?.id,
          },
          ...history,
        ]
      : history;

    const recs = getStyleRecommendations(profile, enrichedHistory);
    localStorage.setItem(keyRecs, JSON.stringify(recs));
  } catch (_) {
    // swallow storage errors in demo context
  }
}
