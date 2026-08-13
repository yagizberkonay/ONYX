import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const internalHost = process.env.TAURI_DEV_HOST || "localhost";

const nextConfig: NextConfig = {
  // Tauri v2, frontend’i statik dosya olarak servis eder; SSR kullanılmaz.
  output: "export",
  images: {
    unoptimized: true,
  },
  // Geliştirme webview’ında asset URL’lerinin dev sunucusuna çözülmesini sağlar.
  assetPrefix: isProduction ? undefined : `http://${internalHost}:3000`,
  allowedDevOrigins: ["localhost", "127.0.0.1"],
};

export default nextConfig;
