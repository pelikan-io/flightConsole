// See https://observablehq.com/framework/config for documentation.
export default {
  // The app's title; used in the sidebar and webpage titles.
  title: "Flight Console",

  // The pages and sections in the sidebar. If you don't specify this,
  // all pages will be listed in alphabetical order. Customize this to
  // organize your pages into sections and give them human-readable titles.
  pages: [
    {
      name: "Calculators",
      pages: [
        {name: "Cluster Calculator", path: "/cluster"},
        {name: "Segcache Calculator", path: "/segcache"},
      ]
    }
  ],

  // The path to the source root.
  root: "src",

  // Some additional configuration options and their defaults:
  // theme: "default", // try "light", "dark", "slate", etc.
  // header: "", // what to show in the header (HTML)
  // footer: "Built with Observable.", // what to show in the footer (HTML)
  // sidebar: true, // whether to show the sidebar
  // toc: true, // whether to show the table of contents
  // pager: true, // whether to show previous & next links in the footer
  // output: "dist", // path to the output root for build
  // search: true, // activate search
  // linkify: true, // convert URLs in Markdown to links
  // typographer: false, // smart quotes and other typographic substitutions
  // cleanUrls: true, // drop .html from URLs
};
