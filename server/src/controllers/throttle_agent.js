
import { configDotenv } from "dotenv";
configDotenv();
import axios from "axios"
const throttle_agent=async(req,res)=>{
    try {
        const {message,userId,routeId}=req.body;
        const url=process.env.PYTHON_SERVER
        console.log("Python server",url)
        const response=await axios.post(`${url}/throttle`,{
            message,
            userId,
            routeId
        })
        res.status(200).json(response.data)
    } catch (error) {
        if (error.response) {
        console.error("❌ Throttle  VALIDATION ERROR:");
        console.error(JSON.stringify(error.response.data, null, 2)); // This prints the exact missing field
        } else {
            console.error("❌ CONNECTION ERROR:", error.message);
        }
        res.status(500).json({ error: "throttle Failed" });
    }
}
export default throttle_agent