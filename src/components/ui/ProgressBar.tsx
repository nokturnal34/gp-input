interface ProgressBarProps {
  percentage: number;
  width?: string;
}

export function ProgressBar({ percentage, width = "w-full" }: ProgressBarProps) {
  return (
    <div className={`h-1.5 ${width} rounded-full bg-neutral-200`}>
      <div
        className="h-1.5 rounded-full bg-[#0028ff] transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
