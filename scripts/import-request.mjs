// The body read is part of each network attempt: disconnects after HTTP headers
// must be retried just like disconnects before headers.
export async function requestImport(config, suffix='', body, transport=fetch, pause=ms=>new Promise(r=>setTimeout(r,ms))) {
  for(let attempt=0;attempt<5;attempt++) {
    let result,text;
    try {
      result=await transport(config.origin+'/api/library-import'+suffix, {
        method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(90000),
        headers:{'OAI-Sites-Authorization':'Bearer '+config.sitesToken,'x-jfsi-import-token':config.importToken,...(body?{'Content-Type':'application/octet-stream'}:{})},body,
      });
      text=await result.text();
    } catch {
      if(attempt===4)throw new Error('Transfert interrompu après 5 tentatives ; relancer pour reprendre.');
      await pause(1000*2**attempt);continue;
    }
    if([429,500,502,503,504].includes(result.status)&&attempt<4){await pause(1000*2**attempt);continue;}
    let data;try{data=JSON.parse(text);}catch{throw new Error('Réponse inattendue (HTTP '+result.status+').');}
    if(!result.ok)throw new Error('Import refusé (HTTP '+result.status+') : '+String(data.error||'erreur').slice(0,200));
    return data;
  }
}
