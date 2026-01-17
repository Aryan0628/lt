import "./config/env.js"; // MUST be first
import { app } from "./app.js";
import startCronJobs from "./src/utils/cronJobs.js";
const port = process.env.PORT || 5000;
app.listen(port, () => {
  startCronJobs();
  console.log(`Server running on port ${port}`);
});
