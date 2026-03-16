interface VerticalSliderProps {
  projectName: string;
  color: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function VerticalSlider({ projectName, color, value, disabled = false, onChange }: VerticalSliderProps) {
  const bubbleStyle = {
    bottom: `calc(${value}% - 0.5rem)`,
    backgroundColor: color,
  };

  return (
    <div className="flex min-w-16 flex-col items-center gap-2">
      <div className="relative flex h-[220px] w-11 items-center justify-center">
        <div className="relative h-[200px] w-5 overflow-hidden rounded-full bg-gray-200">
          <div className="absolute inset-x-0 bottom-0" style={{ backgroundColor: color, height: `${value}%`, opacity: 0.8 }} />
        </div>

        <div className="pointer-events-none absolute left-[-46px] rounded-full px-2 py-1 text-xs font-semibold text-white" style={bubbleStyle}>
          {value}%
        </div>

        <input
          aria-label={`${projectName} allokering`}
          className="absolute h-11 w-[200px] -rotate-90 appearance-none bg-transparent disabled:cursor-not-allowed [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-0 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white"
          disabled={disabled}
          max={100}
          min={0}
          onChange={(event) => onChange(Number(event.target.value))}
          step={1}
          type="range"
          value={value}
        />
      </div>

      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <p className="w-16 truncate text-center text-xs text-gray-700">{projectName}</p>
    </div>
  );
}
