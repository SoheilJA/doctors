import { buildSeed } from "@/mock/seed";
import { ArticleContent } from "./ArticleContent";

export async function generateStaticParams() {
  const seed = buildSeed();
  return seed.articles
    .filter((a) => a.status === "published")
    .map((article) => ({
      slug: article.slug,
    }));
}

export default function Page() {
  return <ArticleContent />;
}