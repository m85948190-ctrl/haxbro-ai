import { ai } from 'hatchable';

export const access = 'public';
export const methods = ['POST'];

export default async function(req,res){
  const idea=typeof req.body?.idea==='string'?req.body.idea.trim():'';
  if(!idea||idea.length>12000)return res.status(400).json({error:'Describe the app you want to build.'});
  try{
    const result=await ai.generateText({model:'gpt-mini',purpose:'haxbro-app-maker',system:'You are HAxBRO App Maker. Turn a user idea into a practical, build-ready web application specification. Return concise sections: PRODUCT, FEATURES, PAGES, DATA, API, UI, BUILD PLAN. Do not claim that you actually deployed or created files.',prompt:idea,maxTokens:2200,signal:AbortSignal.timeout(60000)});
    return res.json({response:result.text,finishReason:result.finishReason});
  }catch(err){
    console.error('App Maker error',err);
    return res.status(502).json({error:'App Maker AI is temporarily unavailable. Try again.'});
  }
}