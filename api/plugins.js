import { db } from "hatchable";

export const access = "public";

const plugins = [
  {id:"web-research",name:"Web Research",category:"Research",icon:"🌐",description:"Search and synthesize public web information."},
  {id:"web-page-reader",name:"Web Page Reader",category:"Research",icon:"📖",description:"Read and extract useful content from public pages."},
  {id:"document-tools",name:"Document Studio",category:"Files",icon:"📄",description:"Create, transform, summarize, and structure documents."},
  {id:"pdf-tools",name:"PDF Studio",category:"Files",icon:"📕",description:"Work with PDF-oriented document workflows."},
  {id:"data-analyzer",name:"Data Analyzer",category:"Data",icon:"📊",description:"Analyze CSV, JSON, tables, and structured data."},
  {id:"code-builder",name:"Code Builder",category:"Developer",icon:"💻",description:"Generate, debug, refactor, and explain software."},
  {id:"app-maker",name:"App Maker",category:"Create",icon:"▣",description:"Turn natural-language ideas into previewable web apps."},
  {id:"website-builder",name:"Website Builder",category:"Create",icon:"🖥️",description:"Create landing pages, portfolios, dashboards, and sites."},
  {id:"game-builder",name:"Game Builder",category:"Create",icon:"🎮",description:"Prototype browser games and interactive experiences."},
  {id:"image-studio",name:"Image Studio",category:"Media",icon:"🎨",description:"Plan and orchestrate image/design generation workflows."},
  {id:"video-studio",name:"Video Studio",category:"Media",icon:"🎬",description:"Plan scripts, shots, captions, voiceovers, and video workflows."},
  {id:"voice-studio",name:"Voice Studio",category:"Media",icon:"🎙️",description:"Create voiceover scripts, narration plans, and audio workflows."},
  {id:"music-studio",name:"Music Studio",category:"Media",icon:"🎵",description:"Build music concepts, lyrics, structure, and production plans."},
  {id:"presentation-studio",name:"Presentation Studio",category:"Create",icon:"📽️",description:"Create slide structures, speaker notes, and presentation content."},
  {id:"brand-studio",name:"Brand Studio",category:"Create",icon:"✦",description:"Build names, identity systems, copy, and brand assets."},
  {id:"automation-builder",name:"Automation Builder",category:"Automate",icon:"⚙️",description:"Design repeatable workflows and API-driven automations."},
  {id:"agent-builder",name:"Agent Builder",category:"Agents",icon:"🤖",description:"Design specialized AI agents and tool workflows."},
  {id:"cyber-lab",name:"Cyber Lab",category:"Security",icon:"🔐",description:"Defensive security, authorized labs, CTFs, and analysis."},
  {id:"json-tools",name:"JSON Tools",category:"Developer",icon:"{}",description:"Format, validate, transform, and inspect JSON."},
  {id:"text-tools",name:"Text Tools",category:"Productivity",icon:"✎",description:"Rewrite, summarize, compare, extract, and transform text."},
  {id:"calculator",name:"Calculator",category:"Utilities",icon:"∑",description:"Math, unit reasoning, and structured calculations."},
  {id:"project-helper",name:"Project Maker Helper",category:"Developer",icon:"◈",description:"Plan milestones, architecture, debugging, and shipping."},
  {id:"knowledge-bridge",name:"Knowledge Bridge",category:"Knowledge",icon:"🧠",description:"Connect HAxBRO reasoning to its internal knowledge warehouse."}
];

export default async function(req,res){
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
  res.json({ok:true,plugins,generatedAt:new Date().toISOString()});
}