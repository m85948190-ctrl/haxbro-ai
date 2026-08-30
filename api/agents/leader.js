import { db, ai, browser } from "hatchable";
export const access = "admin";
export const methods = ["POST"];
export default async function(req,res){
 const objective=String(req.body?.objective||'').trim();
 if(!objective)return res.status(400).json({error:'objective required'});
 const plan=await ai.generateText({model:'sonnet',purpose:'HAxBRO agent orchestration',system:'You are the HAxBRO Agent Leader. Break a knowledge objective into safe, independent research jobs. Never claim a job ran unless it actually ran. Return compact JSON array with task_type and target. Max 12 jobs per cycle.',prompt:objective,maxSteps:2});
 let jobs=[];try{jobs=JSON.parse(plan.text||plan);}catch{jobs=[];}
 if(!Array.isArray(jobs))jobs=[];
 const created=[];
 for(let i=0;i<jobs.length;i++){const j=jobs[i]||{};const r=await db.query('INSERT INTO haxbro_agent_jobs (worker_no,task_type,target) VALUES ($1,$2,$3) RETURNING id,worker_no,task_type,target,status',[i+1,String(j.task_type||'research'),String(j.target||objective)]);created.push(r.rows[0]);}
 res.json({ok:true,leader:'online',logical_worker_capacity:10000,cycle_jobs:created});
}