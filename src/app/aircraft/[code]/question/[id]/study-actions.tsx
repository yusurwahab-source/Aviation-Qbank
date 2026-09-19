"use client";

import { useState } from "react";

import { FlagButton } from "@/components/flag-button";
import { QuestionNote } from "@/components/question-note";
import { loadNote, saveNote, toggleFlag } from "@/app/aircraft/[code]/test/actions";

/**
 * Flag and note controls for the single-question study view — the same two
 * student study aids the test runner offers, reusing its own server actions
 * rather than a second copy of either. A question reached this way is not
 * part of any test session, so there is nothing here to settle or reveal:
 * both controls behave exactly as they do mid-test.
 */
export function QuestionStudyActions({
  questionId,
  aircraftCode,
  initialFlagged,
  hasNote,
}: {
  questionId: string;
  aircraftCode: string;
  initialFlagged: boolean;
  hasNote: boolean;
}) {
  const [flagged, setFlagged] = useState(initialFlagged);

  function onToggleFlag() {
    const next = !flagged;
    setFlagged(next);
    void toggleFlag({ questionId, aircraftCode }).then((result) => {
      if ("flagged" in result && result.flagged !== next) setFlagged(result.flagged);
    });
  }

  return (
    <div className="mt-4 flex flex-wrap items-start gap-2">
      <FlagButton flagged={flagged} onToggle={onToggleFlag} />
      <QuestionNote
        hasNote={hasNote}
        onLoad={() => loadNote(questionId)}
        onSave={(body) => saveNote({ questionId, aircraftCode, body })}
      />
    </div>
  );
}
