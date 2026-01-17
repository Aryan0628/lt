import cron from "node-cron";
import { updateDeforestationReports } from "../controllers/deforestationReportUpdater.js";
import { updateFireReports } from "../controllers/fireReportUpdater.js";
import { updateCoastalReports } from "../controllers/coastalReportUpdater.js";
import { updateFloodReports } from "../controllers/floodReportUpdater.js";
import { updateSurfaceHeatReports } from "../controllers/surfaceheatReportUpdater.js";
import { updateAirQualityReports } from "../controllers/pollutantReportUpdater.js";
const startCronJobs = async () => {
  console.log("🚀 Initializing Cron Jobs..."); 
  cron.schedule("0 0 * * *", async () => {
    console.log("⏰ Cron Job Triggered: Updating Reports...");
    await updateDeforestationReports(null, null); 
    await updateFireReports(null, null);
    await updateCoastalReports(null, null);
    await updateFloodReports(null,null); 
    await updateSurfaceHeatReports(null, null); 
    await updateAirQualityReports(null, null);
    console.log("✅ Report Updates Completed.");
  });
};
export default startCronJobs;
