'use client';

import type { ReactNode } from 'react';

export interface QuestionStatus {
  number: number;
  answered: boolean;
  correct?: boolean;
  current: boolean;
}

interface QuestionNavigatorProps {
  questions: QuestionStatus[];
  onQuestionSelect: (number: number) => void;
}

export function QuestionNavigator({ questions, onQuestionSelect }: QuestionNavigatorProps) {
  const answeredCount = questions.filter((q) => q.answered).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Question Navigator</h3>
        <span className="text-sm text-muted-foreground">
          {answeredCount}/{questions.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {questions.map((question) => (
          <button
            key={question.number}
            onClick={() => onQuestionSelect(question.number)}
            className={`
              flex h-10 w-10 items-center justify-center rounded font-medium text-sm transition-colors
              ${
                question.current
                  ? 'bg-brand text-white ring-2 ring-brand ring-offset-2'
                  : question.answered
                    ? question.correct
                      ? 'bg-correct text-white hover:opacity-90'
                      : 'bg-incorrect text-white hover:opacity-90'
                    : 'bg-surface-muted text-foreground hover:bg-border'
              }
            `}
            aria-label={`Question ${question.number}${question.answered ? ` - ${question.correct ? 'Correct' : 'Incorrect'}` : ' - Unanswered'}`}
          >
            {question.number}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-brand" />
          <span>Current</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-correct" />
          <span>Correct</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-incorrect" />
          <span>Incorrect</span>
        </div>
      </div>
    </div>
  );
}
