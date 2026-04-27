import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// KNP GENERATE-IMAGE-COMPOSITE v29
// v29: resolve image provider from configured backend secrets; fall back to Lovable AI Gateway
//      when GOOGLE_API_KEY is missing, and upload generated assets to the existing public bucket
// v28: force-redeploy to fix Deno worker init failure (RUNTIME_ERROR lineno:0)
// v27: aspectRatio param (1:1|9:16|16:9|3:4|4:3); referenceImages[] style guidance;
//      dynamic GRID_WRAPPER per aspect; fetchAsB64 helper
// v26: splitGrid INSET=3 — trim 3px from inner edges to exclude hairline seam
// v25: NEW MODES — raw|single|composite|batch|individual

const IMAGEN_MODEL   = "imagen-4.0-generate-001";
const IMAGEN_BASE    = "https://generativelanguage.googleapis.com/v1beta/models";
const GATEWAY_IMAGE_MODEL = "google/gemini-3.1-flash-image-preview";
const CELL_BUCKET    = "brand-assets";
const DEPLOY_VERSION = 29;
const API_CALL_COST  = 0.04; // per Imagen prediction
const SPLIT_INSET    = 3;    // px trimmed from each inner edge of 2x2 grid splits
const VALID_ARS      = new Set(["1:1","9:16","16:9","3:4","4:3"]);

type ImageProvider = {
  kind: "google-direct" | "gateway";
  apiKey: string;
  source: "GOOGLE_API_KEY" | "GEMINI_API_KEY" | "LOVABLE_API_KEY";
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

class UpstreamError extends Error {
  constructor(public httpStatus: number, message: string) { super(message); this.name = "UpstreamError"; }
}

function extractBrief(body: Record<string, unknown>): string {
  if (body["brief"])  return String(body["brief"]);
  if (body["sigmab"]) return String(body["sigmab"]);
  if (body["prompt"]) return String(body["prompt"]);
  for (const [k, v] of Object.entries(body)) {
    if (typeof v === "string" && v.length > 10) {
      const kl = k.toLowerCase();
      if (!kl.startsWith("platform") && kl !== "count" && kl !== "lane" && !kl.startsWith("raw") && kl !== "mode") return v;
    }
  }
  return "";
}

function knpCompress(raw: string): string {
  if (!raw) return "";
  let c = raw
    .replace(/\bgenerate\s+(a\s+)?(photorealistic\s+)?(marketing\s+)?/gi, "")
    .replace(/\bfor social media\b/gi, "")
    .replace(/\bno text[,\s]*no logos[,\s]*no typography[,\s]*no watermarks[,\s]*/gi, "no-text ")
    .replace(/\b(please|kindly|ensure|critical)\b[:\s]*/gi, "")
    .replace(/\bformat:\s*\d+[\u00d7x]\d+\b/gi, "")
    .replace(/\b1080[\u00d7x]1080\b/g, "")
    .replace(/\s{2,}/g, " ").replace(/,\s*,/g, ",").trim();
  if (c.length > 180) c = c.substring(0, 177).trimEnd() + "\u2026";
  return c || raw;
}

function makeGridWrapper(ar: string): string {
  const canvas = ar === "9:16" ? "portrait" : ar === "16:9" ? "landscape" : "square";
  return [
    `2\u00d72 GRID: single ${canvas} canvas, 4 equal cells (2 cols, 2 rows).`,
    "Each cell: complete photorealistic editorial shot, subjects fill frame, tight crop.",
    "All 4 cells thematically cohesive but visually distinct compositions.",
    "NO gaps, borders, seams, text, watermarks, or overlays. Full-bleed each cell.",
    "Cinematic quality, professional lighting.",
  ].join(" ");
}

async function fetchAsB64(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    const b = new Uint8Array(ab);
    let s = ""; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
  } catch { return null; }
}

async function inflateZlib(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate");
  const readPromise = new Response(ds.readable).arrayBuffer();
  const w = ds.writable.getWriter();
  await w.write(data); await w.close();
  return new Uint8Array(await readPromise);
}

function paeth(a: number, b: number, c: number): number {
  const p = a+b-c, pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

async function pngToRGBA(src: Uint8Array): Promise<{ w: number; h: number; rgba: Uint8Array }> {
  if (src[0] !== 137 || src[1] !== 80 || src[2] !== 78 || src[3] !== 71)
    throw new Error(`Not a PNG (${src[0]} ${src[1]} ${src[2]} ${src[3]})`);
  let off = 8, W = 0, H = 0, ct = 0, bd = 0;
  const idats: Uint8Array[] = [];
  while (off + 12 <= src.length) {
    const len = ((src[off]<<24)|(src[off+1]<<16)|(src[off+2]<<8)|src[off+3]) >>> 0;
    const type = String.fromCharCode(src[off+4],src[off+5],src[off+6],src[off+7]);
    const d = src.subarray(off+8, off+8+len);
    if (type === "IHDR") { W=((d[0]<<24)|(d[1]<<16)|(d[2]<<8)|d[3])>>>0; H=((d[4]<<24)|(d[5]<<16)|(d[6]<<8)|d[7])>>>0; bd=d[8]; ct=d[9]; }
    else if (type === "IDAT") idats.push(d.slice());
    else if (type === "IEND") break;
    off += 12+len;
  }
  if (!W||!H) throw new Error("PNG: no IHDR");
  if (bd !== 8) throw new Error(`PNG: unsupported bitdepth ${bd}`);
  if (ct !== 2 && ct !== 6) throw new Error(`PNG: unsupported colortype ${ct}`);
  const idat = new Uint8Array(idats.reduce((a,b)=>a+b.length,0));
  let io = 0; for (const p of idats) { idat.set(p,io); io += p.length; }
  const raw = await inflateZlib(idat);
  const bpp = ct===6 ? 4 : 3, stride = W*bpp;
  const pix = new Uint8Array(W*H*bpp);
  for (let y = 0; y < H; y++) {
    const filt = raw[y*(stride+1)];
    const s = raw.subarray(y*(stride+1)+1, y*(stride+1)+1+stride);
    const d = pix.subarray(y*stride, (y+1)*stride);
    const pr = y>0 ? pix.subarray((y-1)*stride, y*stride) : new Uint8Array(stride);
    if      (filt===0) d.set(s);
    else if (filt===1) { for (let i=0;i<stride;i++) d[i]=(s[i]+(i>=bpp?d[i-bpp]:0))&0xff; }
    else if (filt===2) { for (let i=0;i<stride;i++) d[i]=(s[i]+pr[i])&0xff; }
    else if (filt===3) { for (let i=0;i<stride;i++) d[i]=(s[i]+(((i>=bpp?d[i-bpp]:0)+pr[i])>>1))&0xff; }
    else if (filt===4) { for (let i=0;i<stride;i++) d[i]=(s[i]+paeth(i>=bpp?d[i-bpp]:0,pr[i],i>=bpp?pr[i-bpp]:0))&0xff; }
    else throw new Error(`PNG: unknown filter ${filt} row ${y}`);
  }
  if (ct === 6) return { w:W, h:H, rgba:pix };
  const rgba = new Uint8Array(W*H*4);
  for (let i=0;i<W*H;i++) { rgba[i*4]=pix[i*3]; rgba[i*4+1]=pix[i*3+1]; rgba[i*4+2]=pix[i*3+2]; rgba[i*4+3]=255; }
  return { w:W, h:H, rgba };
}

const CRC = (()=>{ const t=new Uint32Array(256); for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[i]=c;}return t; })();
function crc32(d:Uint8Array,s=0,e=d.length):number{let c=0xffffffff;for(let i=s;i<e;i++)c=CRC[(c^d[i])&0xff]^(c>>>8);return(c^0xffffffff)>>>0;}
function u32be(b:Uint8Array,o:number,v:number){b[o]=(v>>>24)&0xff;b[o+1]=(v>>>16)&0xff;b[o+2]=(v>>>8)&0xff;b[o+3]=v&0xff;}
function chunk(type:string,data:Uint8Array):Uint8Array{const tb=new TextEncoder().encode(type),out=new Uint8Array(12+data.length);u32be(out,0,data.length);out.set(tb,4);out.set(data,8);u32be(out,8+data.length,crc32(out,4,8+data.length));return out;}
function zlibStored(data:Uint8Array):Uint8Array{
  const BS=32768,nb=Math.max(1,Math.ceil(data.length/BS));
  let ds=0; for(let i=0;i<nb;i++) ds+=5+Math.min(BS,data.length-i*BS);
  const out=new Uint8Array(2+ds+4); let off=0;
  out[off++]=0x78; out[off++]=0x01;
  for(let b=0;b<nb;b++){const st=b*BS,en=Math.min(st+BS,data.length),len=en-st,nl=(~len)&0xffff;out[off++]=b===nb-1?0x01:0x00;out[off++]=len&0xff;out[off++]=(len>>>8)&0xff;out[off++]=nl&0xff;out[off++]=(nl>>>8)&0xff;out.set(data.subarray(st,en),off);off+=len;}
  let s1=1,s2=0; for(let i=0;i<data.length;i++){s1=(s1+data[i])%65521;s2=(s2+s1)%65521;}
  const ad=((s2<<16)|s1)>>>0; out[off++]=(ad>>>24)&0xff;out[off++]=(ad>>>16)&0xff;out[off++]=(ad>>>8)&0xff;out[off++]=ad&0xff;
  return out;
}
function encodePNG(rgba:Uint8Array,w:number,h:number):Uint8Array{
  const raw=new Uint8Array((1+w*4)*h);
  for(let y=0;y<h;y++){raw[y*(1+w*4)]=0;raw.set(rgba.subarray(y*w*4,(y+1)*w*4),y*(1+w*4)+1);}
  const ihdr=new Uint8Array(13); u32be(ihdr,0,w);u32be(ihdr,4,h);ihdr[8]=8;ihdr[9]=6;
  const sig=new Uint8Array([137,80,78,71,13,10,26,10]);
  const c1=chunk("IHDR",ihdr),c2=chunk("IDAT",zlibStored(raw)),c3=chunk("IEND",new Uint8Array(0));
  const out=new Uint8Array(sig.length+c1.length+c2.length+c3.length); let pos=0;
  for(const p of [sig,c1,c2,c3]){out.set(p,pos);pos+=p.length;}
  return out;
}

async function imagenCall(
  prompt: string,
  apiKey: string,
  sampleCount: number,
  aspectRatio = "1:1",
  refB64s: string[] = []
): Promise<string[]> {
  const instance: Record<string, unknown> = { prompt };
  if (refB64s.length > 0) {
    instance.referenceImages = refB64s.map((b64, i) => ({
      referenceType: "REFERENCE_TYPE_STYLE",
      referenceId: i + 1,
      referenceImage: { bytesBase64Encoded: b64 },
    }));
  }
  const res = await fetch(`${IMAGEN_BASE}/${IMAGEN_MODEL}:predict?key=${apiKey}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instances: [instance], parameters: { sampleCount, aspectRatio } }),
  });
  if (!res.ok) { const e = await res.text(); throw new UpstreamError(res.status, `Imagen ${res.status}: ${e.substring(0,400)}`); }
  const data = await res.json() as { predictions: Array<{ bytesBase64Encoded: string }> };
  if (!data.predictions?.length) throw new Error(`Imagen: no predictions (sampleCount:${sampleCount})`);
  return data.predictions.map(p => p.bytesBase64Encoded);
}

function resolveImageProvider(): ImageProvider | null {
  const googleApiKey = (Deno.env.get("GOOGLE_API_KEY") || "").trim();
  if (googleApiKey) return { kind: "google-direct", apiKey: googleApiKey, source: "GOOGLE_API_KEY" };

  const geminiApiKey = (Deno.env.get("GEMINI_API_KEY") || "").trim();
  if (geminiApiKey) return { kind: "google-direct", apiKey: geminiApiKey, source: "GEMINI_API_KEY" };

  const lovableApiKey = (Deno.env.get("LOVABLE_API_KEY") || "").trim();
  if (lovableApiKey) return { kind: "gateway", apiKey: lovableApiKey, source: "LOVABLE_API_KEY" };

  return null;
}

function aspectRatioInstruction(aspectRatio: string): string {
  switch (aspectRatio) {
    case "9:16": return "Output a vertical 9:16 composition.";
    case "16:9": return "Output a landscape 16:9 composition.";
    case "3:4": return "Output a portrait 3:4 composition.";
    case "4:3": return "Output a landscape 4:3 composition.";
    default: return "Output a square 1:1 composition.";
  }
}

function dataUrlToBase64(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!match) throw new Error("Gateway did not return a base64 image payload");
  return match[1];
}

async function gatewaySingleCall(
  prompt: string,
  apiKey: string,
  refImageUrls: string[] = [],
): Promise<string> {
  const makeBody = (includeRefs: boolean) => {
    const content = includeRefs && refImageUrls.length > 0
      ? [
          { type: "text", text: prompt },
          ...refImageUrls.map((url) => ({ type: "image_url", image_url: { url } })),
        ]
      : prompt;

    return JSON.stringify({
      model: GATEWAY_IMAGE_MODEL,
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    });
  };

  let res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: makeBody(true),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok && refImageUrls.length > 0 && (res.status === 400 || res.status === 422)) {
    const errText = await res.text();
    console.warn(`[v${DEPLOY_VERSION}] gateway rejected refs, retrying without: ${errText.substring(0, 240)}`);
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: makeBody(false),
      signal: AbortSignal.timeout(120_000),
    });
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new UpstreamError(res.status, `Gateway ${res.status}: ${errText.substring(0, 400)}`);
  }

  const data = await res.json() as { choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }> };
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageUrl?.startsWith("data:image")) throw new Error("Gateway: no image returned");
  return dataUrlToBase64(imageUrl);
}

async function generateImages(
  provider: ImageProvider,
  prompt: string,
  sampleCount: number,
  aspectRatio = "1:1",
  refB64s: string[] = [],
  refImageUrls: string[] = [],
): Promise<string[]> {
  if (provider.kind === "google-direct") {
    return await imagenCall(prompt, provider.apiKey, sampleCount, aspectRatio, refB64s);
  }

  return await Promise.all(
    Array.from({ length: sampleCount }, (_, i) => {
      const variationPrompt = [
        prompt,
        aspectRatioInstruction(aspectRatio),
        "Return only the generated image with no text, logos, watermarks, borders, or collage layouts.",
        sampleCount > 1
          ? `Variation ${i + 1} of ${sampleCount}: keep the same art direction, but make the composition, crop, camera angle, and framing clearly distinct.`
          : "",
      ].filter(Boolean).join(" ");

      return gatewaySingleCall(variationPrompt, provider.apiKey, refImageUrls);
    })
  );
}

async function uploadBlob(data: Uint8Array, path: string, supabase: ReturnType<typeof createClient>): Promise<string> {
  const { error } = await supabase.storage.from(CELL_BUCKET).upload(path, data, { contentType: "image/png", upsert: true });
  if (error) throw new Error(`Upload [${path}]: ${error.message}`);
  return supabase.storage.from(CELL_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function splitGrid(b64: string, batchId: string, supabase: ReturnType<typeof createClient>): Promise<{ urls: string[]; srcBytes: number; tileBytesTotal: number; tileW: number; tileH: number }> {
  const src = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  console.log(`[v${DEPLOY_VERSION}] split: ${src.length}B inset=${SPLIT_INSET}`);
  const { w, h, rgba } = await pngToRGBA(src);
  const hw = Math.floor(w/2), hh = Math.floor(h/2);
  const tw = hw - SPLIT_INSET;
  const th = hh - SPLIT_INSET;
  if (tw <= 0 || th <= 0) throw new Error(`splitGrid: inset ${SPLIT_INSET} too large for ${w}x${h}`);
  const quads = [
    { x: 0, y: 0, l: "tl" },
    { x: hw + SPLIT_INSET, y: 0, l: "tr" },
    { x: 0, y: hh + SPLIT_INSET, l: "bl" },
    { x: hw + SPLIT_INSET, y: hh + SPLIT_INSET, l: "br" },
  ] as const;
  const urls: string[] = [];
  let tileBytesTotal = 0;
  for (const q of quads) {
    const tile = new Uint8Array(tw * th * 4);
    for (let r = 0; r < th; r++) { const s = ((q.y + r) * w + q.x) * 4; tile.set(rgba.subarray(s, s + tw * 4), r * tw * 4); }
    const png = encodePNG(tile, tw, th); tileBytesTotal += png.length;
    urls.push(await uploadBlob(png, `${batchId}/${q.l}.png`, supabase));
    console.log(`[v${DEPLOY_VERSION}] ✓ ${q.l} ${tw}x${th}px`);
  }
  return { urls, srcBytes: src.length, tileBytesTotal, tileW: tw, tileH: th };
}

async function uploadSingle(b64: string, path: string, supabase: ReturnType<typeof createClient>): Promise<{ url: string; bytes: number }> {
  const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const url = await uploadBlob(data, path, supabase);
  return { url, bytes: data.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("OK", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const t0 = Date.now();
  try {
    const body = await req.json() as Record<string, unknown>;
    if (body.action === "health" || body.ping) {
      return json({ status: "ok", version: `v${DEPLOY_VERSION}`, model: IMAGEN_MODEL, provider: "Google Imagen 4 Standard", knp: true, modes: ["composite","single","raw","batch","individual"], split_inset: SPLIT_INSET, features: ["aspectRatio","referenceImages"] });
    }
    const rawBrief = extractBrief(body);
    if (!rawBrief) return json({ error: "Missing required fields" }, 400);
    const platforms = (body.platforms as string[] | undefined) || [];
    const mode = String(body.mode || "composite");
    const rawAr = String(body.aspectRatio || "1:1");
    const aspectRatio = VALID_ARS.has(rawAr) ? rawAr : "1:1";
    const refImageUrls: string[] = Array.isArray(body.referenceImages) ? (body.referenceImages as string[]).slice(0, 3) : [];
    const provider = resolveImageProvider();
    if (!provider) {
      return json({ error: "No image generation key configured", deploy_version: DEPLOY_VERSION }, 503);
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
    const refB64s: string[] = [];
    for (const u of refImageUrls) { const b = await fetchAsB64(u); if (b) refB64s.push(b); }
    console.log(`[v${DEPLOY_VERSION}] provider=${provider.kind} via=${provider.source}`);
    if (refB64s.length > 0) console.log(`[v${DEPLOY_VERSION}] ${refB64s.length} reference image(s) loaded`);
    if (mode === "raw") {
      const callT = Date.now();
      const [b64] = await generateImages(provider, rawBrief, 1, aspectRatio, refB64s, refImageUrls);
      const callMs = Date.now() - callT;
      const batchId = `cmp28_raw_${Date.now()}`;
      const { url, bytes } = await uploadSingle(b64, `${batchId}/img_0.png`, supabase);
      return json({ images: [url], grids: [{ platforms: [platforms[0] || "raw@0"], gridUrl: url, success: true }], total_platforms: 1, grid_mode: "raw", tiles_generated: 1, raw_brief: rawBrief, deploy_version: DEPLOY_VERSION, mode: "raw", model: IMAGEN_MODEL, api_calls: 1, elapsed_ms: Date.now()-t0, imagen_call_ms: callMs, aspect_ratio: aspectRatio, cost: { api_cost: API_CALL_COST, cost_per_tile: API_CALL_COST, tiles: 1 }, compression: { knp_applied: false }, src_bytes: bytes });
    }
    if (mode === "single") {
      const prompt = knpCompress(rawBrief);
      const callT = Date.now();
      const [b64] = await generateImages(provider, prompt, 1, aspectRatio, refB64s, refImageUrls);
      const callMs = Date.now() - callT;
      const batchId = `cmp28_single_${Date.now()}`;
      const { url, bytes } = await uploadSingle(b64, `${batchId}/img_0.png`, supabase);
      return json({ images: [url], grids: [{ platforms: [platforms[0] || "single@0"], gridUrl: url, success: true }], total_platforms: 1, grid_mode: "single", tiles_generated: 1, raw_brief: rawBrief, deploy_version: DEPLOY_VERSION, mode: "single", model: IMAGEN_MODEL, api_calls: 1, elapsed_ms: Date.now()-t0, imagen_call_ms: callMs, aspect_ratio: aspectRatio, cost: { api_cost: API_CALL_COST, cost_per_tile: API_CALL_COST, tiles: 1 }, compression: { knp_applied: true, prompt_chars_in: rawBrief.length, prompt_chars_out: prompt.length }, src_bytes: bytes });
    }
    if (mode === "batch") {
      const compressed = knpCompress(rawBrief);
      const gridPrompt = `${compressed}\n\n${makeGridWrapper(aspectRatio)}`;
      const callT = Date.now();
      const b64s = await generateImages(provider, gridPrompt, 4, aspectRatio, refB64s, refImageUrls);
      const callMs = Date.now() - callT;
      const batchIdBase = `cmp28_batch_${Date.now()}`;
      const allUrls: string[] = [];
      let srcBytesTotal = 0, tileBytesTotal = 0, tileW = 0, tileH = 0;
      for (let gi = 0; gi < b64s.length; gi++) {
        const res = await splitGrid(b64s[gi], `${batchIdBase}_g${gi}`, supabase);
        allUrls.push(...res.urls); srcBytesTotal += res.srcBytes; tileBytesTotal += res.tileBytesTotal; tileW = res.tileW; tileH = res.tileH;
      }
      const n = allUrls.length;
      const rp = platforms.length >= n ? platforms.slice(0, n) : Array.from({ length: n }, (_, i) => `tile@${i}`);
      return json({ images: allUrls, grids: allUrls.map((url, i) => ({ platforms: [rp[i]], gridUrl: url, success: true })), total_platforms: n, grid_mode: "batch_4x4", tiles_generated: n, sample_count: 4, raw_brief: rawBrief, deploy_version: DEPLOY_VERSION, mode: "batch", model: IMAGEN_MODEL, api_calls: 1, elapsed_ms: Date.now()-t0, imagen_call_ms: callMs, aspect_ratio: aspectRatio, cost: { api_cost: b64s.length*API_CALL_COST, cost_per_tile: (b64s.length*API_CALL_COST)/Math.max(n,1), tiles: n }, compression: { knp_applied: true, src_bytes: srcBytesTotal, tile_bytes_total: tileBytesTotal } });
    }
    if (mode === "individual") {
      const prompt = knpCompress(rawBrief);
      const callT = Date.now();
      const b64s = await generateImages(provider, prompt, 4, aspectRatio, refB64s, refImageUrls);
      const callMs = Date.now() - callT;
      const batchId = `cmp28_individual_${Date.now()}`;
      const urls: string[] = []; let totalBytes = 0;
      for (let i = 0; i < b64s.length; i++) { const { url, bytes } = await uploadSingle(b64s[i], `${batchId}/img_${i}.png`, supabase); urls.push(url); totalBytes += bytes; }
      const n = urls.length;
      const rp = platforms.length >= n ? platforms.slice(0, n) : Array.from({ length: n }, (_, i) => `tile@${i}`);
      return json({ images: urls, grids: urls.map((url, i) => ({ platforms: [rp[i]], gridUrl: url, success: true })), total_platforms: n, grid_mode: "individual", tiles_generated: n, raw_brief: rawBrief, deploy_version: DEPLOY_VERSION, mode: "individual", model: IMAGEN_MODEL, api_calls: 1, elapsed_ms: Date.now()-t0, imagen_call_ms: callMs, aspect_ratio: aspectRatio, cost: { api_cost: n*API_CALL_COST, cost_per_tile: API_CALL_COST, tiles: n }, compression: { knp_applied: true }, src_bytes: totalBytes });
    }
    // composite (default) — v28.1: use sampleCount=4 to avoid 150s timeout from
    // single mega-grid generation + heavy PNG decode/split. One Imagen call returns
    // 4 distinct images at the requested aspect ratio; no splitGrid needed.
    const compressed = knpCompress(rawBrief);
    console.log(`[v${DEPLOY_VERSION}.1] mode=composite ar=${aspectRatio} prompt=${compressed.length}c refs=${refB64s.length} (sampleCount=4 fast-path)`);
    const callT = Date.now();
    let b64s: string[];
    try {
      b64s = await generateImages(provider, compressed, 4, aspectRatio, refB64s, refImageUrls);
    } catch (e) {
      if (refB64s.length > 0 && e instanceof UpstreamError && e.httpStatus === 400) {
        console.warn(`[v${DEPLOY_VERSION}.1] ref images rejected, retrying without`);
        b64s = await generateImages(provider, compressed, 4, aspectRatio, [], []);
      } else { throw e; }
    }
    const callMs = Date.now() - callT;
    const batchId = `cmp28_${Date.now()}`;
    const urls: string[] = [];
    let totalBytes = 0;
    for (let i = 0; i < b64s.length; i++) {
      const { url, bytes } = await uploadSingle(b64s[i], `${batchId}/img_${i}.png`, supabase);
      urls.push(url); totalBytes += bytes;
    }
    const n = urls.length;
    const rp = platforms.length >= n ? platforms.slice(0, n) : Array.from({ length: n }, (_, i) => `tile@${i}`);
    const promptSavePct = rawBrief.length > 0 ? Math.round((1 - compressed.length / rawBrief.length) * 100) : 0;
    return json({
      images: urls,
      grids: urls.map((url, i) => ({ platforms: [rp[i]], gridUrl: url, success: true })),
      total_platforms: n, grid_mode: "fast_individual", tiles_generated: n, sample_count: 4,
      raw_brief: rawBrief, deploy_version: DEPLOY_VERSION, mode: "composite",
      model: IMAGEN_MODEL, provider: "Google Imagen 4 Standard",
      api_calls: 1, elapsed_ms: Date.now()-t0, imagen_call_ms: callMs,
      aspect_ratio: aspectRatio, reference_images_used: refB64s.length,
      cost: { api_cost: n*API_CALL_COST, cost_per_tile: API_CALL_COST, model_rate: API_CALL_COST, tiles: n },
      compression: { knp_applied: true, prompt_chars_in: rawBrief.length, prompt_chars_out: compressed.length, prompt_savings_pct: promptSavePct, grid_multiplier: n, assets_per_call: n, src_bytes: totalBytes },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = err instanceof UpstreamError ? (err as UpstreamError).httpStatus : 500;
    console.error(`generate-image-composite v${DEPLOY_VERSION}:`, msg);
    return json({ error: "Request failed", details: msg, deploy_version: DEPLOY_VERSION }, status);
  }
});
