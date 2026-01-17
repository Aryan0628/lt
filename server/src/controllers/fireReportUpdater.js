import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { db } from "../firebaseadmin/firebaseadmin.js";
import { runFireProtectionCheck } from "../gee/earth/fire/viirs_fire_monitor.js"; 
import { sendEmail } from "../utils/sendEmail.js"; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const updateFireReports = async (req, res) => {
  console.log("🔄 Starting Daily Fire Report Update Cycle...");

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
    const alertsSnap = await db.collectionGroup("fire_alerts").get();

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
            const reportDocRef = db.collection("fire_reports")
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
            const buffermeters = reportData.parameters?.buffer || 5000;
            const previousDays = reportData.parameters?.daysBack || 5; 
            console.log(`🌍 Running analysis for report: ${reportRef} (User: ${userId})`);
            console.log(`Parameters - Region: ${regionId}, Buffer: ${buffermeters}m, Baseline Days: ${previousDays}, Threshold: ${threshold}%`);
            const analysisResult = await runFireProtectionCheck(
                regionGeoJson,  
                regionId, 
                credentialsPath,  
                previousDays ,
                buffermeters,   
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
                            subject: `🔥 Fire Alert: ${regionId}`,
                            text: `URGENT: Active fires detected in region ${regionId}. Fire Count: ${analysisResult.active_fire_count}. Scan Window: ${analysisResult.dates?.scan_window_start} to ${analysisResult.dates?.scan_window_end}.`,
                            html: `
                                <h3>🔥 Fire Alert Triggered</h3>
                                <p><b>Region:</b> ${regionId}</p>
                                <p><b>Active Fire Pixel Detected:</b> <span style="color:red; font-size:18px;">${analysisResult.active_fire_count}</span></p>
                                <p><b>Scan Period:</b> ${analysisResult.dates?.scan_window_start} to ${analysisResult.dates?.scan_window_end}</p>
                                <p><b>Buffer Zone:</b> ${analysisResult.parameters?.buffer} meters</p>
                                <br/>
                                <p>Please check your Dashboard immediately for </p>
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