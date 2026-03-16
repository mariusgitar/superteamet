interface TotalIndicatorProps {
  total: number;
}

export function TotalIndicator({ total }: TotalIndicatorProps) {
  const isComplete = total === 100;

  return (
    <div className={`rounded-md px-3 py-2 text-sm font-medium ${isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      Totalt: {total}% {isComplete ? '✓' : '(må være 100%)'}
    </div>
  );
}
