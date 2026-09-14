'use client';

interface TestProgressProps {
  correct: number;
  incorrect: number;
  unanswered: number;
}

export function TestProgress({ correct, incorrect, unanswered }: TestProgressProps) {
  const total = correct + incorrect + unanswered;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground">Test Progress</h3>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-surface-muted p-3">
          <p className="text-center text-2xl font-bold text-correct">{correct}</p>
          <p className="mt-1 text-center text-sm text-muted-foreground">Correct</p>
        </div>

        <div className="rounded-lg bg-surface-muted p-3">
          <p className="text-center text-2xl font-bold text-incorrect">{incorrect}</p>
          <p className="mt-1 text-center text-sm text-muted-foreground">Incorrect</p>
        </div>

        <div className="rounded-lg bg-surface-muted p-3">
          <p className="text-center text-2xl font-bold text-muted-foreground">{unanswered}</p>
          <p className="mt-1 text-center text-sm text-muted-foreground">Unanswered</p>
        </div>
      </div>

      {total > 0 && (
        <div className="mt-4 space-y-2">
          <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="flex h-full"
              style={{
                background: `linear-gradient(to right, 
                  rgb(5, 150, 105) 0%, 
                  rgb(5, 150, 105) ${(correct / total) * 100}%,
                  rgb(220, 38, 38) ${(correct / total) * 100}%,
                  rgb(220, 38, 38) ${((correct + incorrect) / total) * 100}%,
                  rgb(209, 213, 219) ${((correct + incorrect) / total) * 100}%,
                  rgb(209, 213, 219) 100%)`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round((correct / total) * 100)}%</span>
            <span>{total} questions</span>
          </div>
        </div>
      )}
    </div>
  );
}
