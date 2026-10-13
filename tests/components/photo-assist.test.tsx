import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PhotoAssist } from "@/components/photo-assist";
it("automatically checks uploaded photos and shows one useful suggestion",async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({usable:false,tip:'补一张帘头近照，会更容易还原款式'}))));
  render(<PhotoAssist primary={[{url:'/uploads/style.jpg',role:'style'}]} photos={[]} onChange={()=>{}} disabled={false} onUploading={()=>{}}/>);
  expect(await screen.findByText('款式图：补一张帘头近照，会更容易还原款式')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith('/api/ai/check-photo',expect.objectContaining({body:JSON.stringify({url:'/uploads/style.jpg',role:'style'})}));
  expect(screen.getByLabelText('上传补充照片')).not.toBeDisabled();
  vi.unstubAllGlobals();
});
