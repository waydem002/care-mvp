/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB — PDFs need more room. Caps at 10MB; documents
      // larger than that should be split or summarized before upload.
      bodySizeLimit: "10mb",
    },
    // pdf-parse is Node-only and was leaking into webpack's edge/client
    // bundling contexts (visible in the build cache), causing a crash
    // when a Server Action referencing it was invoked. This tells
    // Next.js to require() it directly in Node at runtime instead of
    // trying to bundle it everywhere.
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

export default nextConfig;
