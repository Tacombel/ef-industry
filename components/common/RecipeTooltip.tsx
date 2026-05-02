interface RecipeTooltipProps {
  inputs: { name: string; qty: number }[];
  outputs: { name: string; qty: number }[];
}

export default function RecipeTooltip({ inputs, outputs }: RecipeTooltipProps) {
  const rows = Math.max(inputs.length, outputs.length);
  return (
    <div className="absolute z-50 left-0 top-full mt-1 min-w-max rounded border border-gray-700 bg-gray-900 shadow-lg p-2 text-xs pointer-events-none">
      <div className="grid gap-x-2" style={{ gridTemplateColumns: "auto auto auto" }}>
        {Array.from({ length: rows }).map((_, i) => {
          const inp = inputs[i];
          const out = outputs[i];
          return (
            <div key={i} className="contents">
              <span className="text-gray-300 text-right">
                {inp ? <><span className="text-yellow-400 font-semibold">{inp.qty}</span>× {inp.name}</> : ""}
              </span>
              <span className="text-gray-600 text-center">{i === 0 ? "→" : ""}</span>
              <span className="text-gray-300">
                {out ? <><span className="text-yellow-400 font-semibold">{out.qty}</span>× {out.name}</> : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
