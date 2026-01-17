import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { db } from "../firebaseadmin/firebaseadmin.js";
import { runDeforestationCheck } from "../gee/earth/deforestation/copernicus_deforestation.js"; 
import { sendEmail } from "../utils/sendEmail.js"; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const updateDeforestationReports = async (req, res) => {
  console.log("🔄 Starting Daily Deforestation Report Update Cycle...");

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


    const alertsSnap = await db.collectionGroup("deforestation_alerts").get();

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
            const reportDocRef = db.collection("deforestation_reports")
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
            const region_id = reportData.region_id;
            const buffermeters = reportData.parameters?.buffer || 1000;
            const previousDays = reportData.parameters?.baselineDays || 90;
            const threshold = reportData.parameters?.threshold || 6; 

            console.log(`🌍 Running analysis for report: ${reportRef} (User: ${userId})`);
            console.log(`Parameters - Region: ${region_id}, Buffer: ${buffermeters}m, Baseline Days: ${previousDays}, Threshold: ${threshold}%`);

            const analysisResult = await runDeforestationCheck(
                regionGeoJson,  
                region_id, 
                credentialsPath, 
                threshold,
                buffermeters,   
                previousDays   
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
                    console.log(`🚨 ALERT TRIGGERED for ${region_id}. Fetching user email...`);
                    const userDoc = await db.collection("users").doc(userId).get();
                    
                    if (userDoc.exists && userDoc.data().email) {
                        const userEmail = userDoc.data().email;
                        
                        await sendEmail({
                            to: userEmail,
                            subject: `🚨 Deforestation Alert: ${region_id}`,
                            text: `Alert detected in ${region_id}. Forest loss: ${analysisResult.mean_ndvi_change}%`,
                            html: `
                                <h3>Deforestation Alert Triggered</h3>
                                <p>Region: <b>${region_id}</b></p>
                                <p>Forest Loss(NDVI): <b>${analysisResult.mean_ndvi_change}</b></p>
                                <p>Threshold: <b>${threshold}%</b></p>
                                <p>Please check your dashboard immediately.</p>
                            `
                        });
                    } else {
                        console.warn(`Cannot send email: No email found for user ${userId} in 'users' collection.`);
                    }
                }

            } else {
                console.error(`❌ Analysis failed for ${region_id}:`, analysisResult?.message);
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