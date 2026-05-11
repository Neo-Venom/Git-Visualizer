<div align="center">
  <img src="https://cdn-icons-png.flaticon.com/512/1006/1006363.png" alt="Git Learner Logo" width="80" />
  <h1>Git Learner Interactive Visualizer</h1>
  <p>A beautiful, highly interactive tool to master Git through visual feedback.</p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](#)
</div>

---

## 🚀 Overview

**Git Learner** is a modern, React-based web application designed to help developers visualize Git workflows in real-time. With a premium dark mode UI, smooth animations, and a fully functional simulated terminal, you can practice branching, merging, and rebasing without risking your actual repositories.

## ✨ Features

- **Interactive Terminal**: A fully simulated shell environment supporting commands like `init`, `commit`, `branch`, `checkout`, `merge`, `rebase`, and more!
- **Real-time Visualizer**: An animated, left-to-right topological graph that dynamically responds to your terminal inputs.
- **Micro-interactions**: Hover effects, pinging active HEAD pointers, and smooth curve interpolations powered by Framer Motion.
- **Error Guidance**: Built-in typo handling and standard Git errors (like detached HEAD warnings) to teach best practices.
- **Premium Aesthetics**: Cyberpunk-inspired dark theme with neon track highlights.

## 🛠️ Tech Stack

- **Framework**: React 19 / Vite
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **State Management**: Custom lightweight topological Git engine

## 💻 Local Development

1. **Clone the repository** (or your own fork):
   ```bash
   git clone https://github.com/iamgh/gitflow-visualizer.git
   cd gitflow-visualizer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:8081` to start visualizing!

## ☁️ Deploying to Vercel

Publishing this application to Vercel is incredibly easy since it's a standard Vite application. Follow these steps to get a live URL:

1. Create an account on [Vercel](https://vercel.com/) and connect it to your GitHub account.
2. In the Vercel dashboard, click **Add New...** -> **Project**.
3. Import the `gitflow-visualizer` repository.
4. Vercel will automatically detect that it's a Vite project. The default settings should be perfect:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Deploy**.
6. Once deployed, Vercel will give you a live URL. **Come back to this `README.md` and replace the `#` in the Vercel badge at the top with your new URL!**

## 🤝 Credits

© {YEAR} All rights reserved. Built by [iamgh](https://github.com/iamgh).
