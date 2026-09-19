'use client';

import { useState } from 'react';
import { QuestionNavigator, type QuestionStatus } from '@/components/question-navigator';
import { TestProgress } from '@/components/test-progress';

/**
 * مثال على صفحة الاختبار المتكاملة
 * يمكنك استخدام هذا كنقطة انطلاق لدمج المكونات الجديدة
 */
export function TestPage() {
  // حالة الأسئلة - يمكن استبدالها بالبيانات الفعلية من الـ API
  // تبدأ كلها بلا إجابة، وهي حالة الاختبار الحقيقية عند فتحه. البيانات
  // العشوائية هنا كانت تُنتج رسماً مختلفاً على الخادم وعلى المتصفّح.
  const [questions, setQuestions] = useState<QuestionStatus[]>(
    Array.from({ length: 10 }, (_, i) => ({
      number: i + 1,
      answered: false,
      correct: false,
      current: i === 0,
    }))
  );

  const [currentQuestion, setCurrentQuestion] = useState(0);

  // حساب الإحصائيات
  const stats = {
    correct: questions.filter((q) => q.answered && q.correct).length,
    incorrect: questions.filter((q) => q.answered && !q.correct).length,
    unanswered: questions.filter((q) => !q.answered).length,
  };

  const handleQuestionSelect = (number: number) => {
    setQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        current: q.number === number,
      }))
    );
    setCurrentQuestion(number - 1);
  };

  const handleAnswer = (isCorrect: boolean) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i === currentQuestion) {
          return {
            ...q,
            answered: true,
            correct: isCorrect,
          };
        }
        return q;
      })
    );

    // الانتقال للسؤال التالي
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setQuestions((prev) =>
        prev.map((q, i) => ({
          ...q,
          current: i === currentQuestion + 1,
        }))
      );
    }
  };

  const currentQ = questions[currentQuestion];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* المحتوى الرئيسي - السؤال */}
      <div className="lg:col-span-2">
        <div className="space-y-6">
          {/* رأس السؤال */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Question {currentQ.number} of {questions.length}
            </h2>
            <h3 className="text-2xl font-bold text-foreground">
              ما هي الخطوة الأولى عند بدء المحرك؟
            </h3>
          </div>

          {/* شريط التقدم */}
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full bg-brand transition-all"
                style={{ width: `${((currentQ.number) / questions.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {currentQ.number} of {questions.length} questions
            </p>
          </div>

          {/* الخيارات */}
          <div className="space-y-3">
            {['A', 'B', 'C', 'D'].map((option) => (
              <button
                key={option}
                onClick={() => handleAnswer(option === 'A')}
                className={`
                  w-full rounded-lg border-2 p-4 text-left transition
                  ${
                    currentQ.answered && currentQ.correct
                      ? 'border-correct bg-correct-soft'
                      : 'border-border bg-surface hover:border-brand hover:bg-brand-soft'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded border border-current font-semibold">
                    {option}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      الخيار {option}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      وصف الخيار {option} يذهب هنا
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* أزرار التنقل */}
          {currentQ.answered && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (currentQuestion > 0) {
                    setCurrentQuestion(currentQuestion - 1);
                    setQuestions((prev) =>
                      prev.map((q, i) => ({
                        ...q,
                        current: i === currentQuestion - 1,
                      }))
                    );
                  }
                }}
                disabled={currentQuestion === 0}
                className="flex-1 rounded-lg border border-border px-4 py-3 font-semibold text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← السابق
              </button>
              <button
                onClick={() => {
                  if (currentQuestion < questions.length - 1) {
                    setCurrentQuestion(currentQuestion + 1);
                    setQuestions((prev) =>
                      prev.map((q, i) => ({
                        ...q,
                        current: i === currentQuestion + 1,
                      }))
                    );
                  }
                }}
                disabled={currentQuestion === questions.length - 1}
                className="flex-1 rounded-lg bg-brand px-4 py-3 font-semibold text-on-solid transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
              >
                التالي →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* الشريط الجانبي */}
      <div className="space-y-6">
        {/* إحصائيات التقدم */}
        <div className="rounded-lg bg-surface p-4">
          <TestProgress
            correct={stats.correct}
            incorrect={stats.incorrect}
            unanswered={stats.unanswered}
          />
        </div>

        {/* مُنقّل الأسئلة */}
        <div className="rounded-lg bg-surface p-4">
          <QuestionNavigator
            questions={questions}
            onQuestionSelect={handleQuestionSelect}
          />
        </div>

        {/* زر إنهاء الاختبار */}
        <button
          className="w-full rounded-lg bg-brand px-4 py-3 font-semibold text-on-solid transition hover:bg-brand-strong"
        >
          إنهاء الاختبار
        </button>
      </div>
    </div>
  );
}
