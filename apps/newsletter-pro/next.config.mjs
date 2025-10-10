/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { 
    externalDir: true 
  },
  transpilePackages: [
    "@crav/ui",
    "@crav/utils",
    "@crav/analytics",
    "@crav/newsletter-spec"
  ],
};

export default nextConfig;
