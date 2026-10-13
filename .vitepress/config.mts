import { slug } from "github-slugger";
import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

const repo = "https://github.com/metadamen-ai-career-os/metadamen-engineering-docs";

// withMermaid draws ```mermaid blocks as diagrams, the same way GitHub does.
export default withMermaid(
  defineConfig({
    title: "Metadamen Engineering Docs",
    description: "Engineering documentation for the Metadamen codebase",
    lang: "en-US",

    // The site is served from https://metadamen-ai-career-os.github.io/metadamen-engineering-docs/
    base: "/metadamen-engineering-docs/",

    // README.md is the front page on GitHub, so it's the front page of the site too.
    rewrites: { "README.md": "index.md" },

    // Shows "Last updated" on each page, from git history.
    lastUpdated: true,

    // Links to localhost point at your own machine, not at this site. Every other broken link fails the build.
    ignoreDeadLinks: "localhostLinks",

    markdown: {
      // Make heading links the same as on GitHub (e.g. #1-minimum-system-requirements),
      // so one link works in both places.
      anchor: { slugify: (text) => slug(text) },
    },

    themeConfig: {
      nav: [
        { text: "Local setup", link: "/getting-started/local-setup" },
        { text: "Architecture", link: "/architecture/overview" },
        { text: "Database", link: "/database/erd" },
      ],

      // Add every new doc here as well as to README.md.
      sidebar: [
        { text: "Start here", items: [{ text: "Overview", link: "/" }] },
        { text: "Getting started", items: [{ text: "Set up your local environment", link: "/getting-started/local-setup" }] },
        { text: "Architecture", items: [{ text: "Architecture overview", link: "/architecture/overview" }] },
        { text: "Database", items: [{ text: "ERD, schemas and users", link: "/database/erd" }] },
      ],

      outline: { level: [2, 3], label: "On this page" },
      search: { provider: "local" },
      editLink: { pattern: `${repo}/edit/main/:path`, text: "Edit this page on GitHub" },
      socialLinks: [{ icon: "github", link: repo }],
    },
  }),
);
