import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  ...(isGithubPages ? {
    output: "export" as const,
    trailingSlash: true,
  } : {}),
};

export default nextConfig;
