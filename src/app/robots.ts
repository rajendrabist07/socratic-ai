import type { MetadataRoute } from "next";

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://socraticai.ai";
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/session"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
