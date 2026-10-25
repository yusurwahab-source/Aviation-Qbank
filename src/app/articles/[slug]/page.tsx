import { PostDetailPage, postMetadata } from "../../_posts/post-detail-page";

/** Re-read hourly, so a scheduled post appears within the hour of its date;
 * saving or publishing from the owner editor refreshes it at once. */
export const revalidate = 3600;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return postMetadata("article", slug);
}

export default async function ArticlesPostPage({ params }: PageProps) {
  const { slug } = await params;
  return <PostDetailPage kind="article" slug={slug} />;
}
