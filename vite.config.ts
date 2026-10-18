import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // Keep built JS/CSS out of /assets so that folder stays yours for art
    // (and can be mounted as a Docker volume without hiding the app).
    assetsDir: "_app",
  },
});
