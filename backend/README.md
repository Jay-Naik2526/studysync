---
title: StudySync Backend
emoji: 🎓
colorFrom: blue
colorTo: red
sdk: docker
pinned: false
---

# StudySync Backend

Express.js + MongoDB backend for StudySync.
Listens on port 7860 as required by Hugging Face Spaces.

## Deployment

This folder is the root of the Hugging Face Space, published with:

```bash
git subtree push --prefix backend space main
```

The frontmatter above is required by Hugging Face — without it the Space loses its
`sdk: docker` setting and will not build. Keep this file in `backend/` so every
subtree push carries it along.

## Environment variables

Set these as Space secrets (Settings → Variables and secrets):

| Name | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Auth token signing |
| `ENCRYPTION_KEY` | Encrypts stored SAP credentials |
| `GEMINI_API_KEY_1`…`_5` | AI features (notes, planner, chatbot) |
| `CRON_SECRET` | Shared secret for the nightly `/api/sap/cron/run` job |
