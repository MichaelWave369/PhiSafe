// Dedicated local browser-test static server. It never reads household records.
import {createServer} from "node:http";
import {readFile, stat} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {resolve, relative, sep, extname} from "node:path";
const ROOT = resolve(fileURLToPath(new URL("../../",import.meta.url)));
const PORT = Number(process.env.PORT || 4173);
const TYPES={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",
  ".svg":"image/svg+xml",".webmanifest":"application/manifest+json",".json":"application/json"};
const server=createServer(async(req,res)=>{
  if(req.method!=="GET"&&req.method!=="HEAD"){res.writeHead(405).end();return;}
  try{
    const url = new URL(req.url,"http://127.0.0.1:"+PORT);
    const path = resolve(ROOT,"."+decodeURIComponent(url.pathname));
    const rel = relative(ROOT,path);
    if(rel.startsWith(".."+sep)||rel===".."||rel.startsWith(sep)||rel===""){ // root maps to index
      if(rel!=="") {res.writeHead(403).end();return;}
    }
    const file = rel==="" ? resolve(ROOT,"index.html") : path;
    const details=await stat(file);
    if(!details.isFile()){res.writeHead(404).end();return;}
    const body=await readFile(file);
    res.writeHead(200,{"Content-Type":TYPES[extname(file)]||"application/octet-stream",
      "Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
    res.end(req.method==="HEAD"?undefined:body);
  }catch(_){res.writeHead(404).end();}
});
server.listen(PORT,"127.0.0.1",()=>console.log("PhiSafe test server at http://127.0.0.1:"+PORT));
