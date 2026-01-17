import { db } from "../firebaseadmin/firebaseadmin.js";
import {
  geohashQueryBounds,
  distanceBetween,
} from "geofire-common";

export async function getNearbyGarbageReports(
  userLat,
  userLng,
  radiusInKm = 10
) {
  const center = [userLat, userLng];
  const radiusInM = radiusInKm * 1000;

  
  const bounds = geohashQueryBounds(center, radiusInM);

  const promises = [];

  
  for (const b of bounds) {
    const q = db
      .collection("garbageReports")
      .where("status", "==", "OPEN")
      .orderBy("geohash")
      .startAt(b[0])
      .endAt(b[1]);

    promises.push(q.get());
  }

 
  const snapshots = await Promise.all(promises);
  const matchingReports = [];

  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      const data = doc.data();

      const distanceInKm = distanceBetween(
        [data.location.lat, data.location.lng],
        center
      );

      // 🔹 Step 4: Precise distance filter
      if (distanceInKm <= radiusInKm) {
        matchingReports.push({
          id: doc.id,
          ...data,
          distance: Number(distanceInKm.toFixed(2)),
        });
      }
    }
  }

  return matchingReports;
}
