"use client";
import { useEffect, useRef, useState } from "react";
import { PreviewImage } from "./preview-image";
import type { PhotoRole, SupplementalImage } from "@/lib/photo-types";

const names = {room:"房间",style:"款式",detail:"面料"};
function PhotoNote({url,role}:{url:string;role:PhotoRole}) {
  const [note,setNote]=useState<{usable:boolean;tip:string}|null>(null);
  useEffect(() => {
    if (!url || url.startsWith("/demo/")) return;
    const controller=new AbortController();
    void fetch("/api/ai/check-photo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url,role}),signal:controller.signal}).then(async response => response.ok ? response.json() : null).then(result => {if (!controller.signal.aborted && result) setNote(result);}).catch(() => undefined);
    return () => controller.abort();
  },[url,role]);
  return note ? <p className={`text-xs leading-6 ${note.usable ? "text-stone-500" : "text-amber-800"}`}>{names[role]}图：{note.tip}</p> : null;
}
export function PhotoAssist({primary,photos,onChange,disabled,onUploading}:{primary:{url:string;role:PhotoRole}[];photos:SupplementalImage[];onChange:(photos:SupplementalImage[])=>void;disabled:boolean;onUploading:(busy:boolean)=>void}) {
  const [role,setRole]=useState<PhotoRole>("style");
  const [uploading,setUploading]=useState(false);
  const [error,setError]=useState("");
  const [pendingPreview,setPendingPreview]=useState("");
  const [previews,setPreviews]=useState<Record<string,string>>({});
  const previewList=useRef<string[]>([]);
  const input=useRef<HTMLInputElement>(null);
  useEffect(() => () => previewList.current.forEach(url => URL.revokeObjectURL(url)),[]);
  async function upload(file:File) {
    if (uploading || disabled || photos.length>=2) return;
    if (!/\.(jpe?g|png|webp)$/i.test(file.name) || !file.size || file.size>4*1024*1024) {setError("请选择不超过4MB的 JPG、PNG 或 WebP 照片");return;}
    const preview=URL.createObjectURL(file);previewList.current.push(preview);setPendingPreview(preview);
    setUploading(true);onUploading(true);setError("");
    try {
      const form=new FormData();form.append("file",file);
      const response=await fetch("/api/files",{method:"POST",body:form});const result=await response.json();
      if (!response.ok || !result.url) throw Error(result.error || "补图上传失败，请重试");
      setPreviews(current=>({...current,[result.url]:preview}));onChange([...photos,{url:result.url,role}]);
    } catch(error) {setError(error instanceof Error ? error.message : "补图上传失败，请重试");}
    finally {setUploading(false);onUploading(false);setPendingPreview("");}
  }
  return <div className="space-y-3">
    <div aria-label="照片自动检查" className="space-y-1">{[...primary,...photos].map((photo,index)=><PhotoNote key={`${index}:${photo.role}:${photo.url}`} {...photo}/>)}</div>
    <details className="rounded-xl border border-stone-200 p-3">
      <summary className="cursor-pointer text-sm text-sage">补充照片（可选）{photos.length>0 ? ` · ${photos.length} 张` : ""}</summary>
      <p className="mt-2 text-xs leading-6 text-stone-500">帘头、下摆或织纹没拍清，可以补一张。最多2张，不补也可以继续。</p>
      <div className="mt-3 flex gap-2"><select aria-label="补图类型" value={role} disabled={disabled || uploading} onChange={event=>setRole(event.target.value as PhotoRole)} className="workbench-input min-w-0 flex-1"><option value="style">帘头 / 下摆</option><option value="detail">面料细节</option><option value="room">房间补充</option></select><button type="button" disabled={disabled || uploading || photos.length>=2} onClick={()=>input.current?.click()} className="studio-secondary-button px-3">{uploading ? "上传中…" : "补一张"}</button></div>
      <input ref={input} aria-label="上传补充照片" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={disabled || uploading || photos.length>=2} onChange={event=>{const file=event.target.files?.[0];if(file)void upload(file);event.target.value="";}}/>
      <div className="mt-3 grid grid-cols-2 gap-3">{photos.map((photo,index)=><div key={photo.url} className="space-y-2"><PreviewImage src={previews[photo.url] || photo.url} alt={`${names[photo.role]}补充照片`} sizes="160px" className="aspect-square w-full rounded-xl object-cover"/><div className="flex items-center justify-between text-xs"><span>{names[photo.role]}补图</span><button type="button" disabled={disabled || uploading} onClick={()=>onChange(photos.filter((_,i)=>i!==index))} className="px-2 py-2 text-stone-500">移除</button></div></div>)}{pendingPreview && <PreviewImage src={pendingPreview} alt="补图正在上传" className="aspect-square w-full rounded-xl object-cover"/>}</div>
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </details>
  </div>;
}
