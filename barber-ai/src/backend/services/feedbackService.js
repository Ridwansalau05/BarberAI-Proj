import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

const FEEDBACK_COLLECTION = "feedback";

export async function getAverageRatingForBarber(barberId, shopId) {
  const snapshot = await getDocs(
    query(
      collection(db, FEEDBACK_COLLECTION),
      where("barberId", "==", barberId),
      where("shopId", "==", shopId),
    ),
  );

  if (snapshot.empty) {
    return null;
  }

  const ratings = snapshot.docs
    .map((feedbackDoc) => Number(feedbackDoc.data().rating))
    .filter((rating) => Number.isFinite(rating));

  if (ratings.length === 0) {
    return null;
  }

  const total = ratings.reduce((sum, rating) => sum + rating, 0);
  return Number((total / ratings.length).toFixed(1));
}
