import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { db } from "../firebaseadmin/firebaseadmin.js";
import { runAirQualityCheck } from "../gee/earth/pollutants/sentinel5p_air_quality.js";
import { sendEmail } from "../utils/sendEmail.js"; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const updateAirQualityReports = async (req, res) => {
  console.log("🔄 Starting Daily Air Quality Report Update Cycle...");

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


    const alertsSnap = await db.collectionGroup("pollutant_alerts").get();

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
            const reportDocRef = db.collection("pollutant_reports")
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

            // --- CORRECTION 1: USE 'settings' NOT 'parameters' (Based on image_153fb7.png) ---
            // We use a fallback to 'parameters' just in case old data exists, but prioritize 'settings'
            const settings = reportData.settings || reportData.parameters || {};

            const regionId = reportData.region_id; // Variable is camelCase 'regionId'
            const buffermeters = settings.bufferMeters || 5000; // Fixed: 'bufferMeters'
            const recentDays = settings.recentDays || 6;
            const thresholdUsed = settings.threshold_used; // Fixed: 'threshold_used'
            
            // Pollutant code is often at top level or inside settings
            const pollutant = reportData.pollutant_code || settings.pollutant_code || 'NO2'; 

            console.log(`🌍 Running analysis for report: ${reportRef} (User: ${userId})`);
            console.log(`Parameters - Region: ${regionId}, Buffer: ${buffermeters}m, Recent Days: ${recentDays}, Threshold: ${thresholdUsed}, Pollutant: ${pollutant}`);

            const analysisResult = await runAirQualityCheck(
                regionGeoJson,  
                regionId, 
                credentialsPath, 
                thresholdUsed,
                buffermeters,   
                recentDays,
                pollutant   
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
                        
                        // --- CORRECTION 2: AIR QUALITY EMAIL TEMPLATE ---
                        await sendEmail({
                            to: userEmail,
                            subject: `🚨 Air Quality Alert (${pollutant}): ${regionId}`,
                            text: `Hazardous Air Quality detected in ${regionId}. Average ${pollutant}: ${analysisResult.average_value} mol/m^2`,
                            html: `
                                <h3>⚠️ Air Quality Alert Triggered</h3>
                                <p>Region: <b>${regionId}</b></p>
                                <p>Pollutant: <b>${pollutant}</b></p>
                                <p>Concentration: <b>${analysisResult.average_value} mol/m^2</b></p>
                                <p>Status: <b style="color:red;">${analysisResult.air_quality_status || 'Hazardous'}</b></p>
                                <p>Threshold: <b>${thresholdUsed}</b></p>
                                <br/>
                                <p>Please check your UrbanFlow dashboard for the pollution heatmap.</p>
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