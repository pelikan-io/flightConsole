# Flight Console

This is an [Observable Framework](https://observablehq.com/framework/) project.

## Getting started

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Then visit <http://localhost:3000> to preview your project.

## Project structure

```
.
├── observablehq.config.js  # Project configuration
├── src
│   ├── index.md            # Home page
│   ├── dashboard.md        # Example dashboard
│   ├── data/               # Data loaders
│   └── components/         # Reusable components
├── package.json
└── README.md
```

## Commands

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start local preview server |
| `npm run build` | Build your static site to `dist/` |
| `npm run deploy` | Deploy to Observable |
| `npm run clean` | Clear the local data loader cache |

## Learn more

- [Observable Framework documentation](https://observablehq.com/framework/)
- [Observable Plot](https://observablehq.com/plot/)
- [D3.js](https://d3js.org/)
