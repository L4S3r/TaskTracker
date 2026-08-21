/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["tailwind-merge", "clsx", "lucide-react", "qrcode"],
};

module.exports = nextConfig;
