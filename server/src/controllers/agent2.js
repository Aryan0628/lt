import axios from "axios"
const orchestrate_agent_2=async(req,res)=>{
    try {
        const {payload}=req.body;
        const url=process.env.PYTHON_SERVER
        const response=await axios.post(`${url}/agent2`,{
            payload,
        })
        res.status(200).json(response.data)
    } catch (error) {
        if (error.response) {
            console.error("❌ AGENT 2 VALIDATION ERROR:");
            console.error(JSON.stringify(error.response.data, null, 2)); 
        } else {
            console.error("❌ CONNECTION ERROR:", error.message);
        }
        res.status(500).json({ error: "Agent 2 Failed" });
}

}
export default orchestrate_agent_2