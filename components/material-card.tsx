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
  return (
    <article className="rounded-md border bg-white p-3">
      <div className="aspect-[4/3] rounded bg-neutral-100 p-3 text-xs text-neutral-500">
        {material.imageUrl}
      </div>
      <h3 className="mt-3 font-medium">{material.name}</h3>
      <p className="text-sm text-neutral-500">
        {material.category} · {material.color} · {material.fabric}
      </p>
      <p className="mt-2 text-sm">{material.sellingPoints}</p>
      <p className="mt-2 text-xs text-neutral-500">{material.priceRange}</p>
    </article>
  );
}
