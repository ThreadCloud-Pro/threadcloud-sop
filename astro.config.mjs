// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({
  site: "https://threadcloud.app",
  integrations: [mdx()],
  markdown: {
    shikiConfig: { theme: "github-light", wrap: true },
  },
  vite: {
    build: {
      rollupOptions: {
        external: ["/pagefind/pagefind.js"],
      },
    },
  },
});
