import { useAuthStore } from "../../../store/useAuthStore";
import { ref, set, get, update } from "firebase/database";
import { db } from "../../../firebase/firebase";
import { api } from "../../../lib/api";
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

function encodeGeohash(lat, lon, precision = 9) {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = "";

  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const lonMid = (lonMin + lonMax) / 2;
      if (lon >= lonMid) {
        idx = idx * 2 + 1;
        lonMin = lonMid;
      } else {
        idx = idx * 2;
        lonMax = lonMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) {
        idx = idx * 2 + 1;
        latMin = latMid;
      } else {
        idx = idx * 2;
        latMax = latMid;
      }
    }
    evenBit = !evenBit;

    if (++bit === 5) {
      geohash += BASE32.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }
  return geohash;
}

function decodeGeohash(geohash) {
  let evenBit = true;
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  for (let i = 0; i < geohash.length; i++) {
    const chr = geohash.charAt(i);
    const idx = BASE32.indexOf(chr);
    if (idx === -1) throw new Error("Invalid geohash");

    for (let n = 4; n >= 0; n--) {
      const bitN = (idx >> n) & 1;
      if (evenBit) {
        const lonMid = (lonMin + lonMax) / 2;
        if (bitN === 1) {
          lonMin = lonMid;
        } else {
          lonMax = lonMid;
        }
      } else {
        const latMid = (latMin + latMax) / 2;
        if (bitN === 1) {
          latMin = latMid;
        } else {
          latMax = latMid;
        }
      }
      evenBit = !evenBit;
    }
  }
  
  return {
    lat: (latMin + latMax) / 2,
    lng: (lonMin + lonMax) / 2
  };
}


export const saveRouteToDatabase = async (routeData) => {
  try {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error("User not found");

    const {
      destination_place_id,
      end_address,
      start_coords,
      end_coords,
      travel_mode,
    } = routeData;

    const user_id = user.sub;
    const route_id = destination_place_id; 

    const start_lat = start_coords.lat;
    const start_lng = start_coords.lng;
    const end_lat = end_coords.lat;
    const end_lng = end_coords.lng;

    // --- NEW: EXTRACT USER INFO ---
    const userImage = user.picture || user.photoURL || "";
    const userName = user.name || "User";

    /* ---------------- 1. USER ACTIVE ---------------- */
    await set(ref(db, `women/user_active/${user_id}`), {
      routeId: route_id,
      start: { start_lat, start_lng },
      end: { end_lat, end_lng },
      current: { start_lat, start_lng },
      status: "active",
      // ADDED HERE
      userImage: userImage, 
      userName: userName
    });

    /* ---------------- 2. ROUTE ---------------- */
    const routeRef = ref(db, `women/routes/${route_id}`);
    const routeSnap = await get(routeRef);

    if (!routeSnap.exists()) {
      await set(routeRef, {
        start: { start_lat, start_lng },
        end: { end_lat, end_lng },
        destinationplace_id: destination_place_id,
        endaddress: end_address,
        lastUpdated: Date.now(),
        userCount: 1,
      });
    } else {
      await update(routeRef, {
        userCount: (routeSnap.val().userCount || 0) + 1,
        lastUpdated: Date.now(),
      });
    }

    /* ---------------- 3. ROOM ---------------- */
    const roomRef = ref(db, `women/rooms/${route_id}`);
    const roomSnap = await get(roomRef);

    if (!roomSnap.exists()) {
      await set(roomRef, {
        routeId: route_id,
        createdAt: Date.now(),
      });
    }

    /* ---------------- 4. ROOM MEMBER ---------------- */
    await set(ref(db, `women/rooms/${route_id}/members/${user_id}`), {
      joinedAt: Date.now(),
      current_lat: start_lat,
      current_lng: start_lng,
      status: "active",
      // ADDED HERE (Vital for Map visualization)
      userImage: userImage,
      userName: userName,
      travelmode: travel_mode
    });

    /* ---------------- 5. LOCAL ROOM CLUSTERING ---------------- */
    const localRoomsRef = ref(db, "women/localroom");
    const localRoomsSnap = await get(localRoomsRef);

    let alreadyInLocalRoom = false;
    let bestClusterGeohash = null;
    let minDistance = 5; 

    if (localRoomsSnap.exists()) {
      const allClusters = localRoomsSnap.val();

      for (const [geohashId, roomsInCluster] of Object.entries(allClusters)) {
        if (roomsInCluster[route_id]) {
          alreadyInLocalRoom = true;
          break;
        }
      }

      if (!alreadyInLocalRoom) {
        for (const geohashId of Object.keys(allClusters)) {
          try {
            const center = decodeGeohash(geohashId);
            const dist = getDistanceFromLatLonInKm(start_lat, start_lng, center.lat, center.lng);

            if (dist < minDistance) {
              minDistance = dist;
              bestClusterGeohash = geohashId;
            }
          } catch (e) {
            console.warn(`Invalid geohash key in DB: ${geohashId}`);
          }
        }
      }
    }

    if (!alreadyInLocalRoom) {
      let targetGeohash = bestClusterGeohash;
      if (!targetGeohash) {
        targetGeohash = encodeGeohash(start_lat, start_lng);
      } 
      await set(ref(db, `women/localroom/${targetGeohash}/${route_id}`), {
        start_lat: start_lat,
        start_lng: start_lng, 
        end_lat: end_lat,
        end_lng: end_lng,     
      });
      await update(ref(db, `women/routes/${route_id}`), {
        geoHash: targetGeohash
      });
    }

    /* ---------------- 6. BACKEND NOTIFY ---------------- */
    await api.post(
      `/api/room/room_data`,
      { roomId: route_id, userId: user_id },
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("Route + Room + LocalRoom processed successfully");

  } catch (error) {
    console.error("Error saving route:", error);
  }
};