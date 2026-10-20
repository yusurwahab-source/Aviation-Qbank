import { notFound } from "next/navigation";

import { getLesson } from "@/content/aviation-english/lessons";

import { LessonPlayer } from "./lesson-player";

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = getLesson(lessonId);
  if (!lesson) notFound();
  return <LessonPlayer lesson={lesson} />;
}
