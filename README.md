## 💡 About the Project

Finance Tracker is designed for users who want full control over their financial data. Unlike traditional finance apps, all your transactions, categories, and budgets are stored in your browser's **IndexedDB**. This means:
* **Privacy**: Your data never leaves your device.
* **Offline Access**: Works without an internet connection (via PWA capabilities).
* **No Accounts Needed**: Start tracking immediately with zero setup.

### Key Features
* **Transaction Tracking**: Easily log income and expenses.
* **Custom Categories**: Create and manage your own hierarchy of categories and subcategories.
* **Smart Budgeting**: Set monthly or one-time budgets and track progress visually. Expense against general income or your budgets.
* **Data Visualization**: Beautifully rendered Pie Charts and Sankey Diagrams (via D3.js) to visualize your cash flow.
* **PWA Support**: Install it on your mobile device or desktop as a standalone app.

## 🛠️ Tech Stack

* **Language**: [TypeScript](https://www.typescriptlang.org/) for robust, type-safe development.
* **Bundler**: [Vite](https://vitejs.dev/) for an extremely fast development experience.
* **Storage**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (via `idb` library) for persistent, local-only data storage.
* **Visualization**: [D3.js](https://d3js.org/) for powerful, custom data-driven document manipulation and charting.
* **Deployment**: [GitHub Pages](https://pages.github.com/) with automated CI/CD via GitHub Actions.

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) 20 or later (includes npm).

### Installation
```bash
git clone <this-repo-url>
cd FinanceManager
npm install
```

### Running the app
Start the dev server with hot-reload:
```bash
npm run dev
```
Then open the printed local URL (typically `http://localhost:5173`) in your browser. For the best experience, open your browser's device toolbar (or use a real phone on the same network) to preview the mobile layout.

## 📜 Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot module reload. |
| `npm run build` | Type-check the project and build an optimized production bundle to `dist/`. |
| `npm run preview` | Serve the production build locally to sanity-check it before deploying. |
| `npm run lint` | Run ESLint over the project. |
| `npm run format` | Format the codebase with Prettier. |
| `npm run test` | Run the unit test suite (Vitest). |

## 📦 Building for Production
```bash
npm run build
npm run preview
```
The optimized, installable PWA build is output to `dist/`.

## ☁️ Deploying to GitHub Pages
A GitHub Actions workflow (`.github/workflows/deploy.yml`) is already set up to build and deploy the app to GitHub Pages on every push to `main`. To enable it on your own repository:

1. Push this project to a GitHub repository.
2. In the repository settings, under **Pages**, set the source to **GitHub Actions**.
3. In `vite.config.ts`, set `base` to `/<your-repo-name>/` (or leave it as `/` if deploying to a user/org page).
4. Push to `main` — the workflow will build and publish the site automatically.

## 💾 Your Data
All data is stored locally in your browser via IndexedDB — nothing is sent to a server. Clearing your browser's site data (or using a different browser/device) will start you with a fresh, empty tracker.