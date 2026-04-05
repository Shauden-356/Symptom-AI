# SymptomAI — Next.js + Vercel

AI-powered disease prediction. Everything — frontend and backend — runs on a **single Vercel deployment**. No Render, no Railway, no separate backend needed.

## Stack

- **Frontend**: Next.js 14 (App Router) — React UI
- **Backend**: Python serverless functions in `/api` — scikit-learn ML model
- **AI explanation**: puter.js — free Claude AI, no API key needed
- **Deploy**: Vercel only

## Structure

```
symptom-ai/
├── app/
│   ├── layout.js       Root layout + fonts + puter.js script
│   ├── page.js         Main React UI
│   └── globals.css     All styles
│
├── api/                Python serverless functions → /api/*
│   ├── _lib.py         Shared model loader
│   ├── health.py       GET  /api/health
│   ├── symptoms.py     GET  /api/symptoms
│   ├── categories.py   GET  /api/categories
│   ├── predict.py      POST /api/predict
│   ├── questions.py    POST /api/questions
│   ├── requirements.txt
│   ├── model.pkl       Pre-trained model (committed to Git)
│   ├── label_encoder.pkl
│   ├── symptoms.json
│   ├── diseases.json
│   └── data/
│       ├── diseases_db.json     ✏️ Add diseases here
│       ├── questions_db.json    ✏️ Add UI tabs here
│       └── symptom_labels.json  ✏️ Fix symptom names here
│
├── package.json
├── next.config.js
├── vercel.json
└── .gitignore
```

## Deploy (one command)

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/symptom-ai.git
git push -u origin main

# 2. Go to vercel.com → New Project → Import your repo
#    Framework: Next.js  (auto-detected)
#    Root Directory: . (the repo root, default)
#    No environment variables needed
#    Click Deploy
```

Done. Your app is live at `https://symptom-ai.vercel.app`.

## Local Development

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Adding a New Disease

Edit `api/data/diseases_db.json`, commit and push. The model is pre-trained so you also need to retrain locally and commit the new `model.pkl`:

```bash
cd api
python train.py   # regenerates model.pkl, symptoms.json, diseases.json
cd ..
git add .
git commit -m "add new disease"
git push
```
