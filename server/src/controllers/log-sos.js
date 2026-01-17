import { db } from "../firebaseadmin/firebaseadmin.js";
const log_sos=async(req,res)=>{
    const { routeId, userId, context, score } = req.body;
    try {
        if(!routeId){
            return res.status(400).json({ error: "routeId is required" });
        }
        if(!userId){
            return res.status(400).json({ error: "userId is required" });
        }
        if(context===undefined){
            return res.status(400).json({ error: "context is required" });
        }
        if(score===undefined){
            return res.status(400).json({ error: "score is required" });
        }
        await db.collection('model_sos_activity').add({
        routeId,
        userId,
        reason: context,
        score,
        timestamp: new Date()
        });
        res.json({ status: "logged" });
    } catch (e) {
        res.status(500).send(e.toString());
    }
}
export default log_sos