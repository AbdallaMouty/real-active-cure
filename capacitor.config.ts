import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.abdalla.realactivecure",
  appName: "Real Active Cure",
  webDir: "dist",
  plugins: {
    Geolocation: {
      enableBackgroundLocation: true,
    },
  },
};

export default config;
