import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.searchoutfit.ios",
  appName: "SearchOutfit",
  bundledWebRuntime: false,
  ios: {
    contentInset: "always",
  },
  plugins: {
    Camera: {
      saveToGallery: false,
    },
  },
  server: {
    androidScheme: "https",
    iosScheme: "searchoutfit",
  },
  webDir: "dist",
};

export default config;
