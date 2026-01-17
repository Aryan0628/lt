import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { db } from "../firebaseadmin/firebaseadmin.js";
import { runHeatCheck } from "../gee/earth/surfaceHeat/landsat_surface_temp.js";
import { sendEmail } from "../utils/sendEmail.js"; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const updateSurfaceHeatReports = async (req, res) => {
  console.log("🔄 Starting Daily Surface Heat Report Update Cycle...");

  try {
    let credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credentialsPath && credentialsPath.startsWith('"') && credentialsPath.endsWith('"')) {
        credentialsPath = credentialsPath.slice(1, -1);
    }
    if (!credentialsPath) {
        console.error("❌ GEE credentials path env error");
        return;
    }
    if (!path.isAbsolute(credentialsPath)) {
        credentialsPath = path.resolve(process.cwd(), credentialsPath);
    }
    if (!fs.existsSync(credentialsPath)) {
        console.error("❌ GEE credentials file not found");
        return;
    }


    const alertsSnap = await db.collectionGroup("surface_heat_alerts").get();

    if (alertsSnap.empty) {
      console.log("No active alerts found.");
      if (res) return res.status(200).json({ message: "No alerts found" });
      return;
    }

    const updates = [];

    for (const doc of alertsSnap.docs) {
        const alertId = doc.id;           
        const alertData = doc.data(); 
        const reportRef = alertData.reportRef;
    
        const userId = doc.ref.parent.parent.id; 

        if (!reportRef) {
            console.warn(`⚠️ Skipping Alert ${alertId}: Missing reportRef.`);
            continue;
        }

        try {
            const reportDocRef = db.collection("landheat_reports")
                                   .doc(userId)
                                   .collection("reports")
                                   .doc(reportRef);
                                   
            const reportSnap = await reportDocRef.get();

            if (!reportSnap.exists) {
                console.log(`⚠️ Report ${reportRef} not found. Skipping.`);
                continue;
            }
 
            const reportData = reportSnap.data();
            let regionGeoJson;
            if (typeof reportData.regionGeoJson === 'string') {
                 regionGeoJson = JSON.parse(reportData.regionGeoJson);
            } else {
                 regionGeoJson = reportData.regionGeoJson;
            }
            
            const regionId = reportData.region_id;
            const buffermeters = reportData.parameters?.bufferMeters || 5000;
            const recentDays = reportData.parameters?.recentDays || 16;
            const thresholdCelsius = reportData.parameters?.threshold || 40; 


            console.log(`🌍 Running Heat Check for: ${regionId} (Buffer: ${buffermeters}m, Threshold: ${thresholdCelsius}°C)`);

            const analysisResult = await runHeatCheck(
                regionGeoJson,  
                regionId, 
                credentialsPath, 
                thresholdCelsius,
                buffermeters,   
                recentDays   
            );

            if (analysisResult && analysisResult.status === 'success') {
                const updatePromise = reportDocRef.update({
                    ...analysisResult,
                    lastUpdated: new Date(),
                    lastCronRun: new Date()
                });
                updates.push(updatePromise);
                console.log(`✅ Update queued for report: ${reportRef}`);

                if (analysisResult.alert_triggered === true) {
                    console.log(`🚨 ALERT TRIGGERED for ${regionId}. Fetching user email...`);
                    const userDoc = await db.collection("users").doc(userId).get();
                    
                    if (userDoc.exists && userDoc.data().email) {
                        const userEmail = userDoc.data().email;
                        await sendEmail({
                            to: userEmail,
                            subject: `🚨 High Surface Heat Alert: ${regionId}`,
                            text: `Heat Alert detected in ${regionId}. Max Temp: ${analysisResult.max_temp_celsius}°C`,
                            html: `
                                <h3>Surface Heat Alert Triggered</h3>
                                <p>Region: <b>${regionId}</b></p>
                                <p>Max Temperature Detected: <b>${analysisResult.max_temp_celsius}°C</b></p>
                                <p>Mean Temperature: <b>${analysisResult.mean_temp_celsius}°C</b></p>
                                <p>Alert Threshold: <b>${thresholdCelsius}°C</b></p>
                                <p>Status: <b>${analysisResult.heat_status || 'CRITICAL'}</b></p>
                                <br/>
                                <p>Please check your UrbanFlow dashboard for the heat distribution map.</p>
                            `
                        });
                    } else {
                        console.warn(`Cannot send email: No email found for user ${userId} in 'users' collection.`);
                    }
                }

            } else {
                console.error(`❌ Analysis failed for ${regionId}:`, analysisResult?.message);
            }

        } catch (innerError) {
            console.error(`❌ Error processing alert ${alertId}:`, innerError.message);
        }
    }
    await Promise.all(updates);

    console.log(`🎉 Cycle Complete. Updated ${updates.length} reports.`);
    
    if (res) return res.status(200).json({ success: true, updated: updates.length });

  } catch (error) {
    console.error("❌ Critical Cron Job Error:", error);
    if (res) return res.status(500).json({ error: error.message });
  }
};