/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Prevent Next.js from bundling these — they need native Node.js modules
    serverComponentsExternalPackages: ['@xenova/transformers', 'onnxruntime-node'],
  },
};

export default nextConfig;
