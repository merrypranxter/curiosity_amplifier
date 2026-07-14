# Curiosity Amplifier

A colorful Y2K/MySpace-flavored curiosity recommender that turns one or more interests into:

- 3 **Obvious Next** topics
- 5 **Hidden Cousins**
- 3 **Fringe/Spice** rabbit holes
- 4 **Hands-On** experiments, repos, datasets, or code paths

The app includes personality presets, manual sliders, surface/deep output modes, serendipity mode, hybrid-interest generation, local curiosity history, breadcrumb trails, and live resource enrichment through Wikipedia and OpenAlex.

## Architecture

- React + Vite frontend
- AppDeploy backend using built-in AI
- Optional bring-your-own OpenAI API key fallback (kept in memory for the current browser session only)
- Wikipedia API for starter references
- OpenAlex API for academic deep cuts
- Browser localStorage for query history

## Live app

https://6cdd66b136687de976.v2.appdeploy.ai/
