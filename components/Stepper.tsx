export function Stepper({
  steps,
  current,
  compact,
}: {
  steps: string[];
  current: number;
  compact?: boolean;
}) {
  return (
    <div className={`stepper${compact ? " compact" : ""}`}>
      {steps.map((label, i) => {
        const step = i + 1;
        return (
          <div
            key={label}
            className={`step-item${step === current ? " active" : ""}${step < current ? " done" : ""}`}
          >
            <span>{step}</span>
            {label}
          </div>
        );
      })}
    </div>
  );
}
