import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { runFloodCheck } from "../gee/earth/flood/sentinel1_flood.js";
import dotenv from "dotenv";
import { db } from "../firebaseadmin/firebaseadmin.js"; 

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureGeoJsonFormat(geometry) {
   
    if (!geometry || !geometry.coordinates) return geometry;

    const coords = geometry.coordinates;
    if (Array.isArray(coords) && coords.length > 0 && typeof coords[0] === 'object' && !Array.isArray(coords[0])) {
        
        console.log("Backend: Detected Google Maps format. Converting to GeoJSON...");

       
        let ring = coords.map(point => [point.lng, point.lat]);
        const first = ring[0];
        const last = ring[ring.length - 1];
        
        if (first[0] !== last[0] || first[1] !== last[1]) {
            ring.push(first);
        }

        return {
            type: 'Polygon',
            coordinates: [ring]
        };
    }
    return geometry;
}

export async function generateFloodReport(req, res) {
    try {
        const {
            regionGeoJson,
            regionId,
            thresholdPercent,
            recentDays,
            bufferMeters
        } = req.body;

        if (!regionGeoJson || !regionId) {
            return res.status(400).json({ 
                success: false, 
                error: "Missing required fields: regionGeoJson or regionId" 
            });
        }
        const sanitizedGeoJson = ensureGeoJsonFormat(regionGeoJson);

        let credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        
        if (credentialsPath && credentialsPath.startsWith('"') && credentialsPath.endsWith('"')) {
            credentialsPath = credentialsPath.slice(1, -1);
        }

        if (!credentialsPath) {
            return res.status(500).json({ success: false, error: "GEE credentials path env error" });
        }

        if (!path.isAbsolute(credentialsPath)) {
            credentialsPath = path.resolve(process.cwd(), credentialsPath);
        }

        if (!fs.existsSync(credentialsPath)) {
            return res.status(500).json({ success: false, error: "GEE credentials file not found" });
        }

        let flood_analysis_result = null;
        let reportref = null;
        try {
            flood_analysis_result = await runFloodCheck(
                sanitizedGeoJson,
                regionId, 
                credentialsPath, 
                thresholdPercent,
                recentDays,
                bufferMeters
            );

            if (!flood_analysis_result) {
                throw new Error("Analysis script returned no data");
            }

        } catch (innerError) {
            console.error("GEE Script Error:", innerError);
            return res.status(500).json({
                success: false,
                result: {
                    status: "error",
                    message: innerError.message,
                    alert_triggered: false,
                }
            });
        }

        
        const userId=req.auth.payload.sub;
        console.log("userid",userId);
        if (flood_analysis_result.status === 'success') {
            try {
                const report=await db.collection('flood_reports').doc(userId).collection('reports').add({
                    regionGeoJson:JSON.stringify(sanitizedGeoJson),
                    timestamp: new Date(),
                    paremters:{
                        recentDays:recentDays,
                        bufferMeters:bufferMeters,
                    },
                    ...flood_analysis_result 
                });
                reportref=report.id;
                console.log(`Report saved to Firestore for region: ${regionId}`);

            } catch (dbError) {
                console.error("Firebase Save Error:", dbError);
            }
        }

        return res.json({
            success: true,
            result: {
                ...flood_analysis_result,
                reportref,
            }
        });
    } catch (error) {
        console.error("Controller Error:", error);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            details: error.message
        });
    }
}