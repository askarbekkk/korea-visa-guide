# Korea Visa Guide

A mobile app that helps foreign students and workers in Korea handle visa procedures: personal checklists for their visa type and a Q&A bot that answers from official sources.

Built with Expo / React Native (TypeScript), runs on Android, iOS and the web. Interface in Russian and English.

## Features

- **Onboarding:** country, current visa (D-2, D-4, D-10, E-7, F-2, F-4, F-5, F-6, G-1, H-2) and goal.
- **Personal checklists:** visa extension, part-time work permit, D-2 → D-10 status change, re-entry permit, address change, ARC registration. Each item has an explanation, deadline and fee; progress is saved on the device.
- **Live refresh:** Korean-language search queries pull current requirements from HiKorea; an LLM extracts the document list and fee.
- **Q&A bot:** answers from official sources (HiKorea, Ministry of Justice, embassies) with source links, and points to HiKorea or the 1345 immigration hotline when it is not sure.
- **Switchable LLM provider:** Gemini (falls back to a lighter model on overload), DeepSeek, or Claude through a server proxy.

## Architecture

```
Onboarding → Guide tab ── built-in checklists (JSON) + on-device progress
                       └─ HiKorea refresh: Tavily search → LLM extraction
           → Bot tab   ── Tavily search (official sources) → LLM → answer + links
```

## Run

```bash
npm install
cp .env.example .env      # add your API keys
npx expo start            # press w for web, or scan the QR code with Expo Go
```

Keys: `EXPO_PUBLIC_GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `TAVILY_API_KEY`.

> Keys passed to the client are visible in the app bundle. For a public release, move LLM calls behind a small server proxy.

## Disclaimer

Information is for reference only and rules change. Always confirm with HiKorea (www.hikorea.go.kr) or call 1345.
