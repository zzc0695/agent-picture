/* eslint-disable @next/next/no-img-element */

export function MaterialCard({
  material,
}: {
  material: {
    name: string;
    category: string;
    color: string;
    fabric: string;
    priceRange: string;
    sellingPoints: string;
    imageUrl: string;
  };
}) {
  const hasRenderableImage =
    Boolean(material.imageUrl) &&
    !material.imageUrl.startsWith("/demo/") &&
    material.imageUrl !== "/sample-material.jpg";

  return (
    <article className="studio-card overflow-hidden p-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-stone-100">
        {hasRenderableImage ? (
          <img
            src={material.imageUrl}
            alt={material.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="curtain-swatch-a grid h-full place-items-center">
            <span className="rounded-full border border-white/40 bg-white/40 px-3 py-1 text-[10px] font-medium tracking-widest text-white shadow-sm backdrop-blur-md">
              MATERIAL
            </span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full border border-white/30 bg-white/30 px-3 py-1 text-[10px] font-medium tracking-widest text-white shadow-sm backdrop-blur-md">
          {material.category}
        </span>
      </div>
      <div className="p-3">
        <h3 className="font-serif text-[17px] font-medium text-stone-800">
          {material.name}
        </h3>
        <p className="mt-1 text-[12px] font-medium tracking-wide text-stone-400">
          {material.color} · {material.fabric}
        </p>
        <p className="mt-3 text-[13px] leading-6 text-stone-600">
          {material.sellingPoints}
        </p>
        <p className="mt-3 inline-flex rounded-full bg-sage/8 px-3 py-1 text-[11px] font-medium text-sage">
          {material.priceRange}
        </p>
      </div>
    </article>
  );
}
