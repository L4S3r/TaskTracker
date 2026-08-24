/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["tailwind-merge", "clsx", "lucide-react", "qrcode"],
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
