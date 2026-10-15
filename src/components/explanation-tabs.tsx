'use client';


export interface ExplanationTabsProps {
  showQuestion: boolean;
  setShowQuestion: (show: boolean) => void;
  question: string;
  explanation?: string;
  reference?: string;
}

export function ExplanationTabs({
  showQuestion,
  setShowQuestion,
  question,
  explanation,
  reference,
}: ExplanationTabsProps) {
  return (
    <div className="space-y-4">
      {/* الأزرار */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowQuestion(true)}
          className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
            showQuestion
              ? 'bg-brand text-on-solid'
              : 'border border-border bg-surface text-foreground hover:border-brand hover:text-brand-ink'
          }`}
        >
          <span className="mr-2">❓</span>
          Question
        </button>
        <button
          onClick={() => setShowQuestion(false)}
          className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
            !showQuestion
              ? 'bg-brand text-on-solid'
              : 'border border-border bg-surface text-foreground hover:border-brand hover:text-brand-ink'
          }`}
        >
          <span className="mr-2">📚</span>
          Explanation
        </button>
      </div>

      {/* المحتوى */}
      <div className="rounded-lg bg-surface-muted p-4">
        {showQuestion ? (
          <div>
            <h3 className="text-lg font-semibold leading-snug text-foreground sm:text-xl">
              {question}
            </h3>
          </div>
        ) : (
          <div className="space-y-3">
            {explanation ? (
              <div>
                <p className="text-sm text-foreground">{explanation}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No explanation available</p>
            )}
            {reference ? (
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold">Reference:</span> {reference}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
