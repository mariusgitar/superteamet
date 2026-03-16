interface AllocationSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function AllocationSlider({ label, value, onChange }: AllocationSliderProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{Math.round(value)}%</span>
      </div>
      <input
        className="w-full"
        max={100}
        min={0}
        onChange={(event) => onChange(Number(event.target.value))}
        step={1}
        type="range"
        value={Math.round(value)}
      />
    </div>
  );
}
