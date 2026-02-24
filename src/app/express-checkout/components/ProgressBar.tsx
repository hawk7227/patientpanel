"use client";
import type { VisibleStep } from "../types";

interface Props {
  visibleSteps: VisibleStep[];
  activeStep: VisibleStep;
}

export default function ProgressBar({ visibleSteps, activeStep }: Props) {
  const activeIdx = visibleSteps.indexOf(activeStep);
  const total = visibleSteps.length;

  return (
    <div className="w-full mt-2">
      <div className="flex gap-1">
        {visibleSteps.map((step, i) => (
          <div key={step} className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: i < activeIdx ? "100%" : i === activeIdx ? "50%" : "0%",
                background: i <= activeIdx ? "#f97316" : "transparent",
              }}
            />
          </div>
        ))}
      </div>
      <p className="text-gray-600 text-[8px] mt-0.5 text-right">
        Step {Math.min(activeIdx + 1, total)} of {total}
      </p>
    </div>
  );
}
