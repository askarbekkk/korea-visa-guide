// ─── Конфиг Expo с поддержкой переменных окружения ───────────────────────────
// Ключи API читаются из .env и передаются в приложение через Constants.expoConfig.extra
// ВАЖНО: для продакшена перенести вызов API на serverless-эндпоинт (ключ не должен быть в бандле)

module.exports = {
  expo: {
    name: 'Inkor',
    slug: 'inkor',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    // Переменные окружения передаются в приложение через Constants.expoConfig.extra
    extra: {
      // Ключи берутся из .env файла (НИКОГДА не коммить .env в git)
      deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? '',
      tavilyApiKey: process.env.TAVILY_API_KEY ?? '',
      geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    },
  },
};
