(function () {
  const STATE_KEY = '__ttEnhancerAiPanel';
  const LEGACY_STATE_KEY = '__ttEnhancerGeminiPanel';
  const BUTTON_ID = 'tt-enhancer-ai-button';
  const RAIL_BUTTON_ID = 'tt-enhancer-ai-rail-button';
  const LEGACY_BUTTON_ID = 'tt-enhancer-gemini-button';
  const MINI_BROWSER_BUTTON_ID = 'tt-enhancer-mini-browser-button';
  const PANEL_ID = 'tt-enhancer-ai-panel';
  const LEGACY_PANEL_ID = 'tt-enhancer-gemini-panel';
  const OPEN_KEY = 'tt_enhancer_ai_panel_open';
  const LEGACY_PANEL_X_KEY = 'tt_enhancer_ai_panel_x';
  const LEGACY_SHIFTED_LEFT_KEY = 'tt_enhancer_ai_panel_shifted_left';
  const REMOVED_PINNED_KEY = 'tt_enhancer_ai_panel_pinned';
  const WIDTH_KEY = 'tt_enhancer_ai_panel_width';
  const REMOVED_RAIL_X_KEY = 'tt_enhancer_ai_panel_rail_x';
  const FLOATING_RECT_KEY = 'tt_enhancer_ai_panel_floating_rect';
  const RAIL_COLLAPSED_KEY = 'tt_enhancer_ai_panel_rail_collapsed';
  const DRAFT_KEY = 'tt_enhancer_ai_panel_prompt_draft';
  const CODE_DRAFT_KEY = 'tt_enhancer_ai_panel_code_draft';
  const STYLE_DRAFT_KEY = 'tt_enhancer_ai_panel_style_draft';
  const SCRIPT_DRAFT_KEY = 'tt_enhancer_ai_panel_script_draft';
  const RULE_DRAFT_KEY = 'tt_enhancer_ai_panel_builder_rule_draft';
  const RULE_DEFAULTS_KEY = 'tt_enhancer_ai_panel_builder_rule_defaults';
  const BUILDER_MODE_KEY = 'tt_enhancer_ai_panel_builder_mode';
  const SCRIPT_VERSION = '2026-06-09-ai-panel-v102-openai-compatible';
  const REQUEST_SOURCE = 'tt-enhancer-ai-panel';
  const RESPONSE_SOURCE = 'tt-enhancer-ai-panel-bridge';
  const PUTER_SANDBOX_REQUEST_SOURCE = 'tt-enhancer-ai-panel-puter-sandbox-request';
  const PUTER_SANDBOX_RESPONSE_SOURCE = 'tt-enhancer-ai-panel-puter-sandbox-response';
  const CLIPBOARD_KEY = 'clipboardData';
  const LAYER_EXPORT_TYPE = 'taptop-enhancer-layer-export';
  const PUTER_SANDBOX_ID = 'tt-enhancer-ai-puter-sandbox';
  const CONSTRUCTOR_UNIQUE_CLASS_RE = /--u-([a-z0-9]+)$/;
  const CONSTRUCTOR_IGNORED_CLASS_CONFLICT_NAMES = new Set(['helper--d-none']);
  const DEFAULT_PROVIDER = 'gemini';
  const DEFAULT_MODEL = 'gemini-2.5-flash';
  const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';
  const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';
  const DEFAULT_OPENROUTER_IMAGE_MODEL = 'google/gemini-2.5-flash-image';
  const DEFAULT_OPENAI_COMPATIBLE_MODEL = 'gpt-4o-mini';
  const DEFAULT_PUTER_MODEL = 'gemini-2.5-flash';
  const DEFAULT_PUTER_IMAGE_MODEL = 'gemini-2.5-flash-image';
  const AI_HIDDEN_CLASS_NAME = 'tt-enhancer-ai-hidden';
  const THINKING_MIN_MS = 3000;
  const SELECTION_SYNC_INTERVAL_MS = 1800;
  const BUTTON_TOGGLE_GUARD_MS = 420;
  const MENU_CLOSE_ANIMATION_MS = 140;
  const MENU_BUTTON_CLICK_GUARD_MS = 360;
  const PANEL_CLOSE_ANIMATION_MS = 180;
  const RAIL_ANIMATION_MS = 180;
  const GENERATED_IMAGE_MAX_EDGE = 1800;
  const GENERATED_IMAGE_MAX_PIXELS = 2500000;
  const GENERATED_IMAGE_MAX_DATA_URL_CHARS = 3500000;
  const GENERATED_IMAGE_WEBP_QUALITY = 0.86;
  const BUILDER_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
  const MAX_PROMPT_TEXTS = 80;
  const MAX_TEXT_CHARS = 4000;
  const MAX_TOTAL_TEXT_CHARS = 32000;
  const LAYOUT_CONTEXT_FORMAT = 'taptop-constructor-spec/v1';
  const MAX_LAYOUT_CONTEXT_LAYERS = 80;
  const MAX_LAYOUT_CONTEXT_CHARS = 45000;
  const MAX_LAYOUT_OUTLINE_TEXT_CHARS = 160;
  const DEFAULT_PANEL_WIDTH = 460;
  const MIN_PANEL_WIDTH = 380;
  const MIN_FLOATING_PANEL_HEIGHT = 260;
  const PANEL_TOP_OFFSET = 50;
  const PANEL_BAR_HEIGHT = 46;
  const PANEL_VIEWPORT_MARGIN = 12;
  const MOBILE_PANEL_BREAKPOINT = 720;

  const PROVIDER_OPTIONS = [
    { value: 'gemini', label: 'Gemini API' },
    { value: 'openrouter', label: 'OpenRouter API' },
    { value: 'openai-compatible', label: 'OpenAI-compatible' },
    { value: 'puter', label: 'Puter.js Gemini' }
  ];

  const MODEL_TIER_LABELS = {
    free: 'Бесплатные',
    paid: 'Платные',
    custom: 'Своя модель'
  };
  const MODEL_TIER_ORDER = ['free', 'paid', 'custom'];
  const MODEL_MODES = {
    text: 'text',
    image: 'image'
  };
  const CUSTOM_MODEL_LIMIT = 30;

  const MODEL_OPTIONS = {
    gemini: [
      { value: 'gemini-2.5-flash', label: 'Gemini - gemini-2.5-flash', tier: 'free', mode: 'text' },
      { value: 'gemini-2.5-flash-lite', label: 'Gemini - gemini-2.5-flash-lite', tier: 'free', mode: 'text' },
      { value: 'gemini-2.0-flash', label: 'Gemini - gemini-2.0-flash', tier: 'free', mode: 'text' },
      { value: 'gemini-3.5-flash', label: 'Gemini - gemini-3.5-flash', tier: 'paid', mode: 'text' },
      { value: 'gemini-2.5-pro', label: 'Gemini - gemini-2.5-pro (квота Pro)', tier: 'paid', mode: 'text' },
      { value: DEFAULT_IMAGE_MODEL, label: 'Gemini - gemini-2.5-flash-image', tier: 'paid', mode: 'image' },
      { value: 'gemini-3.1-flash-image', label: 'Gemini - gemini-3.1-flash-image', tier: 'paid', mode: 'image' }
    ],
    puter: [
      { value: DEFAULT_PUTER_MODEL, label: 'Puter - gemini-2.5-flash', tier: 'free', mode: 'text' },
      { value: 'gemini-2.5-flash-lite', label: 'Puter - gemini-2.5-flash-lite', tier: 'free', mode: 'text' },
      { value: 'gemini-2.5-pro', label: 'Puter - gemini-2.5-pro', tier: 'free', mode: 'text' },
      { value: 'gemini-2.0-flash', label: 'Puter - gemini-2.0-flash', tier: 'free', mode: 'text' },
      { value: 'gemini-2.0-flash-lite', label: 'Puter - gemini-2.0-flash-lite', tier: 'free', mode: 'text' },
      { value: 'gemini-3.5-flash', label: 'Puter - gemini-3.5-flash', tier: 'free', mode: 'text' },
      { value: 'gemini-3.1-flash-lite', label: 'Puter - gemini-3.1-flash-lite', tier: 'free', mode: 'text' },
      { value: 'gemini-3.1-pro-preview', label: 'Puter - gemini-3.1-pro-preview', tier: 'free', mode: 'text' },
      { value: 'gemini-3-flash-preview', label: 'Puter - gemini-3-flash-preview', tier: 'free', mode: 'text' },
      { value: 'gemini-3-pro-preview', label: 'Puter - gemini-3-pro-preview', tier: 'free', mode: 'text' },
      { value: DEFAULT_PUTER_IMAGE_MODEL, label: 'Puter - gemini-2.5-flash-image', tier: 'free', mode: 'image' },
      { value: 'gemini-3.1-flash-image-preview', label: 'Puter - gemini-3.1-flash-image-preview', tier: 'free', mode: 'image' },
      { value: 'gemini-3-pro-image-preview', label: 'Puter - gemini-3-pro-image-preview', tier: 'free', mode: 'image' }
    ],
    openrouter: [
      { value: DEFAULT_OPENROUTER_MODEL, label: 'OpenRouter - openrouter/free', tier: 'free', mode: 'text' },
      { value: 'openrouter/owl-alpha', label: 'OpenRouter - openrouter/owl-alpha', tier: 'free', mode: 'text' },
      { value: 'openai/gpt-oss-120b:free', label: 'OpenRouter - openai/gpt-oss-120b:free', tier: 'free', mode: 'text' },
      { value: 'openai/gpt-oss-20b:free', label: 'OpenRouter - openai/gpt-oss-20b:free', tier: 'free', mode: 'text' },
      { value: 'z-ai/glm-4.5-air:free', label: 'OpenRouter - z-ai/glm-4.5-air:free', tier: 'free', mode: 'text' },
      { value: 'google/gemma-4-31b:free', label: 'OpenRouter - google/gemma-4-31b:free', tier: 'free', mode: 'text' },
      { value: 'moonshotai/kimi-k2.6:free', label: 'OpenRouter - moonshotai/kimi-k2.6:free', tier: 'free', mode: 'text' },
      { value: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'OpenRouter - nvidia/nemotron-3-ultra-550b-a55b:free', tier: 'free', mode: 'text' },
      { value: 'poolside/laguna-m.1:free', label: 'OpenRouter - poolside/laguna-m.1:free', tier: 'free', mode: 'text' },
      { value: 'poolside/laguna-xs.2:free', label: 'OpenRouter - poolside/laguna-xs.2:free', tier: 'free', mode: 'text' },
      { value: 'openrouter/auto', label: 'OpenRouter - openrouter/auto', tier: 'paid', mode: 'text' },
      { value: 'openai/gpt-5-nano', label: 'OpenRouter - openai/gpt-5-nano', tier: 'paid', mode: 'text' },
      { value: 'openai/gpt-5-mini', label: 'OpenRouter - openai/gpt-5-mini', tier: 'paid', mode: 'text' },
      { value: 'anthropic/claude-haiku-4.5', label: 'OpenRouter - anthropic/claude-haiku-4.5', tier: 'paid', mode: 'text' },
      { value: 'deepseek/deepseek-v4-flash', label: 'OpenRouter - deepseek/deepseek-v4-flash', tier: 'paid', mode: 'text' },
      { value: 'deepseek/deepseek-v3.2', label: 'OpenRouter - deepseek/deepseek-v3.2', tier: 'paid', mode: 'text' },
      { value: 'qwen/qwen3.6-flash', label: 'OpenRouter - qwen/qwen3.6-flash', tier: 'paid', mode: 'text' },
      { value: 'inclusionai/ling-2.6-flash', label: 'OpenRouter - inclusionai/ling-2.6-flash', tier: 'paid', mode: 'text' },
      { value: 'minimax/minimax-m2.7', label: 'OpenRouter - minimax/minimax-m2.7', tier: 'paid', mode: 'text' },
      { value: 'moonshotai/kimi-k2.6', label: 'OpenRouter - moonshotai/kimi-k2.6', tier: 'paid', mode: 'text' },
      { value: 'z-ai/glm-5.1', label: 'OpenRouter - z-ai/glm-5.1', tier: 'paid', mode: 'text' },
      { value: 'google/gemini-2.5-flash', label: 'OpenRouter - google/gemini-2.5-flash', tier: 'paid', mode: 'text' },
      { value: 'google/gemini-2.5-flash-lite', label: 'OpenRouter - google/gemini-2.5-flash-lite', tier: 'paid', mode: 'text' },
      { value: 'google/gemini-3.1-flash-lite', label: 'OpenRouter - google/gemini-3.1-flash-lite', tier: 'paid', mode: 'text' },
      { value: 'openrouter/auto', label: 'OpenRouter - openrouter/auto', tier: 'paid', mode: 'image' },
      { value: DEFAULT_OPENROUTER_IMAGE_MODEL, label: 'OpenRouter - google/gemini-2.5-flash-image', tier: 'paid', mode: 'image' },
      { value: 'google/gemini-3.1-flash-image-preview', label: 'OpenRouter - google/gemini-3.1-flash-image-preview', tier: 'paid', mode: 'image' },
      { value: 'black-forest-labs/flux.2-klein-4b', label: 'OpenRouter - black-forest-labs/flux.2-klein-4b', tier: 'paid', mode: 'image' },
      { value: 'black-forest-labs/flux.2-flex', label: 'OpenRouter - black-forest-labs/flux.2-flex', tier: 'paid', mode: 'image' },
      { value: 'black-forest-labs/flux.2-pro', label: 'OpenRouter - black-forest-labs/flux.2-pro', tier: 'paid', mode: 'image' },
      { value: 'sourceful/riverflow-v2-fast', label: 'OpenRouter - sourceful/riverflow-v2-fast', tier: 'paid', mode: 'image' },
      { value: 'sourceful/riverflow-v2-standard-preview', label: 'OpenRouter - sourceful/riverflow-v2-standard-preview', tier: 'paid', mode: 'image' },
      { value: 'bytedance-seed/seedream-4.5', label: 'OpenRouter - bytedance-seed/seedream-4.5', tier: 'paid', mode: 'image' },
      { value: 'recraft/recraft-v4.1', label: 'OpenRouter - recraft/recraft-v4.1', tier: 'paid', mode: 'image' },
      { value: 'openai/gpt-5-image-mini', label: 'OpenRouter - openai/gpt-5-image-mini', tier: 'paid', mode: 'image' },
      { value: 'x-ai/grok-imagine-image-quality', label: 'OpenRouter - x-ai/grok-imagine-image-quality', tier: 'paid', mode: 'image' }
    ],
    'openai-compatible': [
      { value: DEFAULT_OPENAI_COMPATIBLE_MODEL, label: 'OpenAI-compatible - gpt-4o-mini', tier: 'paid', mode: 'text' },
      { value: 'gpt-4o', label: 'OpenAI-compatible - gpt-4o', tier: 'paid', mode: 'text' },
      { value: 'gpt-4.1-mini', label: 'OpenAI-compatible - gpt-4.1-mini', tier: 'paid', mode: 'text' },
      { value: 'gemini-3.5-flash', label: 'gemini-web2api - gemini-3.5-flash', tier: 'free', mode: 'text' },
      { value: 'gemini-3.5-flash-thinking', label: 'gemini-web2api - gemini-3.5-flash-thinking', tier: 'free', mode: 'text' },
      { value: 'gemini-3.5-flash-thinking@think=2', label: 'gemini-web2api - thinking@2', tier: 'free', mode: 'text' },
      { value: 'deepseek-chat', label: 'FreeDeepseekAPI - deepseek-chat', tier: 'free', mode: 'text' },
      { value: 'deepseek-reasoner', label: 'FreeDeepseekAPI - deepseek-reasoner', tier: 'free', mode: 'text' },
      { value: 'deepseek-r1', label: 'FreeDeepseekAPI - deepseek-r1', tier: 'free', mode: 'text' },
      { value: 'deepseek-chat-search', label: 'FreeDeepseekAPI - deepseek-chat-search', tier: 'free', mode: 'text' }
    ]
  };

  const QUICK_ACTIONS = [
    { label: 'Англ.', title: 'Перевести на английский', prompt: 'Переведи весь текст выбранного слоя на английский язык.' },
    { label: 'Рус.', title: 'Перевести на русский', prompt: 'Переведи весь текст выбранного слоя на русский язык.' },
    { label: 'Ошибки', title: 'Исправить ошибки', prompt: 'Исправь ошибки в тексте выбранного слоя, сохранив смысл и структуру.' },
    { label: 'Рерайт', title: 'Сделать рерайт', prompt: 'Сделай рерайт текста выбранного слоя: яснее, живее, без потери смысла.' },
    { label: 'Тон', title: 'Смягчить тон', prompt: 'Сделай тон текста выбранного слоя мягче и дружелюбнее.' }
  ];

  const IMAGE_QUICK_ACTIONS = [
    { label: 'Свет', title: 'Настроить свет', prompt: 'Улучши освещение выбранного изображения: выровняй экспозицию, убери слишком тёмные участки и сохрани естественные цвета.' },
    { label: 'Стилизовать', title: 'Стилизовать изображение', prompt: 'Стилизуй выбранное изображение в современном аккуратном стиле, сохрани композицию и основной объект.' },
    { label: 'Заменить фон', title: 'Заменить фон', prompt: 'Замени фон выбранного изображения на чистый светлый студийный фон, сохрани основной объект без искажений.' },
    { label: 'Удалить фон', title: 'Удалить фон', prompt: 'Удали фон выбранного изображения, сохрани основной объект и сделай фон прозрачным.' }
  ];

  const BUILDER_QUICK_ACTIONS = [
    { label: 'По коду', title: 'Сверстать по коду', prompt: 'Сверстай по коду', codeAction: true },
    { label: 'Слайдер', title: 'Вертикальный слайдер', prompt: 'Сверстай вертикальный слайдер типа Swiper: контейнер, track, 4 slide, навигация/буллеты. Классы сохрани на слоях, основные стили задай в styles/mediaStyles, JS в отдельном Embed.' },
    { label: 'Карточки', title: 'Сетка карточек', prompt: 'Сверстай адаптивную секцию карточек: wrapper, grid, 4 карточки с заголовком, текстом и кнопкой. Классы сохрани на слоях, основные стили задай в styles/mediaStyles.' },
    { label: 'Секция', title: 'Hero секция', prompt: 'Сверстай hero-секцию для TapTop: div-слои, текстовые слои, CTA как Link Block. Классы сохрани на слоях, основные стили задай в styles/mediaStyles.' }
  ];

  const BUILDER_RULE_FIELDS = [
    {
      key: 'rootSelectors',
      sectionLabel: 'Правила сборщика',
      label: 'Root-селекторы',
      description: 'Глобальные селекторы, стили которых нужно переносить на корневой слой компонента. Обычные классы из <style> сюда не относятся.',
      placeholder: ':root\nbody\n.page-wrapper',
      defaultValue: ':root\nbody'
    },
    {
      key: 'rootClassStyles',
      label: 'Классы > корневой класс слоя',
      description: 'Исключения: классы из исходного <style>, стили которых нужно перенести в root/уникальный класс слоя вместо ����мого класса. По умолчанию пусто: стили классов идут в классы.',
      placeholder: '.page-wrapper\n.container',
      defaultValue: ''
    },
    {
      key: 'keepClasses',
      label: 'Сохранять классы',
      description: 'Классы, которые должны остаться на слоях для JS, Swiper, навигации и библиотечных состояний, даже если обычные стили перенесены в слои.',
      placeholder: 'swiper\nswiper-wrapper\nswiper-slide',
      defaultValue: 'swiper\nswiper-wrapper\nswiper-slide\nswiper-button-disabled\ncustom-prev\ncustom-next'
    },
    {
      key: 'skipClasses',
      sectionLabel: 'Инструкции для AI',
      label: 'Не плодить классы',
      description: 'Классы-обертки или сеточные классы, которые не нужно создавать как отдельную стилистическую сущность, если они не нужны для JS.',
      placeholder: 'container\nrow\ncol',
      defaultValue: ''
    },
    {
      key: 'embedCss',
      label: 'CSS в Embed',
      description: 'Селекторы и конструкции CSS, которые нельзя нормально задать через интерфейс TapTop: hover, псевдоэлементы, keyframes, сложные состояния.',
      placeholder: ':hover\n::before\n@keyframes',
      defaultValue: ':hover\n:focus\n:active\n::before\n::after\n@keyframes\n.swiper-button-disabled'
    },
    {
      key: 'styleGuards',
      label: 'Защитные запреты',
      description: 'Подозрительные стили, которые модель не должна придумывать без явного источника, например случайные max-width:120px или height:0px.',
      placeholder: 'max-width: 120px unless-source\nheight: 0px unless-source',
      defaultValue: 'max-width: 120px unless-source\nheight: 0px unless-source\nmin-height: 0px unless-source'
    },
    {
      key: 'nativeStyles',
      label: 'Обычные стили',
      description: 'Свойства, которые TapTop умеет задавать через слой. Для них нельзя использовать custom properties, кроме значений вроде calc или var.',
      placeholder: 'width\nheight\ndisplay\npadding',
      defaultValue: 'width\nheight\nmin-width\nmax-width\nmin-height\nmax-height\ndisplay\nposition\ntop\nright\nbottom\nleft\nmargin-top\nmargin-right\nmargin-bottom\nmargin-left\npadding-top\npadding-right\npadding-bottom\npadding-left\nrow-gap\ncolumn-gap\nflex-direction\njustify-content\nalign-items\nflex-wrap\ngrid-template-columns\nborder-top-width\nborder-right-width\nborder-bottom-width\nborder-left-width\nborder-top-style\nborder-right-style\nborder-bottom-style\nborder-left-style\nborder-top-color\nborder-right-color\nborder-bottom-color\nborder-left-color\nborder-top-left-radius\nborder-top-right-radius\nborder-bottom-right-radius\nborder-bottom-left-radius\nbackground-color\nbackground-image\nbackground-size\nbackground-repeat\nbackground-position\ncolor\nfont-size\nfont-weight\nfont-style\nline-height\nletter-spacing\nopacity\noverflow-x\noverflow-y'
    }
  ];

  function removeLegacyAiPanelDom() {
    if (!document?.querySelectorAll) return;
    const selectors = [
      '#' + LEGACY_PANEL_ID,
      '#' + LEGACY_BUTTON_ID,
      '.' + LEGACY_PANEL_ID,
      '.' + LEGACY_BUTTON_ID,
      '[id^="tt-enhancer-gemini"]',
      '[class*="tt-enhancer-gemini-"]'
    ];
    document.querySelectorAll(selectors.join(',')).forEach((node) => {
      if (!node || node.id === PANEL_ID || node.id === BUTTON_ID) return;
      node.remove?.();
    });
  }

  removeLegacyAiPanelDom();

  const existingState = window[STATE_KEY];
  if (existingState?.mount && existingState.version === SCRIPT_VERSION) {
    existingState.mount();
    return;
  }

  try {
    existingState?.destroy?.();
    if (window[LEGACY_STATE_KEY] && window[LEGACY_STATE_KEY] !== window[STATE_KEY]) {
      window[LEGACY_STATE_KEY]?.destroy?.();
    }
  } catch {}

  let runtimeRequire = null;

  const state = {
    version: SCRIPT_VERSION,
    observer: null,
    puterSandboxFrame: null,
    puterSandboxUrl: '',
    puterSdkCode: '',
    puterSdkSourceUrl: '',
    observerTimer: 0,
    selectionTimer: 0,
    codeResizeFrame: 0,
    codeEditorInitTimer: 0,
    codeEditors: new Map(),
    selectionWarmupTimers: [],
    floatingRect: readFloatingRect(),
    collapsedRect: null,
    panelDrag: null,
    panelResize: null,
    resizeListener: null,
    buttonGlobalEventsBound: false,
    menuOutsideEventsBound: false,
    menuHideTimer: 0,
    panelCloseTimer: 0,
    railAnimationTimer: 0,
    railAnimationCleanup: null,
    lastButtonToggleAt: 0,
    lastButtonPointerToggleAt: 0,
    lastMenuButtonPointerAt: 0,
    button: null,
    railButton: null,
    panel: null,
    modelOptions: {
      gemini: MODEL_OPTIONS.gemini.slice(),
      openrouter: MODEL_OPTIONS.openrouter.slice(),
      'openai-compatible': MODEL_OPTIONS['openai-compatible'].slice(),
      puter: MODEL_OPTIONS.puter.slice()
    },
    openRouterModelsLoading: false,
    openRouterModelsLoaded: false,
    openAiCompatibleModelsLoading: false,
    openAiCompatibleModelsLoaded: false,
    openAiCompatibleModelsBaseUrl: '',
    settings: {
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_MODEL,
      geminiModel: DEFAULT_MODEL,
      geminiImageModel: DEFAULT_IMAGE_MODEL,
      openRouterModel: DEFAULT_OPENROUTER_MODEL,
      openRouterImageModel: DEFAULT_OPENROUTER_IMAGE_MODEL,
      openAiCompatibleModel: DEFAULT_OPENAI_COMPATIBLE_MODEL,
      openAiCompatibleBaseUrl: '',
      puterModel: DEFAULT_PUTER_MODEL,
      puterImageModel: DEFAULT_PUTER_IMAGE_MODEL,
      customModels: {
        gemini: [],
        openrouter: [],
        'openai-compatible': [],
        puter: []
      },
      hasApiKey: false,
      hasGeminiApiKey: false,
      hasOpenRouterApiKey: false,
      hasOpenAiCompatibleApiKey: false,
      hasOpenAiCompatibleBaseUrl: false,
      hasPuterApiKey: true
    },
    isBuilderMode: readBuilderMode(),
    builderImage: null,
    isRailCollapsed: readRailCollapsed(),
    selectedContext: null,
    changeSets: new Map(),
    isOpen: false,
    isLoading: false,
    isDestroyed: false,
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!state.isOpen),
    mount,
    destroy
  };
  let constructorConflictDialog = null;

  function getRuntimeRequire() {
    if (runtimeRequire) return runtimeRequire;

    const chunk = window.rspackChunktaptop_design_editor;
    if (!chunk || typeof chunk.push !== 'function') return null;

    try {
      const chunkId = `tt-enhancer-ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      chunk.push([[chunkId], {}, (req) => {
        runtimeRequire = req;
      }]);
    } catch {}

    return runtimeRequire;
  }

  function getTaptopApi() {
    const req = getRuntimeRequire();
    if (!req) return null;

    try {
      return {
        layout: req(36945)?.A,
        runtime: req(87621)?.A,
        events: req(91893)?.A,
        history: req(16271)?.A,
        clipboard: req(6269)?.A,
        clipboardStore: req(34369)?.N,
        constants: req(89224),
        layers: req(39510)?.A,
        ui: req(68089)?.A
      };
    } catch {}
  }

  function readOpenState() {
    try {
      return localStorage.getItem(OPEN_KEY) === '1';
    } catch {
      return false;
    }
  }

  function writeOpenState(isOpen) {
    try {
      localStorage.setItem(OPEN_KEY, isOpen ? '1' : '0');
    } catch {}
  }

  function readPanelWidth() {
    try {
      const value = Number(localStorage.getItem(WIDTH_KEY));
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
      return null;
    }
  }

  function writePanelWidth(value) {
    try {
      if (Number.isFinite(value) && value > 0) localStorage.setItem(WIDTH_KEY, String(Math.round(value)));
      else localStorage.removeItem(WIDTH_KEY);
    } catch {}
  }

  function readFloatingRect() {
    try {
      const raw = localStorage.getItem(FLOATING_RECT_KEY);
      if (!raw) return null;
      const rect = JSON.parse(raw);
      if (!rect || typeof rect !== 'object') return null;
      const normalized = {
        left: Number(rect.left),
        top: Number(rect.top),
        width: Number(rect.width),
        height: Number(rect.height)
      };
      if (!Object.values(normalized).every(Number.isFinite)) return null;
      if (normalized.height < MIN_FLOATING_PANEL_HEIGHT) normalized.height = MIN_FLOATING_PANEL_HEIGHT;
      return normalized;
    } catch {
      return null;
    }
  }

  function writeFloatingRect(rect) {
    try {
      if (!rect) {
        localStorage.removeItem(FLOATING_RECT_KEY);
        return;
      }
      const height = Number(rect.height);
      localStorage.setItem(FLOATING_RECT_KEY, JSON.stringify({
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(Number.isFinite(height) && height >= MIN_FLOATING_PANEL_HEIGHT ? height : MIN_FLOATING_PANEL_HEIGHT)
      }));
    } catch {}
  }

  function clearLegacyPanelPositionState() {
    try {
      localStorage.removeItem(LEGACY_PANEL_X_KEY);
      localStorage.removeItem(LEGACY_SHIFTED_LEFT_KEY);
      localStorage.removeItem(REMOVED_PINNED_KEY);
      localStorage.removeItem(REMOVED_RAIL_X_KEY);
    } catch {}
  }

  function readRailCollapsed() {
    try {
      return localStorage.getItem(RAIL_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  }

  function writeRailCollapsed(value) {
    try {
      localStorage.setItem(RAIL_COLLAPSED_KEY, value ? '1' : '0');
    } catch {}
  }

  function readDraft() {
    try {
      return localStorage.getItem(DRAFT_KEY) || '';
    } catch {
      return '';
    }
  }

  function writeDraft(value) {
    try {
      const text = String(value || '');
      if (text) localStorage.setItem(DRAFT_KEY, text);
      else localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }

  function readCodeDraft() {
    try {
      return localStorage.getItem(CODE_DRAFT_KEY) || '';
    } catch {
      return '';
    }
  }

  function writeCodeDraft(value) {
    try {
      const text = String(value || '');
      if (text) localStorage.setItem(CODE_DRAFT_KEY, text);
      else localStorage.removeItem(CODE_DRAFT_KEY);
    } catch {}
  }

  function readStyleDraft() {
    try {
      return localStorage.getItem(STYLE_DRAFT_KEY) || '';
    } catch {
      return '';
    }
  }

  function writeStyleDraft(value) {
    try {
      const text = String(value || '');
      if (text) localStorage.setItem(STYLE_DRAFT_KEY, text);
      else localStorage.removeItem(STYLE_DRAFT_KEY);
    } catch {}
  }

  function readScriptDraft() {
    try {
      return localStorage.getItem(SCRIPT_DRAFT_KEY) || '';
    } catch {
      return '';
    }
  }

  function writeScriptDraft(value) {
    try {
      const text = String(value || '');
      if (text) localStorage.setItem(SCRIPT_DRAFT_KEY, text);
      else localStorage.removeItem(SCRIPT_DRAFT_KEY);
    } catch {}
  }

  function presetBuilderRules() {
    const result = {};
    BUILDER_RULE_FIELDS.forEach((field) => {
      result[field.key] = String(field.defaultValue || '');
    });
    result.replaceFrom = '';
    result.replaceTo = '';
    return result;
  }

  function normalizeBuilderRules(value) {
    const source = isPlainObject(value) ? value : {};
    const result = {};
    BUILDER_RULE_FIELDS.forEach((field) => {
      result[field.key] = String(source[field.key] ?? '').trim();
    });
    result.replaceFrom = String(source.replaceFrom ?? '').trim();
    result.replaceTo = String(source.replaceTo ?? '').trim();
    if (!hasOwnKey(source, 'rootClassStyles') && result.rootSelectors === ':root\nbody\n.page-wrapper') {
      result.rootSelectors = ':root\nbody';
    }
    if (result.nativeStyles) {
      result.nativeStyles = result.nativeStyles
        .split('\n')
        .map((item) => item.trim())
        .filter((item) => item && item !== 'gap' && item !== 'grid-gap')
        .join('\n');
    }
    return result;
  }

  function readBuilderRulesStorage(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return isPlainObject(parsed) ? normalizeBuilderRules(parsed) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeBuilderRulesStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(normalizeBuilderRules(value)));
    } catch {}
  }

  function readBuilderRuleDefaults() {
    const stored = readBuilderRulesStorage(RULE_DEFAULTS_KEY, null);
    if (!stored) return presetBuilderRules();
    const preset = presetBuilderRules();
    const result = {};
    BUILDER_RULE_FIELDS.forEach((field) => {
      result[field.key] = Object.prototype.hasOwnProperty.call(stored, field.key)
        ? stored[field.key]
        : preset[field.key];
    });
    result.replaceFrom = Object.prototype.hasOwnProperty.call(stored, 'replaceFrom') ? stored.replaceFrom : preset.replaceFrom;
    result.replaceTo = Object.prototype.hasOwnProperty.call(stored, 'replaceTo') ? stored.replaceTo : preset.replaceTo;
    return result;
  }

  function writeBuilderRuleDefaults(value) {
    writeBuilderRulesStorage(RULE_DEFAULTS_KEY, value);
  }

  function readBuilderRuleDraft() {
    return readBuilderRulesStorage(RULE_DRAFT_KEY, null);
  }

  function writeBuilderRuleDraft(value) {
    writeBuilderRulesStorage(RULE_DRAFT_KEY, value);
  }

  function clearBuilderRuleDraft() {
    try {
      localStorage.removeItem(RULE_DRAFT_KEY);
    } catch {}
  }

  function builderRulesHaveValue(value) {
    const rules = normalizeBuilderRules(value);
    return BUILDER_RULE_FIELDS.some((field) => !!rules[field.key]) || !!rules.replaceFrom || !!rules.replaceTo;
  }

  function effectiveBuilderRules(chatRules = readBuilderRuleDraft()) {
    const defaults = readBuilderRuleDefaults();
    const current = normalizeBuilderRules(chatRules || {});
    const result = {};
    BUILDER_RULE_FIELDS.forEach((field) => {
      result[field.key] = current[field.key] || defaults[field.key] || '';
    });
    if (current.replaceFrom || current.replaceTo) {
      result.replaceFrom = current.replaceFrom || '';
      result.replaceTo = current.replaceTo || '';
    } else {
      result.replaceFrom = defaults.replaceFrom || '';
      result.replaceTo = defaults.replaceTo || '';
    }
    return result;
  }

  function readBuilderMode() {
    try {
      return localStorage.getItem(BUILDER_MODE_KEY) === '1';
    } catch {
      return false;
    }
  }

  function writeBuilderMode(value) {
    try {
      localStorage.setItem(BUILDER_MODE_KEY, value ? '1' : '0');
    } catch {}
  }

  function uid(prefix) {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function deepCloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function pluralRu(count, one, few, many) {
    const n = Math.abs(Number(count) || 0);
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }

  function iconSvg(name) {
    if (name === 'close') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"/></svg>';
    }
    if (name === 'menu') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v2H4v-2Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z"/></svg>';
    }
    if (name === 'back') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.8 12 16 17.2 14.2 19 7 12l7.2-7 1.8 1.8L10.8 12Z"/></svg>';
    }
    if (name === 'settings') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13.5a7.7 7.7 0 0 0 .05-1.5l2-1.55-2-3.46-2.43.98a7.6 7.6 0 0 0-1.3-.75L15.35 4h-4l-.37 3.22c-.46.2-.9.45-1.3.75L7.25 6.99l-2 3.46L7.24 12a7.7 7.7 0 0 0 0 1.5l-2 1.55 2 3.46 2.43-.98c.41.3.84.55 1.3.75l.37 3.22h4l.37-3.22c.46-.2.9-.45 1.3-.75l2.43.98 2-3.46-2.04-1.55ZM13.35 15.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/></svg>';
    }
    if (name === 'rules') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v2H5V4Zm0 7h14v2H5v-2Zm0 7h8v2H5v-2Zm12.2-2.1 1.4-1.4 3.4 3.4-3.4 3.4-1.4-1.4 1-1H15v-2h3.2l-1-1Z"/></svg>';
    }
    if (name === 'chat') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 17.5 3.5 21v-4.3A7.5 7.5 0 0 1 2 12c0-4.4 4-8 9-8 1.6 0 3.1.4 4.4 1"/><path d="M8 10.7h5.2M8 14h7"/><path d="m18.5 4 .3.8c.4 1.1.6 1.6 1 2 .4.4.9.6 2 .9l.7.3-.7.3c-1.1.4-1.6.6-2 .9-.4.4-.6.9-1 2l-.3.8-.3-.8c-.4-1.1-.6-1.6-.9-2-.4-.4-.9-.6-2-.9l-.8-.3.8-.3c1.1-.4 1.6-.6 2-.9.4-.4.6-.9.9-2l.3-.8Z"/></svg>';
    }
    if (name === 'layers') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3 7.4 12 12l9-4.6L12 3Zm0 10.9L5.1 10.4 3 11.5l9 4.6 9-4.6-2.1-1.1-6.9 3.5Zm0 4.1-6.9-3.5L3 15.6l9 4.4 9-4.4-2.1-1.1L12 18Z"/></svg>';
    }
    if (name === 'changes') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h8v2H4V5Zm0 5h6v2H4v-2Zm0 5h8v2H4v-2Zm12.2-8.4 1.4-1.4L21 8.6l-3.4 3.4-1.4-1.4L17.8 9H14V7h3.8l-1.6-1.6Zm1.4 6.4 3.4 3.4-3.4 3.4-1.4-1.4 1.6-1.6H14v-2h3.8l-1.6-1.6 1.4-1.4Z"/></svg>';
    }
    if (name === 'send') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20 21 12 3 4v6.2l10 1.8-10 1.8V20Z"/></svg>';
    }
    if (name === 'link') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 14.8a4 4 0 0 1 0-5.6l2-2a4 4 0 0 1 5.9.25l-1.45 1.45a2 2 0 0 0-3.05-.3l-2 2a2 2 0 1 0 2.8 2.8l.6-.6 1.4 1.4-.6.6a4 4 0 0 1-5.6 0Zm2.7.35 5.25-5.25 1.4 1.4-5.25 5.25-1.4-1.4Zm-.95 1.4 1.45-1.45a2 2 0 0 0 3.05.3l2-2a2 2 0 1 0-2.8-2.8l-.6.6-1.4-1.4.6-.6a4 4 0 0 1 5.6 5.6l-2 2a4 4 0 0 1-5.9-.25Z"/></svg>';
    }
    if (name === 'image') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4V5Zm2 2v8.6l3.4-3.4 2.5 2.5 3.4-4.2L18 14V7H6Zm2.5 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/></svg>';
    }
    if (name === 'check') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.2 16.6 4.95 12.35 3.55 13.75 9.2 19.4 20.45 8.15 19.05 6.75 9.2 16.6Z"/></svg>';
    }
    if (name === 'undo') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7H5V3H3v8h8V9H6.7a7 7 0 1 1 1.9 7.4l-1.4 1.4A9 9 0 1 0 9 7Z"/></svg>';
    }
    if (name === 'plus') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg>';
    }
    if (name === 'trash') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-.8 11H6.8L6 9Zm4 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z"/></svg>';
    }
    if (name === 'chevron-down') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.7 9.3 5.3 5.4 5.3-5.4 1.4 1.4-6.7 6.8-6.7-6.8 1.4-1.4Z"/></svg>';
    }
    if (name === 'collapse-down') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 8.8 5.5 6.4 5.5-6.4"/></svg>';
    }
    if (name === 'eye') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5C6.5 5 2.7 9.1 1.5 12c1.2 2.9 5 7 10.5 7s9.3-4.1 10.5-7C21.3 9.1 17.5 5 12 5Zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9Zm0-2.2a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6Z"/></svg>';
    }
    if (name === 'device-desktop') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-7v2h3v2H7v-2h3v-2H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm1 2v9h16V6H4Z"/></svg>';
    }
    if (name === 'device-tablet') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm0 2v16h12V4H6Zm5 14h2v1.5h-2V18Z"/></svg>';
    }
    if (name === 'device-mobile') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm0 2v16h10V4H7Zm4 14h2v1.5h-2V18Z"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.55 3.15 2.33 4.93 5.5 5.5-3.17.57-4.95 2.35-5.5 5.5-.57-3.15-2.35-4.93-5.5-5.5 3.15-.57 4.93-2.35 5.5-5.5Zm5.6 9.1c.32 1.84 1.36 2.88 3.2 3.2-1.84.33-2.88 1.36-3.2 3.2-.33-1.84-1.36-2.87-3.2-3.2 1.84-.32 2.87-1.36 3.2-3.2ZM7.2 13.8c.25 1.43 1.06 2.24 2.5 2.5-1.44.25-2.25 1.06-2.5 2.5-.26-1.44-1.07-2.25-2.5-2.5 1.43-.26 2.24-1.07 2.5-2.5Z"/></svg>';
  }

  function stopTaptopEvents(element) {
    const stop = (event) => {
      event.stopPropagation();
    };

    [
      'click',
      'dblclick',
      'mousedown',
      'mouseup',
      'pointerdown',
      'pointerup',
      'touchstart',
      'touchend'
    ].forEach((eventName) => {
      element.addEventListener(eventName, stop);
    });
  }

  function isVisible(el) {
    if (!(el instanceof HTMLElement)) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function textForDisplay(value) {
    const source = String(value || '');
    const withBreaks = source
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6])>/gi, '\n');
    const withoutTags = withBreaks.replace(/<[^>]+>/g, '');
    const textarea = document.createElement('textarea');
    textarea.innerHTML = withoutTags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;nbsp;/g, ' ');
    return textarea.value
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function setNativeControlValue(control, value) {
    const text = String(value ?? '');
    const prototype = Object.getPrototypeOf(control);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
      || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
      || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

    if (descriptor?.set) descriptor.set.call(control, text);
    else control.value = text;

    try {
      control.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      }));
    } catch {
      control.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }
    control.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  }

  function rightPanelRoots() {
    const selectors = [
      '.tt-design-mode-right-panel',
      '.tt-right-panel',
      '.right-panel-popup',
      '[class*="right-panel"]'
    ];
    const roots = [];
    const seen = new WeakSet();
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((root) => {
        if (!(root instanceof HTMLElement) || seen.has(root) || root.closest?.('#' + PANEL_ID)) return;
        seen.add(root);
        roots.push(root);
      });
    });
    return roots;
  }

  function getTextControlScore(control) {
    let score = 0;
    const rect = control.getBoundingClientRect();
    if (rect.left > window.innerWidth * 0.55) score += 6;
    if (rect.width >= 160 && rect.height >= 28) score += 2;
    let node = control;
    for (let depth = 0; node && depth < 6; depth += 1) {
      const text = normalizeText(node.textContent).toLowerCase();
      if (/(^|\s)(текст|text)(\s|$)/i.test(text)) score += 10 - depth;
      if (/(seo|экспорт|export|ai chat|gemini)/i.test(text)) score -= 5;
      node = node.parentElement;
    }
    return score;
  }

  function findRightPanelTextControl(expectedText = '') {
    const controls = [];
    const seen = new WeakSet();
    const addControl = (control) => {
      if (!(control instanceof HTMLTextAreaElement)) return;
      if (seen.has(control) || control.closest?.('#' + PANEL_ID)) return;
      if (control.closest?.('.ace_editor, .tt-search-replace, .tt-enhancer-ai-panel')) return;
      const matchesExpected = expectedText && textsMatchForApply(control.value, expectedText);
      if (!matchesExpected && !isVisible(control)) return;
      seen.add(control);
      controls.push(control);
    };

    rightPanelRoots().forEach((root) => {
      root.querySelectorAll('textarea').forEach((control) => {
        addControl(control);
      });
    });
    document.querySelectorAll('textarea').forEach(addControl);

    if (!controls.length) return null;
    return controls
      .map((control) => ({
        control,
        score: getTextControlScore(control) + (expectedText && textsMatchForApply(control.value, expectedText) ? 100 : 0)
      }))
      .sort((a, b) => b.score - a.score)[0]?.control || controls[0];
  }

  function applyRightPanelTextValue(value, expectedText = '') {
    const control = findRightPanelTextControl(expectedText);
    if (!control) return { ok: false, error: 'Поле текста TapTop не найдено' };
    const before = control.value;
    control.focus();
    setNativeControlValue(control, value);
    try {
      control.blur();
    } catch {}
    return { ok: true, before };
  }

  function createButton() {
    const button = document.createElement('button');
    hydrateButton(button);
    return button;
  }

  function hydrateButton(button) {
    if (!(button instanceof HTMLButtonElement)) return;

    const needsMarkup = button.dataset.ttEnhancerAiVersion !== SCRIPT_VERSION
      || !button.querySelector('.tt-button__icon svg');

    if (button.id !== BUTTON_ID) button.id = BUTTON_ID;
    if (button.type !== 'button') button.type = 'button';
    button.disabled = false;
    button.removeAttribute('disabled');

    if (needsMarkup) {
      button.className = 'tt-button tt-button--appearance-large-white tt-button--color-blue tt-button--state-default tt-enhancer-ai-button';
      button.title = 'AI чат';
      button.setAttribute('aria-label', 'Открыть AI чат');
      button.innerHTML = '<span class="tt-button__icon tt-button__icon--size-large">' + iconSvg('chat') + '</span>';
      button.dataset.ttEnhancerAiVersion = SCRIPT_VERSION;
    } else {
      button.classList.add('tt-enhancer-ai-button');
    }

    if (button.dataset.ttEnhancerAiStopBound !== '1') {
      stopTaptopEvents(button);
      button.dataset.ttEnhancerAiStopBound = '1';
    }

    bindButtonEvents(button);
  }

  function bindButtonEvents(button) {
    if (!(button instanceof HTMLButtonElement)) return;
    if (button.dataset.ttEnhancerAiClickBound === SCRIPT_VERSION) return;

    button.dataset.ttEnhancerAiClickBound = SCRIPT_VERSION;
    button.addEventListener('pointerup', (event) => {
      requestButtonToggle(event, 'pointerup');
    }, true);

    button.addEventListener('click', (event) => {
      requestButtonToggle(event, 'click');
    }, true);

    button.addEventListener('keydown', (event) => {
      requestButtonToggle(event, 'keydown');
    }, true);
  }

  function isButtonEventTarget(target) {
    return !!target?.closest?.('#' + BUTTON_ID);
  }

  function isPrimaryButtonEvent(event) {
    if (!event) return true;
    if (event.type === 'keydown') return event.key === 'Enter' || event.key === ' ';
    if (event.button !== undefined && event.button !== 0) return false;
    if (event.isPrimary === false) return false;
    return true;
  }

  function stopButtonEvent(event) {
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    event?.stopPropagation?.();
  }

  function requestButtonToggle(event, source) {
    if (state.isDestroyed || !isButtonEventTarget(event?.target) || !isPrimaryButtonEvent(event)) return;
    if (event.type === 'keydown' && event.repeat) {
      stopButtonEvent(event);
      return;
    }
    if (event.__ttEnhancerAiButtonHandled) return;
    event.__ttEnhancerAiButtonHandled = true;
    stopButtonEvent(event);

    const now = Date.now();
    if (source === 'click' && now - state.lastButtonPointerToggleAt < BUTTON_TOGGLE_GUARD_MS) return;

    state.lastButtonToggleAt = now;
    if (source === 'pointerup') state.lastButtonPointerToggleAt = now;
    setOpen(!state.isOpen);
  }

  function handleGlobalButtonPointerUp(event) {
    requestButtonToggle(event, 'pointerup');
  }

  function handleGlobalButtonClick(event) {
    requestButtonToggle(event, 'click');
  }

  function handleGlobalButtonKeydown(event) {
    requestButtonToggle(event, 'keydown');
  }

  function bindGlobalButtonEvents() {
    if (state.buttonGlobalEventsBound || !document?.addEventListener) return;
    document.addEventListener('pointerup', handleGlobalButtonPointerUp, true);
    document.addEventListener('click', handleGlobalButtonClick, true);
    document.addEventListener('keydown', handleGlobalButtonKeydown, true);
    state.buttonGlobalEventsBound = true;
  }

  function unbindGlobalButtonEvents() {
    if (!state.buttonGlobalEventsBound || !document?.removeEventListener) return;
    document.removeEventListener('pointerup', handleGlobalButtonPointerUp, true);
    document.removeEventListener('click', handleGlobalButtonClick, true);
    document.removeEventListener('keydown', handleGlobalButtonKeydown, true);
    state.buttonGlobalEventsBound = false;
  }

  function handleGlobalMenuOutsidePointerDown(event) {
    const panel = state.panel || document.getElementById(PANEL_ID);
    if (!isMenuOpen(panel)) return;
    const target = event.target;
    if (target?.closest?.('#' + PANEL_ID + ' [data-role="main-menu"]')) return;
    if (target?.closest?.('#' + PANEL_ID + ' [data-action="toggle-menu"]')) return;
    setMenuOpen(false, panel);
  }

  function bindGlobalMenuEvents() {
    if (state.menuOutsideEventsBound || !document?.addEventListener) return;
    document.addEventListener('pointerdown', handleGlobalMenuOutsidePointerDown, true);
    state.menuOutsideEventsBound = true;
  }

  function unbindGlobalMenuEvents() {
    if (!state.menuOutsideEventsBound || !document?.removeEventListener) return;
    document.removeEventListener('pointerdown', handleGlobalMenuOutsidePointerDown, true);
    state.menuOutsideEventsBound = false;
  }

  function createRailButton() {
    const button = document.createElement('button');
    hydrateRailButton(button);
    return button;
  }

  function hydrateRailButton(button) {
    if (!(button instanceof HTMLButtonElement)) return;
    const needsMarkup = button.dataset.ttEnhancerAiVersion !== SCRIPT_VERSION
      || !button.querySelector('.tt-enhancer-ai-rail-button__label');

    if (button.id !== RAIL_BUTTON_ID) button.id = RAIL_BUTTON_ID;
    if (button.type !== 'button') button.type = 'button';
    button.disabled = false;
    button.removeAttribute('disabled');

    if (needsMarkup) {
      button.className = 'tt-enhancer-ai-rail-button';
      button.title = 'Развернуть AI чат';
      button.setAttribute('aria-label', 'Развернуть AI чат');
      button.innerHTML = [
        '<span class="tt-enhancer-ai-rail-button__title">',
        '  <span class="tt-enhancer-ai-rail-button__menu" aria-hidden="true">' + iconSvg('menu') + '</span>',
        '  <span class="tt-enhancer-ai-rail-button__label">AI чат</span>',
        '</span>',
        '<span class="tt-enhancer-ai-rail-button__expand" aria-hidden="true">' + iconSvg('collapse-down') + '</span>'
      ].join('');
      button.dataset.ttEnhancerAiVersion = SCRIPT_VERSION;
    } else {
      button.classList.add('tt-enhancer-ai-rail-button');
    }

    if (button.dataset.ttEnhancerAiStopBound !== '1') {
      stopTaptopEvents(button);
      button.dataset.ttEnhancerAiStopBound = '1';
    }

    if (button.dataset.ttEnhancerAiClickBound !== SCRIPT_VERSION) {
      button.dataset.ttEnhancerAiClickBound = SCRIPT_VERSION;
      button.addEventListener('click', (event) => {
        stopButtonEvent(event);
        if (!state.isOpen) setOpen(true);
        setRailCollapsed(false);
      }, true);
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        stopButtonEvent(event);
        if (!state.isOpen) setOpen(true);
        setRailCollapsed(false);
      }, true);
    }
  }

  function ensureRailButton(options = {}) {
    let button = document.getElementById(RAIL_BUTTON_ID) || state.railButton;
    if (button && !(button instanceof HTMLButtonElement)) {
      button.remove?.();
      button = null;
    }
    if (!button) button = createRailButton();
    else hydrateRailButton(button);

    const center = document.querySelector('.tt-app__center');
    if (center) {
      center.classList.add('tt-enhancer-ai-canvas-host');
      button.classList.remove('is-floating');
      button.classList.add('is-canvas');
      if (!center.contains(button)) center.appendChild(button);
    } else if (document.body) {
      button.classList.remove('is-canvas');
      button.classList.add('is-floating');
      if (!document.body.contains(button)) document.body.appendChild(button);
    } else {
      return null;
    }

    state.railButton = button;
    syncRailButtonVisibility(button, options.forceVisible);
    return button;
  }

  function syncRailButtonVisibility(button = state.railButton, forceVisible = false) {
    if (!button) return;
    const visible = !!forceVisible || (!!state.isOpen && !!state.isRailCollapsed);
    button.hidden = !visible;
    button.classList.toggle('is-visible', visible);
    button.setAttribute('aria-hidden', visible ? 'false' : 'true');
    button.tabIndex = visible ? 0 : -1;
  }

  function fallbackRailButtonRect() {
    const width = clampNumber(window.innerWidth * 0.36, 240, 320);
    const height = 46;
    return {
      left: Math.max(PANEL_VIEWPORT_MARGIN, window.innerWidth - width - 72),
      top: Math.max(PANEL_TOP_OFFSET, window.innerHeight - height - PANEL_VIEWPORT_MARGIN),
      width,
      height
    };
  }

  function railButtonRect() {
    const button = ensureRailButton({ forceVisible: true });
    const rect = button?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) return fallbackRailButtonRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    return {
      left: clampNumber(rect.left, PANEL_VIEWPORT_MARGIN, Math.max(PANEL_VIEWPORT_MARGIN, window.innerWidth - width - PANEL_VIEWPORT_MARGIN)),
      top: clampNumber(rect.top, PANEL_TOP_OFFSET, Math.max(PANEL_TOP_OFFSET, window.innerHeight - height - PANEL_VIEWPORT_MARGIN)),
      width,
      height
    };
  }

  function createProviderSelect() {
    const select = document.createElement('select');
    select.className = 'tt-enhancer-ai-panel__provider';
    select.dataset.role = 'provider';
    select.setAttribute('aria-label', 'Провайдер AI');
    PROVIDER_OPTIONS.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      select.appendChild(option);
    });
    return select;
  }

  function createModelSelect(className) {
    const combobox = document.createElement('div');
    combobox.className = 'tt-enhancer-ai-model-combobox';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = className;
    input.dataset.role = 'model';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', 'Модель AI');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-haspopup', 'listbox');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tt-enhancer-ai-model-combobox__toggle';
    button.dataset.action = 'toggle-model-options';
    button.setAttribute('aria-label', 'Показать модели');
    button.innerHTML = iconSvg('chevron-down');

    const menu = document.createElement('div');
    menu.className = 'tt-enhancer-ai-model-combobox__menu';
    menu.dataset.role = 'model-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;

    combobox.append(input, button, menu);
    setModelSelectOptions(input, DEFAULT_PROVIDER, defaultModelForProvider(DEFAULT_PROVIDER, MODEL_MODES.text), MODEL_MODES.text);
    return combobox;
  }

  function replaceRuleRowsFromRules(rules = {}) {
    const values = normalizeBuilderRules(rules);
    const fromLines = splitBuilderRuleRows(values.replaceFrom);
    const toLines = splitBuilderRuleRows(values.replaceTo);
    const count = Math.max(1, fromLines.length, toLines.length);
    return Array.from({ length: count }, (_, index) => ({
      from: fromLines[index] || '',
      to: toLines[index] || ''
    }));
  }

  function replaceRuleRowMarkup(scope, row = {}, index = 0) {
    const safeScope = escapeHtml(scope);
    const isFirstRow = index === 0;
    const actionName = isFirstRow ? 'add-replace-rule' : 'remove-replace-rule';
    const actionIcon = isFirstRow ? 'plus' : 'trash';
    const actionTitle = isFirstRow ? 'Добавить замену' : 'Удалить замену';
    return [
      '<div class="tt-enhancer-ai-panel__replace-row" data-rule-replace-row>',
      '  <label class="tt-enhancer-ai-panel__replace-field">',
      '    <span>Что заменить</span>',
      '    <input type="text" data-rule-scope="' + safeScope + '" data-rule-field="replaceFrom" spellcheck="false" placeholder=".container" value="' + escapeHtml(row.from || '') + '">',
      '    <small data-rule-replace-error="replaceFrom"></small>',
      '  </label>',
      '  <label class="tt-enhancer-ai-panel__replace-field">',
      '    <span>На что заменить</span>',
      '    <input type="text" data-rule-scope="' + safeScope + '" data-rule-field="replaceTo" spellcheck="false" placeholder=".t-container" value="' + escapeHtml(row.to || '') + '">',
      '    <small data-rule-replace-error="replaceTo"></small>',
      '  </label>',
      '  <button type="button" class="tt-enhancer-ai-panel__replace-action" data-action="' + actionName + '" data-rule-scope="' + safeScope + '" title="' + actionTitle + '" aria-label="' + actionTitle + '">' + iconSvg(actionIcon) + '</button>',
      '</div>'
    ].join('');
  }

  function builderReplaceRulesMarkup(scope) {
    return [
      '<div class="tt-enhancer-ai-panel__replace-group" data-rule-replace-scope="' + escapeHtml(scope) + '">',
      '  <div class="tt-enhancer-ai-panel__replace-heading">Заменить</div>',
      '  <div class="tt-enhancer-ai-panel__replace-list" data-rule-replace-list="' + escapeHtml(scope) + '">',
      replaceRuleRowMarkup(scope),
      '  </div>',
      '</div>'
    ].join('');
  }

  function builderRulesFormMarkup(scope) {
    const rows = BUILDER_RULE_FIELDS.map((field) => {
      const title = escapeHtml(field.description || '');
      return [
        field.sectionLabel
          ? '<div class="tt-enhancer-ai-panel__rule-heading tt-enhancer-ai-panel__rule-heading--section">' + escapeHtml(field.sectionLabel) + '</div>'
          : '',
        field.key === 'rootClassStyles' ? builderReplaceRulesMarkup(scope) : '',
        '<label class="tt-enhancer-ai-panel__rule-field">',
        '  <span class="tt-enhancer-ai-panel__rule-label">',
        '    <span>' + escapeHtml(field.label) + '</span>',
        '    <span class="tt-enhancer-ai-panel__help" tabindex="0" aria-label="' + title + '" data-tooltip="' + title + '">?</span>',
        '  </span>',
        '  <textarea data-rule-scope="' + escapeHtml(scope) + '" data-rule-field="' + escapeHtml(field.key) + '" rows="3" spellcheck="false" placeholder="' + escapeHtml(field.placeholder || '') + '"></textarea>',
        '</label>'
      ].join('');
    }).join('');

    return '<div class="tt-enhancer-ai-panel__rules-list">' + rows + '</div>';
  }

  function buildSubmitSplitMarkup() {
    return [
      '<span class="tt-enhancer-ai-panel__build-split">',
      '  <button type="button" class="tt-enhancer-ai-panel__primary tt-enhancer-ai-panel__build-main" data-action="build-from-code">' + iconSvg('layers') + '<span>Сверстай по коду</span></button>',
      '  <button type="button" class="tt-enhancer-ai-panel__primary tt-enhancer-ai-panel__build-toggle" data-action="toggle-build-menu" aria-label="Дополнительные действия" aria-expanded="false">' + iconSvg('chevron-down') + '</button>',
      '  <span class="tt-enhancer-ai-panel__build-menu" data-role="build-menu" hidden>',
      '    <button type="button" data-action="create-widget">Создай виджет</button>',
      '  </span>',
      '</span>'
    ].join('');
  }

  function createPanel() {
    const panel = document.createElement('aside');
    panel.id = PANEL_ID;
    panel.className = 'tt-enhancer-ai-panel';
    panel.dataset.ttEnhancerAiVersion = SCRIPT_VERSION;
    panel.setAttribute('aria-label', 'AI чат');
    stopTaptopEvents(panel);

    panel.innerHTML = [
      '<div class="tt-enhancer-ai-panel__resize-handle tt-enhancer-ai-panel__resize-handle--left" data-resize-handle="left" aria-hidden="true"></div>',
      '<div class="tt-enhancer-ai-panel__resize-handle tt-enhancer-ai-panel__resize-handle--right" data-resize-handle="right" aria-hidden="true"></div>',
      '<div class="tt-enhancer-ai-panel__resize-handle tt-enhancer-ai-panel__resize-handle--bottom" data-resize-handle="bottom" aria-hidden="true"></div>',
      '<div class="tt-enhancer-ai-panel__resize-handle tt-enhancer-ai-panel__resize-handle--bottom-left" data-resize-handle="bottom-left" aria-hidden="true"></div>',
      '<div class="tt-enhancer-ai-panel__resize-handle tt-enhancer-ai-panel__resize-handle--bottom-right" data-resize-handle="bottom-right" aria-hidden="true"></div>',
      '<div class="tt-enhancer-ai-panel__bar">',
      '  <button type="button" class="tt-enhancer-ai-panel__action tt-enhancer-ai-panel__menu-button" data-action="toggle-menu" title="Меню" aria-label="Меню">' + iconSvg('menu') + '</button>',
      '  <div class="tt-enhancer-ai-panel__title"><span>AI чат</span></div>',
      '  <div class="tt-enhancer-ai-panel__actions">',
      '    <button type="button" class="tt-enhancer-ai-panel__action tt-enhancer-ai-panel__collapse" data-action="collapse-rail" title="Свернуть вниз" aria-label="Свернуть AI чат вниз" aria-pressed="false">' + iconSvg('collapse-down') + '</button>',
      '  </div>',
      '</div>',
      '<div class="tt-enhancer-ai-panel__menu" data-role="main-menu" hidden>',
      '  <div class="tt-enhancer-ai-panel__menu-history">',
      '    <div class="tt-enhancer-ai-panel__menu-title">История чатов</div>',
      '    <button type="button" class="tt-enhancer-ai-panel__menu-chat is-active"><span>Текущий чат</span><small>AI правки слоя</small></button>',
      '    <button type="button" class="tt-enhancer-ai-panel__menu-chat"><span>Верстка по коду</span><small>swiper / карточки</small></button>',
      '    <button type="button" class="tt-enhancer-ai-panel__menu-chat"><span>Тексты секции</span><small>перевод и рерайт</small></button>',
      '  </div>',
      '  <div class="tt-enhancer-ai-panel__menu-bottom">',
      '    <button type="button" class="tt-enhancer-ai-panel__menu-item" data-action="menu-rules">' + iconSvg('rules') + '<span>Правила</span></button>',
      '    <button type="button" class="tt-enhancer-ai-panel__menu-item" data-action="menu-settings">' + iconSvg('settings') + '<span>Настройки</span></button>',
      '  </div>',
      '</div>',
      '<section class="tt-enhancer-ai-panel__settings-view" data-role="settings" hidden>',
      '  <div class="tt-enhancer-ai-panel__settings-head">',
      '    <button type="button" class="tt-enhancer-ai-panel__action" data-action="back-to-chat" title="Назад" aria-label="Назад">' + iconSvg('back') + '</button>',
      '    <div class="tt-enhancer-ai-panel__settings-title">Настройки</div>',
      '  </div>',
      '  <div class="tt-enhancer-ai-panel__settings-content">',
      '  <label class="tt-enhancer-ai-panel__field">',
      '    <span>Провайдер</span>',
      '    <span data-role="settings-provider-host"></span>',
      '  </label>',
      '  <label class="tt-enhancer-ai-panel__field">',
      '    <span data-role="api-key-label">Ключ Gemini API</span>',
      '    <input type="password" data-role="api-key" autocomplete="off" placeholder="AIza...">',
      '  </label>',
      '  <label class="tt-enhancer-ai-panel__field" data-role="base-url-field" hidden>',
      '    <span>Base URL</span>',
      '    <input type="text" data-role="base-url" autocomplete="off" spellcheck="false" placeholder="http://localhost:8081/v1">',
      '  </label>',
      '  <label class="tt-enhancer-ai-panel__field">',
      '    <span>Модель</span>',
      '    <span data-role="settings-model-host"></span>',
      '  </label>',
      '  <label class="tt-enhancer-ai-panel__field" data-role="custom-model-field">',
      '    <span>Своя модель</span>',
      '    <span class="tt-enhancer-ai-panel__custom-model-row">',
      '      <input type="text" data-role="custom-model" autocomplete="off" placeholder="provider/model-id">',
      '      <button type="button" class="tt-enhancer-ai-panel__secondary" data-action="add-custom-model"><span>Добавить</span></button>',
      '    </span>',
      '  </label>',
      '  <div class="tt-enhancer-ai-panel__settings-row">',
      '    <button type="button" class="tt-enhancer-ai-panel__secondary" data-action="clear-key">' + iconSvg('trash') + '<span>Сбросить ключ</span></button>',
      '    <button type="button" class="tt-enhancer-ai-panel__primary" data-action="save-settings">' + iconSvg('check') + '<span>Сохранить</span></button>',
      '  </div>',
      '  <div class="tt-enhancer-ai-panel__settings-note" data-role="settings-note"></div>',
      '  </div>',
      '</section>',
      '<section class="tt-enhancer-ai-panel__settings-view tt-enhancer-ai-panel__rules-view" data-role="rules-settings" hidden>',
      '  <div class="tt-enhancer-ai-panel__settings-head">',
      '    <button type="button" class="tt-enhancer-ai-panel__action" data-action="back-to-chat" title="Назад" aria-label="Назад">' + iconSvg('back') + '</button>',
      '    <div class="tt-enhancer-ai-panel__settings-title">Правила</div>',
      '  </div>',
      '  <div class="tt-enhancer-ai-panel__settings-content">',
      builderRulesFormMarkup('defaults'),
      '  <div class="tt-enhancer-ai-panel__settings-row">',
      '    <button type="button" class="tt-enhancer-ai-panel__secondary" data-action="reset-rule-defaults">' + iconSvg('undo') + '<span>Пресеты</span></button>',
      '    <button type="button" class="tt-enhancer-ai-panel__primary" data-action="save-rule-defaults">' + iconSvg('check') + '<span>Сохранить</span></button>',
      '  </div>',
      '  <div class="tt-enhancer-ai-panel__settings-note" data-role="rules-settings-note"></div>',
      '  </div>',
      '</section>',
      '<div class="tt-enhancer-ai-panel__messages" data-role="messages">',
      '  <div class="tt-enhancer-ai-panel__empty" data-role="empty">Выберите слой и опишите правку.</div>',
      '</div>',
      '<form class="tt-enhancer-ai-panel__composer" data-role="composer">',
      '  <div class="tt-enhancer-ai-panel__model-row" data-role="composer-model-host"></div>',
      '  <div class="tt-enhancer-ai-panel__layer" data-role="layer-chip"></div>',
      '  <div class="tt-enhancer-ai-panel__quick" data-role="quick-actions"></div>',
      '  <label class="tt-enhancer-ai-panel__mode-toggle">',
      '    <input type="checkbox" data-role="builder-mode">',
      '    <span>Конструктор</span>',
      '    <small>верстка слоями</small>',
      '  </label>',
      '  <details class="tt-enhancer-ai-panel__code" data-role="code-box">',
      '    <summary class="tt-enhancer-ai-panel__code-summary">',
      '      <span>Код</span>',
      '      <small data-role="code-status">пусто</small>',
      '    </summary>',
      '    <div class="tt-enhancer-ai-panel__code-body">',
      '      <div class="tt-enhancer-ai-panel__code-tabs" role="tablist" aria-label="Код конструктора">',
      '        <button type="button" class="tt-enhancer-ai-panel__code-tab is-active" data-action="code-tab" data-code-tab="source" role="tab" aria-selected="true">Верстка</button>',
      '        <button type="button" class="tt-enhancer-ai-panel__code-tab" data-action="code-tab" data-code-tab="styles" role="tab" aria-selected="false">Стили</button>',
      '        <button type="button" class="tt-enhancer-ai-panel__code-tab" data-action="code-tab" data-code-tab="script" role="tab" aria-selected="false">Скрипт</button>',
      '        <button type="button" class="tt-enhancer-ai-panel__code-tab" data-action="code-tab" data-code-tab="rules" role="tab" aria-selected="false">Правила</button>',
      '      </div>',
      '      <div class="tt-enhancer-ai-panel__code-panel" data-code-panel="source">',
      '      <textarea data-role="code-input" rows="8" spellcheck="false" placeholder="HTML для конвертации в слои"></textarea>',
      '      <div class="tt-enhancer-ai-panel__ace" data-role="code-editor" data-editor-for="code-input"></div>',
      '      <div class="tt-enhancer-ai-panel__code-actions">',
      '        <button type="button" class="tt-enhancer-ai-panel__secondary" data-action="clear-code">' + iconSvg('trash') + '<span>Очистить</span></button>',
      buildSubmitSplitMarkup(),
      '      </div>',
      '      </div>',
      '      <div class="tt-enhancer-ai-panel__code-panel" data-code-panel="styles" hidden>',
      '      <textarea data-role="style-input" rows="8" spellcheck="false" placeholder="CSS без тега <style>"></textarea>',
      '      <div class="tt-enhancer-ai-panel__ace" data-role="code-editor" data-editor-for="style-input"></div>',
      '      <div class="tt-enhancer-ai-panel__code-actions">',
      '        <button type="button" class="tt-enhancer-ai-panel__secondary" data-action="clear-styles">' + iconSvg('trash') + '<span>Очистить</span></button>',
      buildSubmitSplitMarkup(),
      '      </div>',
      '      </div>',
      '      <div class="tt-enhancer-ai-panel__code-panel" data-code-panel="script" hidden>',
      '      <textarea data-role="script-input" rows="8" spellcheck="false" placeholder="JS / внешние подключения, которые нужно положить в Embed"></textarea>',
      '      <div class="tt-enhancer-ai-panel__ace" data-role="code-editor" data-editor-for="script-input"></div>',
      '      <div class="tt-enhancer-ai-panel__code-actions">',
      '        <button type="button" class="tt-enhancer-ai-panel__secondary" data-action="clear-script">' + iconSvg('trash') + '<span>Очистить</span></button>',
      buildSubmitSplitMarkup(),
      '      </div>',
      '      </div>',
      '      <div class="tt-enhancer-ai-panel__code-panel" data-code-panel="rules" hidden>',
      builderRulesFormMarkup('chat'),
      '      <div class="tt-enhancer-ai-panel__code-actions">',
      '        <button type="button" class="tt-enhancer-ai-panel__secondary" data-action="reset-chat-rules">' + iconSvg('undo') + '<span>Сбросить</span></button>',
      '      </div>',
      '      </div>',
      '    </div>',
      '  </details>',
      '  <div class="tt-enhancer-ai-panel__image-draft" data-role="builder-image-chip" hidden>',
      '    <div class="tt-enhancer-ai-panel__image-draft-preview" data-role="builder-image-preview"></div>',
      '    <div class="tt-enhancer-ai-panel__image-draft-text">',
      '      <span data-role="builder-image-name">Изображение</span>',
      '      <small data-role="builder-image-meta"></small>',
      '    </div>',
      '    <button type="button" class="tt-enhancer-ai-panel__action tt-enhancer-ai-panel__image-draft-clear" data-action="clear-builder-image" title="Убрать изображение" aria-label="Убрать изображение">' + iconSvg('close') + '</button>',
      '  </div>',
      '  <textarea data-role="prompt" rows="4" placeholder="Опиши, что изменить в выбранном слое..."></textarea>',
      '  <div class="tt-enhancer-ai-panel__composer-row">',
      '    <span class="tt-enhancer-ai-panel__composer-left">',
      '      <button type="button" class="tt-enhancer-ai-panel__secondary" data-action="link-layer">' + iconSvg('link') + '<span>Связать слой</span></button>',
      '      <button type="button" class="tt-enhancer-ai-panel__secondary tt-enhancer-ai-panel__image-upload" data-action="upload-builder-image" title="Загрузить изображение">' + iconSvg('image') + '<span>Изображение</span></button>',
      '      <input type="file" data-role="builder-image-input" accept="image/*" hidden>',
      '    </span>',
      '    <span class="tt-enhancer-ai-panel__composer-submit">',
      '      <button type="button" class="tt-enhancer-ai-panel__primary tt-enhancer-ai-panel__image-build" data-action="build-from-image" disabled>' + iconSvg('image') + '<span>Сверстай по картинке</span></button>',
      '      <button type="submit" class="tt-enhancer-ai-panel__send"><span>Отправить</span></button>',
      '    </span>',
      '  </div>',
      '</form>'
    ].join('');

    const composerModelHost = panel.querySelector('[data-role="composer-model-host"]');
    const settingsProviderHost = panel.querySelector('[data-role="settings-provider-host"]');
    const settingsModelHost = panel.querySelector('[data-role="settings-model-host"]');
    settingsProviderHost.appendChild(createProviderSelect());
    composerModelHost.appendChild(createModelSelect('tt-enhancer-ai-panel__model'));
    settingsModelHost.appendChild(createModelSelect('tt-enhancer-ai-panel__settings-model'));

    renderQuickActions(panel, null);

    bindPanelEvents(panel);
    return panel;
  }

  function bindPanelEvents(panel) {
    if (panel?.dataset?.ttEnhancerAiEventsBound === SCRIPT_VERSION) return;
    panel.dataset.ttEnhancerAiEventsBound = SCRIPT_VERSION;

    panel.querySelector('.tt-enhancer-ai-panel__bar')?.addEventListener('pointerdown', startPanelDrag);
    panel.querySelectorAll('.tt-enhancer-ai-panel__settings-head').forEach((head) => {
      head.addEventListener('pointerdown', startPanelDrag);
    });
    panel.querySelectorAll('[data-resize-handle]').forEach((handle) => {
      handle.addEventListener('pointerdown', startPanelResize);
    });
    panel.addEventListener('click', handlePanelActionClick);
    panel.querySelector('[data-action="toggle-menu"]')?.addEventListener('pointerdown', (event) => {
      requestMenuButtonToggle(event, panel, 'pointerdown');
    }, true);
    panel.querySelector('[data-action="toggle-menu"]')?.addEventListener('keydown', (event) => {
      requestMenuButtonToggle(event, panel, 'keydown');
    }, true);
    panel.querySelectorAll('[data-action="back-to-chat"]').forEach((button) => button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closePanelSubViews(panel);
    }));
    panel.addEventListener('pointerdown', (event) => {
      if (event.target?.closest?.('.tt-enhancer-ai-panel__build-split')) return;
      closeBuildMenus(panel);
    });

    panel.querySelector('[data-action="save-settings"]')?.addEventListener('click', saveSettingsFromPanel);
    panel.querySelector('[data-action="clear-key"]')?.addEventListener('click', clearApiKey);
    panel.querySelector('[data-action="add-custom-model"]')?.addEventListener('click', addCustomModelFromPanel);
    panel.querySelector('[data-action="link-layer"]')?.addEventListener('click', () => {
      refreshSelectedContextSafe({ force: true, announce: true });
      scheduleSelectionWarmup();
    });
    panel.querySelector('[data-role="builder-image-input"]')?.addEventListener('change', handleBuilderImageInputChange);
    panel.querySelector('[data-role="code-box"]')?.addEventListener('toggle', () => {
      scheduleCodeEditorsInit(panel);
      scheduleCodeBoxResize(panel);
    });

    panel.querySelector('[data-role="composer"]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      sendPrompt();
    });

    const promptInput = panel.querySelector('[data-role="prompt"]');
    if (promptInput) {
      promptInput.value = readDraft();
      promptInput.addEventListener('input', () => writeDraft(promptInput.value));
    }
    const codeInput = panel.querySelector('[data-role="code-input"]');
    if (codeInput) {
      codeInput.value = readCodeDraft();
      codeInput.addEventListener('input', () => {
        writeCodeDraft(codeInput.value);
        updateCodeStatus(panel);
        scheduleCodeBoxResize(panel);
      });
      updateCodeStatus(panel);
    }
    const styleInput = panel.querySelector('[data-role="style-input"]');
    if (styleInput) {
      styleInput.value = readStyleDraft();
      styleInput.addEventListener('input', () => {
        writeStyleDraft(styleInput.value);
        updateCodeStatus(panel);
        scheduleCodeBoxResize(panel);
      });
      updateCodeStatus(panel);
    }
    const scriptInput = panel.querySelector('[data-role="script-input"]');
    if (scriptInput) {
      scriptInput.value = readScriptDraft();
      scriptInput.addEventListener('input', () => {
        writeScriptDraft(scriptInput.value);
        updateCodeStatus(panel);
        scheduleCodeBoxResize(panel);
      });
      updateCodeStatus(panel);
    }
    syncRuleInputs(panel, 'chat', readBuilderRuleDraft() || readBuilderRuleDefaults());
    syncRuleInputs(panel, 'defaults', readBuilderRuleDefaults());
    scheduleCodeEditorsInit(panel);
    updateBuilderImageUi(panel);
    panel.addEventListener('input', handleRuleInput);
    const builderModeInput = panel.querySelector('[data-role="builder-mode"]');
    if (builderModeInput) {
      builderModeInput.checked = !!state.isBuilderMode;
      builderModeInput.addEventListener('change', () => setBuilderMode(builderModeInput.checked));
    }

    panel.querySelector('[data-role="custom-model"]')?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      addCustomModelFromPanel();
    });

    panel.querySelector('[data-role="base-url"]')?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      saveSettingsFromPanel();
    });

    promptInput?.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        sendPrompt();
      }
    });

    panel.querySelector('[data-role="provider"]')?.addEventListener('change', (event) => {
      const provider = normalizeProvider(event.target?.value);
      const mode = currentModelMode();
      state.settings.provider = provider;
      state.settings.model = getProviderModel(provider, mode);
      syncSettingsUi();
      loadProviderModelOptions(provider);
      saveProvider(provider, mode);
    });

    bindModelControls(panel);

    panel.querySelector('[data-role="quick-actions"]')?.addEventListener('click', (event) => {
      const button = event.target?.closest?.('.tt-enhancer-ai-panel__quick-button');
      if (!button) return;
      if (button.dataset.codeAction === '1') {
        sendCodePrompt(button.dataset.prompt || button.title || 'Сверстай по коду');
        return;
      }
      refreshSelectedContextSafe({ force: true });
      sendPrompt(button.dataset.prompt || button.title || '');
    });

    panel.querySelector('[data-role="messages"]')?.addEventListener('click', (event) => {
      const applyButton = event.target?.closest?.('[data-action="apply-changes"]');
      const undoButton = event.target?.closest?.('[data-action="undo-changes"]');
      const viewButton = event.target?.closest?.('[data-action="view-html"]');
      if (viewButton) {
        event.preventDefault();
        openHtmlPreviewModal(viewButton.dataset.changeSetId);
        return;
      }
      if (applyButton) {
        event.preventDefault();
        applyChangeSet(applyButton.dataset.changeSetId);
        return;
      }
      if (undoButton) {
        event.preventDefault();
        undoChangeSet(undoButton.dataset.changeSetId);
      }
    });
  }

  function requestMenuButtonToggle(event, panel = state.panel, source = 'click') {
    if (!panel || !isPrimaryButtonEvent(event)) return;
    if (event?.type === 'keydown' && event.repeat) {
      stopButtonEvent(event);
      return;
    }
    if (event?.type === 'click' && Date.now() - state.lastMenuButtonPointerAt < MENU_BUTTON_CLICK_GUARD_MS) {
      stopButtonEvent(event);
      return;
    }

    stopButtonEvent(event);
    if (source === 'pointerdown') state.lastMenuButtonPointerAt = Date.now();
    state.panel = panel;
    setMenuOpen(!isMenuOpen(panel), panel);
  }

  function handlePanelActionClick(event) {
    const action = event.target?.closest?.('[data-action]');
    const panel = action?.closest?.('#' + PANEL_ID) || null;
    if (!action || !panel) return;
    state.panel = panel;

    const name = action.dataset.action;
    if (name === 'toggle-menu') {
      requestMenuButtonToggle(event, panel, 'click');
      return;
    }
    if (name === 'menu-settings') {
      event.preventDefault();
      openSettingsView(panel);
      return;
    }
    if (name === 'menu-rules') {
      event.preventDefault();
      openRulesView(panel);
      return;
    }
    if (name === 'back-to-chat') {
      event.preventDefault();
      closePanelSubViews(panel);
      return;
    }
    if (name === 'code-tab') {
      event.preventDefault();
      setCodeTab(action.dataset.codeTab || 'source', panel);
      return;
    }
    if (name === 'add-replace-rule') {
      event.preventDefault();
      addReplaceRuleRow(panel, action.dataset.ruleScope || 'chat');
      return;
    }
    if (name === 'remove-replace-rule') {
      event.preventDefault();
      removeReplaceRuleRow(action, panel, action.dataset.ruleScope || 'chat');
      return;
    }
    if (name === 'toggle-build-menu') {
      event.preventDefault();
      toggleBuildMenu(action, panel);
      return;
    }
    if (name === 'create-widget') {
      event.preventDefault();
      closeBuildMenus(panel);
      return;
    }
    if (name === 'build-from-code') {
      event.preventDefault();
      closeBuildMenus(panel);
      sendCodePrompt('Сверстай по коду');
      return;
    }
    if (name === 'upload-builder-image') {
      event.preventDefault();
      panel.querySelector('[data-role="builder-image-input"]')?.click();
      return;
    }
    if (name === 'clear-builder-image') {
      event.preventDefault();
      clearBuilderImage(panel);
      return;
    }
    if (name === 'build-from-image') {
      event.preventDefault();
      sendImageCodePrompt();
      return;
    }
    if (name === 'clear-code') {
      event.preventDefault();
      const input = codeInputElement(panel);
      if (!input) return;
      setCodeFieldValue(input, '');
      writeCodeDraft('');
      updateCodeStatus(panel);
      focusCodeInput(panel);
      return;
    }
    if (name === 'clear-styles') {
      event.preventDefault();
      const input = styleInputElement(panel);
      if (!input) return;
      setCodeFieldValue(input, '');
      writeStyleDraft('');
      updateCodeStatus(panel);
      setCodeTab('styles', panel);
      focusCodeField(input);
      return;
    }
    if (name === 'clear-script') {
      event.preventDefault();
      const input = scriptInputElement(panel);
      if (!input) return;
      setCodeFieldValue(input, '');
      writeScriptDraft('');
      updateCodeStatus(panel);
      setCodeTab('script', panel);
      focusCodeField(input);
      return;
    }
    if (name === 'reset-chat-rules') {
      event.preventDefault();
      resetChatRules(panel);
      return;
    }
    if (name === 'save-rule-defaults') {
      event.preventDefault();
      saveRuleDefaultsFromPanel(panel);
      return;
    }
    if (name === 'reset-rule-defaults') {
      event.preventDefault();
      resetRuleDefaults(panel);
      return;
    }
    if (name === 'collapse-rail') {
      event.preventDefault();
      setRailCollapsed(!state.isRailCollapsed);
      return;
    }
    if (name === 'close') {
      event.preventDefault();
      setOpen(false);
    }
  }

  function selectModelFromInput(input, value, shouldSave = true) {
    const control = getModelInput(input);
    if (!control) return;
    const provider = normalizeProvider(control.dataset.provider || state.settings.provider);
    const mode = normalizeModelMode(control.dataset.mode || currentModelMode());
    const model = normalizeModelForMode(provider, value, mode);
    syncModelSelects(model, mode);
    closeAllModelMenus(null, true);
    if (shouldSave) saveModel(model, provider, mode);
  }

  function moveActiveModelOption(input, direction) {
    const buttons = modelOptionButtons(input);
    if (!buttons.length) return;
    const current = activeModelOption(input);
    const currentIndex = Math.max(0, buttons.indexOf(current));
    const nextIndex = (currentIndex + direction + buttons.length) % buttons.length;
    setActiveModelOption(input, buttons[nextIndex]);
  }

  function bindModelInput(input) {
    if (!input || input.dataset.ttEnhancerAiModelBound === SCRIPT_VERSION) return;
    input.dataset.ttEnhancerAiModelBound = SCRIPT_VERSION;

    input.addEventListener('focus', () => {
      input.select?.();
      openModelMenu(input, '');
    });

    input.addEventListener('input', () => {
      openModelMenu(input, input.value);
    });

    input.addEventListener('keydown', (event) => {
      const menu = getModelMenu(input);
      const isOpen = menu && !menu.hidden;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (!isOpen) openModelMenu(input, '');
        else moveActiveModelOption(input, 1);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (!isOpen) openModelMenu(input, '');
        else moveActiveModelOption(input, -1);
        return;
      }

      if (event.key === 'Enter') {
        if (!isOpen) return;
        event.preventDefault();
        const active = activeModelOption(input);
        if (active?.dataset?.modelValue) selectModelFromInput(input, active.dataset.modelValue);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        closeModelMenu(input, true);
      }
    });

    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (getModelCombobox(input)?.contains(document.activeElement)) return;
        closeModelMenu(input, true);
      }, 120);
    });
  }

  function bindModelControls(panel) {
    panel?.querySelectorAll('[data-role="model"]').forEach(bindModelInput);
    if (!panel || panel.dataset.ttEnhancerAiModelEventsBound === SCRIPT_VERSION) return;
    panel.dataset.ttEnhancerAiModelEventsBound = SCRIPT_VERSION;

    panel.addEventListener('mousedown', (event) => {
      if (event.target?.closest?.('[data-model-value], [data-action="toggle-model-options"]')) {
        event.preventDefault();
      }
    });

    panel.addEventListener('click', (event) => {
      const option = event.target?.closest?.('[data-model-value]');
      if (option) {
        const input = option.closest('.tt-enhancer-ai-model-combobox')?.querySelector('[data-role="model"]');
        selectModelFromInput(input, option.dataset.modelValue);
        return;
      }

      const toggle = event.target?.closest?.('[data-action="toggle-model-options"]');
      if (toggle) {
        const input = toggle.closest('.tt-enhancer-ai-model-combobox')?.querySelector('[data-role="model"]');
        if (!input) return;
        const menu = getModelMenu(input);
        if (menu && !menu.hidden) closeModelMenu(input, true);
        else {
          input.focus();
          openModelMenu(input, '');
        }
        return;
      }

      if (!event.target?.closest?.('.tt-enhancer-ai-model-combobox')) {
        closeAllModelMenus(null, true);
      }
    });
  }

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (panel?.dataset?.ttEnhancerAiVersion !== SCRIPT_VERSION) {
      destroyCodeEditors(panel);
      panel?.remove();
      panel = null;
    }
    if (!panel) {
      panel = createPanel();
      (document.body || document.documentElement).appendChild(panel);
    }
    state.panel = panel;
    bindPanelEvents(panel);
    applyPanelMode(panel);
    renderRailCollapsed();
    syncSettingsUi();
    syncBuilderModeUi();
    syncSettingsViewState(panel);
    return panel;
  }

  function isMobilePanelLayout() {
    return window.innerWidth <= MOBILE_PANEL_BREAKPOINT;
  }

  function clampNumber(value, min, max) {
    const fallback = Number.isFinite(min) ? min : 0;
    const number = Number(value);
    const safeValue = Number.isFinite(number) ? number : fallback;
    const safeMax = Math.max(min, Number.isFinite(max) ? max : min);
    return Math.min(Math.max(safeValue, min), safeMax);
  }

  function maxFloatingPanelWidth() {
    return Math.max(MIN_PANEL_WIDTH, window.innerWidth - PANEL_VIEWPORT_MARGIN * 2);
  }

  function maxFloatingPanelHeight() {
    return Math.max(MIN_FLOATING_PANEL_HEIGHT, window.innerHeight - PANEL_TOP_OFFSET - PANEL_VIEWPORT_MARGIN);
  }

  function clampPanelWidth(width) {
    return clampNumber(width, MIN_PANEL_WIDTH, maxFloatingPanelWidth());
  }

  function clampPanelHeight(height) {
    return clampNumber(height, MIN_FLOATING_PANEL_HEIGHT, maxFloatingPanelHeight());
  }

  function clampFloatingRect(rect, options = {}) {
    const width = clampPanelWidth(rect?.width || readPanelWidth() || DEFAULT_PANEL_WIDTH);
    const height = clampPanelHeight(rect?.height || window.innerHeight - PANEL_TOP_OFFSET - PANEL_VIEWPORT_MARGIN);
    const boundsHeight = clampNumber(options.boundsHeight || height, PANEL_BAR_HEIGHT, Math.max(PANEL_BAR_HEIGHT, window.innerHeight - PANEL_TOP_OFFSET));
    const minLeft = PANEL_VIEWPORT_MARGIN;
    const minTop = PANEL_TOP_OFFSET;
    const maxLeft = Math.max(minLeft, window.innerWidth - width - PANEL_VIEWPORT_MARGIN);
    const maxTop = Math.max(minTop, window.innerHeight - boundsHeight - PANEL_VIEWPORT_MARGIN);

    return {
      left: clampNumber(rect?.left, minLeft, maxLeft),
      top: clampNumber(rect?.top, minTop, maxTop),
      width,
      height
    };
  }

  function floatingRectFromPanel(panel = state.panel) {
    const rect = panel?.getBoundingClientRect?.();
    const width = rect?.width || readPanelWidth() || DEFAULT_PANEL_WIDTH;
    const height = state.isRailCollapsed
      ? (state.floatingRect?.height || window.innerHeight - PANEL_TOP_OFFSET - PANEL_VIEWPORT_MARGIN)
      : rect?.height;
    return clampFloatingRect({
      left: Number.isFinite(rect?.left) ? rect.left : window.innerWidth - width - PANEL_VIEWPORT_MARGIN,
      top: rect?.top,
      width,
      height
    }, {
      boundsHeight: state.isRailCollapsed ? PANEL_BAR_HEIGHT : height
    });
  }

  function defaultFloatingRect(panel = state.panel) {
    return clampFloatingRect(state.floatingRect || floatingRectFromPanel(panel), {
      boundsHeight: state.isRailCollapsed ? PANEL_BAR_HEIGHT : undefined
    });
  }

  function applyFloatingRect(panel, rect) {
    if (!panel || !rect) return;
    panel.style.left = Math.round(rect.left) + 'px';
    panel.style.top = Math.round(rect.top) + 'px';
    panel.style.width = Math.round(rect.width) + 'px';
    panel.style.height = Math.round(rect.height) + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  }

  function clearPanelInlineGeometry(panel) {
    if (!panel) return;
    ['left', 'top', 'right', 'bottom', 'width', 'height'].forEach((property) => {
      panel.style.removeProperty(property);
    });
  }

  function applyPanelMode(panel = state.panel, options = {}) {
    if (!panel) return;

    if (isMobilePanelLayout()) {
      panel.classList.remove('is-floating');
      panel.classList.remove('is-pinned');
      clearPanelInlineGeometry(panel);
      return;
    }

    panel.classList.add('is-floating');
    panel.classList.remove('is-pinned');

    state.floatingRect = defaultFloatingRect(panel);
    applyFloatingRect(panel, state.floatingRect);
    if (options.save) {
      writeFloatingRect(state.floatingRect);
      writePanelWidth(state.floatingRect.width);
    }
  }

  function clearRailAnimationStyles(panel) {
    if (!panel) return;
    panel.style.removeProperty('transition');
    panel.style.removeProperty('transform');
    panel.style.removeProperty('transform-origin');
    panel.style.removeProperty('will-change');
    panel.style.removeProperty('opacity');
  }

  function cancelRailAnimation(panel = state.panel) {
    clearTimeout(state.railAnimationTimer);
    state.railAnimationTimer = 0;
    if (state.railAnimationCleanup) {
      const cleanup = state.railAnimationCleanup;
      state.railAnimationCleanup = null;
      cleanup();
    }
    panel?.classList?.remove('is-rail-animating', 'is-rail-collapsing', 'is-rail-expanding');
    clearRailAnimationStyles(panel);
  }

  function formatTransformNumber(value) {
    return String(Math.round((Number(value) || 0) * 1000) / 1000);
  }

  function railTransformForRects(baseRect, targetRect) {
    const baseWidth = Math.max(1, Number(baseRect?.width) || 1);
    const baseHeight = Math.max(1, Number(baseRect?.height) || 1);
    const targetWidth = Math.max(1, Number(targetRect?.width) || 1);
    const targetHeight = Math.max(1, Number(targetRect?.height) || 1);
    const dx = (Number(targetRect?.left) || 0) - (Number(baseRect?.left) || 0);
    const dy = (Number(targetRect?.top) || 0) - (Number(baseRect?.top) || 0);
    const scaleX = targetWidth / baseWidth;
    const scaleY = targetHeight / baseHeight;
    return 'translate(' + formatTransformNumber(dx) + 'px, ' + formatTransformNumber(dy) + 'px) scale(' + formatTransformNumber(scaleX) + ', ' + formatTransformNumber(scaleY) + ')';
  }

  function animatePanelTransform(panel, baseRect, startTransform, endTransform, className, onDone) {
    if (!panel || !baseRect || !startTransform || !endTransform) {
      onDone?.();
      return;
    }

    clearTimeout(state.railAnimationTimer);
    state.railAnimationTimer = 0;
    if (state.railAnimationCleanup) {
      const cleanup = state.railAnimationCleanup;
      state.railAnimationCleanup = null;
      cleanup();
    }

    let done = false;
    const transition = 'transform ' + RAIL_ANIMATION_MS + 'ms cubic-bezier(0.22, 1, 0.36, 1), opacity ' + RAIL_ANIMATION_MS + 'ms ease';
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(state.railAnimationTimer);
      state.railAnimationTimer = 0;
      panel.removeEventListener('transitionend', handleTransitionEnd);
      if (state.railAnimationCleanup === cleanup) state.railAnimationCleanup = null;
      panel.classList.remove('is-rail-animating', 'is-rail-collapsing', 'is-rail-expanding');
      clearRailAnimationStyles(panel);
      onDone?.();
    };
    const cleanup = () => {
      if (done) return;
      done = true;
      clearTimeout(state.railAnimationTimer);
      state.railAnimationTimer = 0;
      panel.removeEventListener('transitionend', handleTransitionEnd);
      panel.classList.remove('is-rail-animating', 'is-rail-collapsing', 'is-rail-expanding');
      clearRailAnimationStyles(panel);
    };
    function handleTransitionEnd(event) {
      if (event.target === panel && event.propertyName === 'transform') finish();
    }

    panel.classList.remove('is-rail-collapsing', 'is-rail-expanding');
    panel.classList.add('is-rail-animating', className);
    applyFloatingRect(panel, baseRect);
    panel.style.transition = 'none';
    panel.style.transformOrigin = 'top left';
    panel.style.willChange = 'transform, opacity';
    panel.style.opacity = '1';
    panel.style.transform = startTransform;
    panel.getBoundingClientRect();
    panel.addEventListener('transitionend', handleTransitionEnd);
    state.railAnimationCleanup = cleanup;

    requestAnimationFrame(() => {
      if (done || state.isDestroyed || state.panel !== panel) return;
      panel.style.transition = transition;
      panel.style.transform = endTransform;
    });

    state.railAnimationTimer = setTimeout(finish, RAIL_ANIMATION_MS + 80);
  }

  function renderRailCollapsed(panel = state.panel, options = {}) {
    if (!panel) return;
    panel.classList.toggle('is-rail-collapsed', !!state.isRailCollapsed);
    const shouldHidePanel = !!state.isRailCollapsed
      && !options.keepPanelVisible
      && !panel.classList.contains('is-rail-animating');
    panel.classList.toggle('is-rail-hidden', shouldHidePanel);
    const button = panel.querySelector?.('[data-action="collapse-rail"]');
    if (button) {
      button.classList.toggle('is-active', !!state.isRailCollapsed);
      button.setAttribute('aria-pressed', state.isRailCollapsed ? 'true' : 'false');
      button.setAttribute('aria-label', state.isRailCollapsed ? 'Развернуть AI чат' : 'Свернуть AI чат вниз');
      button.title = state.isRailCollapsed ? 'Развернуть' : 'Свернуть вниз';
    }
    ensureRailButton({ forceVisible: options.forceRailButtonVisible });
  }

  function setRailCollapsed(value) {
    const nextCollapsed = !!value;
    const panel = state.panel;
    if (nextCollapsed === state.isRailCollapsed) {
      renderRailCollapsed();
      return;
    }
    if (!panel) return;

    cancelRailAnimation(panel);
    stopPanelDrag();
    stopPanelResize();

    if (isMobilePanelLayout()) {
      if (nextCollapsed) {
        setMenuOpen(false);
        closeSettingsView();
        closeBuildMenus();
      }
      state.isRailCollapsed = nextCollapsed;
      writeRailCollapsed(state.isRailCollapsed);
      renderRailCollapsed(panel);
      return;
    }

    if (nextCollapsed) {
      const expandedRect = floatingRectFromPanel(panel);
      const targetRect = railButtonRect();
      state.floatingRect = expandedRect;
      state.collapsedRect = null;
      writeFloatingRect(state.floatingRect);
      writePanelWidth(state.floatingRect.width);
      setMenuOpen(false);
      closeSettingsView();
      closeBuildMenus();
      state.isRailCollapsed = true;
      writeRailCollapsed(true);
      renderRailCollapsed(panel, { keepPanelVisible: true, forceRailButtonVisible: true });
      animatePanelTransform(
        panel,
        expandedRect,
        'translate(0px, 0px) scale(1, 1)',
        railTransformForRects(expandedRect, targetRect),
        'is-rail-collapsing',
        () => {
          if (!state.isRailCollapsed || state.isDestroyed) return;
          applyFloatingRect(panel, expandedRect);
          renderRailCollapsed(panel);
        }
      );
      return;
    }

    const startRect = railButtonRect();
    const savedRect = state.floatingRect || readFloatingRect() || floatingRectFromPanel(panel);
    const expandedRect = clampFloatingRect(savedRect, { boundsHeight: savedRect?.height });
    panel.classList.remove('is-rail-hidden');
    state.isRailCollapsed = false;
    writeRailCollapsed(false);
    renderRailCollapsed(panel, { keepPanelVisible: true, forceRailButtonVisible: true });
    animatePanelTransform(
      panel,
      expandedRect,
      railTransformForRects(expandedRect, startRect),
      'translate(0px, 0px) scale(1, 1)',
      'is-rail-expanding',
      () => {
        if (state.isRailCollapsed || state.isDestroyed) return;
        state.floatingRect = expandedRect;
        applyFloatingRect(panel, expandedRect);
        writeFloatingRect(state.floatingRect);
        writePanelWidth(state.floatingRect.width);
        renderRailCollapsed(panel);
        scheduleCodeBoxResize(panel);
      }
    );
  }

  function shouldIgnorePanelDragTarget(target) {
    return !!target?.closest?.('button, input, textarea, select, a, summary, [data-action], .tt-enhancer-ai-panel__actions');
  }

  function startPanelDrag(event) {
    if (!state.isOpen) return;
    if (isMobilePanelLayout()) return;
    if (event.button !== undefined && event.button !== 0) return;
    if (shouldIgnorePanelDragTarget(event.target)) return;
    const panel = state.panel;
    if (!panel) return;
    if (!state.isRailCollapsed) state.collapsedRect = null;

    const rect = floatingRectFromPanel(panel);
    state.panelDrag = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      width: rect.width,
      height: rect.height
    };
    state.floatingRect = rect;
    applyFloatingRect(panel, rect);
    panel.classList.add('is-dragging');
    event.preventDefault();

    try {
      event.currentTarget?.setPointerCapture?.(event.pointerId);
    } catch {}

    window.addEventListener('pointermove', movePanelDrag, true);
    window.addEventListener('pointerup', stopPanelDrag, true);
    window.addEventListener('pointercancel', stopPanelDrag, true);
    window.addEventListener('blur', stopPanelDrag, true);
  }

  function movePanelDrag(event) {
    const drag = state.panelDrag;
    if (!drag || !state.panel) return;
    state.floatingRect = clampFloatingRect({
      left: drag.startLeft + event.clientX - drag.startClientX,
      top: drag.startTop + event.clientY - drag.startClientY,
      width: drag.width,
      height: drag.height
    }, {
      boundsHeight: state.isRailCollapsed ? PANEL_BAR_HEIGHT : drag.height
    });
    applyFloatingRect(state.panel, state.floatingRect);
    event.preventDefault();
  }

  function stopPanelDrag() {
    if (!state.panelDrag) return;
    state.panelDrag = null;
    state.panel?.classList?.remove('is-dragging');
    if (state.floatingRect) {
      writeFloatingRect(state.floatingRect);
      writePanelWidth(state.floatingRect.width);
    }
    window.removeEventListener('pointermove', movePanelDrag, true);
    window.removeEventListener('pointerup', stopPanelDrag, true);
    window.removeEventListener('pointercancel', stopPanelDrag, true);
    window.removeEventListener('blur', stopPanelDrag, true);
  }

  function resizeCursorClass(direction) {
    if (direction === 'bottom') return 'ns';
    if (direction === 'bottom-left') return 'nesw';
    if (direction === 'bottom-right') return 'nwse';
    return 'ew';
  }

  function floatingRectForResize(startRect, direction, dx, dy) {
    const minLeft = PANEL_VIEWPORT_MARGIN;
    const maxRight = Math.max(minLeft + MIN_PANEL_WIDTH, window.innerWidth - PANEL_VIEWPORT_MARGIN);
    const maxBottom = Math.max(PANEL_TOP_OFFSET + MIN_FLOATING_PANEL_HEIGHT, window.innerHeight - PANEL_VIEWPORT_MARGIN);
    let left = startRect.left;
    let top = startRect.top;
    let right = startRect.left + startRect.width;
    let bottom = startRect.top + startRect.height;

    if (direction.includes('left')) {
      left = clampNumber(startRect.left + dx, minLeft, right - MIN_PANEL_WIDTH);
    }
    if (direction.includes('right')) {
      right = clampNumber(startRect.left + startRect.width + dx, left + MIN_PANEL_WIDTH, maxRight);
    }
    if (direction.includes('bottom')) {
      bottom = clampNumber(startRect.top + startRect.height + dy, top + MIN_FLOATING_PANEL_HEIGHT, maxBottom);
    }

    return clampFloatingRect({
      left,
      top,
      width: right - left,
      height: bottom - top
    });
  }

  function applyPanelResize(clientX, clientY) {
    const resize = state.panelResize;
    const panel = state.panel;
    if (!resize || !panel) return null;

    const dx = clientX - resize.startClientX;
    const dy = clientY - resize.startClientY;

    const rect = floatingRectForResize(resize.startRect, resize.direction, dx, dy);
    state.floatingRect = rect;
    resize.lastRect = rect;
    applyFloatingRect(panel, rect);
    return rect;
  }

  function startPanelResize(event) {
    const direction = event.currentTarget?.dataset?.resizeHandle || '';
    if (!state.panel || !state.isOpen || state.isRailCollapsed || isMobilePanelLayout()) return;
    if (event.button !== undefined && event.button !== 0) return;
    state.collapsedRect = null;

    event.preventDefault();
    event.stopPropagation();
    stopPanelDrag();
    setMenuOpen(false);
    closeBuildMenus();

    const startRect = floatingRectFromPanel(state.panel);
    const cursorClass = resizeCursorClass(direction);

    state.panelResize = {
      direction,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect: {
        left: startRect.left,
        top: startRect.top,
        width: startRect.width,
        height: startRect.height
      },
      lastRect: startRect,
      didMove: false,
      cursorClass
    };

    state.panel.classList.add('is-resizing');
    document.documentElement.classList.add('tt-enhancer-ai-is-resizing', 'tt-enhancer-ai-is-resizing--' + cursorClass);

    try {
      event.currentTarget?.setPointerCapture?.(event.pointerId);
    } catch {}

    window.addEventListener('pointermove', movePanelResize, true);
    window.addEventListener('pointerup', stopPanelResize, true);
    window.addEventListener('pointercancel', stopPanelResize, true);
    window.addEventListener('blur', stopPanelResize, true);
  }

  function movePanelResize(event) {
    const resize = state.panelResize;
    if (!resize) return;
    event.preventDefault();
    if (Math.abs(event.clientX - resize.startClientX) < 2 && Math.abs(event.clientY - resize.startClientY) < 2 && !resize.didMove) return;
    resize.didMove = true;
    applyPanelResize(event.clientX, event.clientY);
    scheduleCodeBoxResize(state.panel);
  }

  function stopPanelResize(event) {
    const resize = state.panelResize;
    if (!resize) return;

    if (event?.clientX != null && event?.clientY != null && resize.didMove) {
      applyPanelResize(event.clientX, event.clientY);
    }

    if (resize.didMove) {
      if (resize.lastRect) {
        state.floatingRect = resize.lastRect;
        writeFloatingRect(resize.lastRect);
        writePanelWidth(resize.lastRect.width);
      }
    }

    state.panelResize = null;
    state.panel?.classList?.remove('is-resizing');
    document.documentElement.classList.remove(
      'tt-enhancer-ai-is-resizing',
      'tt-enhancer-ai-is-resizing--ew',
      'tt-enhancer-ai-is-resizing--ns',
      'tt-enhancer-ai-is-resizing--nesw',
      'tt-enhancer-ai-is-resizing--nwse'
    );
    window.removeEventListener('pointermove', movePanelResize, true);
    window.removeEventListener('pointerup', stopPanelResize, true);
    window.removeEventListener('pointercancel', stopPanelResize, true);
    window.removeEventListener('blur', stopPanelResize, true);
    scheduleCodeBoxResize(state.panel);
  }

  function ensureButton() {
    let button = document.getElementById(BUTTON_ID) || state.button;
    if (button && !(button instanceof HTMLButtonElement)) {
      button.remove?.();
      button = null;
    }
    if (!button) button = createButton();
    else hydrateButton(button);

    const placed = ensureHeaderButton(button);
    if (!placed) return false;

    state.button = button;
    setButtonOpenState(state.button);
    return true;
  }

  function setButtonOpenState(button) {
    if (!button) return;
    button.classList.toggle('is-active', state.isOpen);
    const pressed = state.isOpen ? 'true' : 'false';
    if (button.getAttribute('aria-pressed') !== pressed) {
      button.setAttribute('aria-pressed', pressed);
    }
  }

  function ensureHeaderButton(button) {
    const right = document.querySelector('.tt-header__right');
    if (!right) {
      ensureFloatingButton(button);
      return true;
    }

    clearFloatingButton(button);

    const miniBrowserButton = document.getElementById(MINI_BROWSER_BUTTON_ID);
    const publish = right.querySelector('.tt-design-mode-publish');
    const target = right.contains(miniBrowserButton) ? miniBrowserButton : publish;
    if (!right.contains(button) || button.nextSibling !== target) {
      right.insertBefore(button, target || null);
    }
    return true;
  }

  function ensureFloatingButton(button) {
    if (!document.body || !button) return;
    button.classList.add('is-floating');
    if (!document.body.contains(button)) document.body.appendChild(button);
  }

  function clearFloatingButton(button) {
    button?.classList?.remove('is-floating');
  }

  function setOpen(isOpen) {
    const wasOpen = state.isOpen;
    state.isOpen = !!isOpen;
    writeOpenState(state.isOpen);
    syncOpenUi({
      animateClose: wasOpen && !state.isOpen,
      resetView: state.isOpen && !wasOpen,
      runSideEffects: state.isOpen && (!wasOpen || !state.selectionTimer)
    });
  }

  function syncOpenUi(options = {}) {
    clearTimeout(state.panelCloseTimer);
    state.panelCloseTimer = 0;

    if (state.isOpen) {
      const panel = ensurePanel();
      if (options.resetView) {
        setMenuOpen(false, panel);
        closeSettingsView(panel);
      }
      panel?.classList?.remove('is-closing');
      panel?.classList?.add('is-open');
      renderRailCollapsed(panel);
      setButtonOpenState(state.button);
      if (options.runSideEffects !== false) runOpenSideEffects();
      scheduleCodeBoxResize(panel);
      return;
    }

    const panel = state.panel || document.getElementById(PANEL_ID);
    const shouldAnimateClose = !!options.animateClose && !!panel?.classList?.contains('is-open');
    if (panel) {
      state.panel = panel;
      cancelRailAnimation(panel);
      panel.classList.remove('is-open');
      panel.classList.toggle('is-closing', shouldAnimateClose);
      renderRailCollapsed(panel);
    }
    setMenuOpen(false);
    closeSettingsView();
    setButtonOpenState(state.button);
    stopPanelDrag();
    stopPanelResize();
    clearCodeBoxInlineSize(panel);
    if (!shouldAnimateClose) {
      stopSelectionSync();
      return;
    }
    state.panelCloseTimer = setTimeout(() => {
      state.panelCloseTimer = 0;
      if (state.isOpen) return;
      state.panel?.classList?.remove('is-closing');
      stopSelectionSync();
    }, PANEL_CLOSE_ANIMATION_MS);
  }

  function runOpenSideEffects() {
    setTimeout(() => {
      if (!state.isOpen || state.isDestroyed) return;
      loadSettings();
      refreshSelectedContextSafe({ force: true });
      scheduleSelectionWarmup();
      startSelectionSync();
    }, 80);
  }

  function requestBridge(action, payload = {}, options = {}) {
    const id = uid('ai');
    const timeoutMs = options.timeout || 12000;
    const retry = options.retry === true;
    let done = false;
    let attempts = 0;
    let retryTimer = 0;

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        clearTimeout(retryTimer);
        window.removeEventListener('message', onMessage);
      };
      const finish = (callback, value) => {
        if (done) return;
        done = true;
        cleanup();
        callback(value);
      };
      const send = () => {
        if (done) return;
        attempts += 1;
        window.postMessage({
          source: REQUEST_SOURCE,
          id,
          action,
          payload
        }, '*');
        if (retry && attempts < 18) {
          retryTimer = setTimeout(send, 150);
        }
      };
      const onMessage = (event) => {
        if (event.source !== window) return;
        const message = event.data;
        if (!message || message.source !== RESPONSE_SOURCE || message.id !== id) return;
        if (message.ok) finish(resolve, message.data);
        else finish(reject, new Error(message.error || 'AI bridge error'));
      };
      const timer = setTimeout(() => {
        finish(reject, new Error('AI bridge не ответил'));
      }, timeoutMs);

      window.addEventListener('message', onMessage);
      send();
    });
  }

  async function loadSettings() {
    try {
      const settings = await requestBridge('getSettings', {}, { retry: true, timeout: 5000 });
      applySettings(settings);
      loadProviderModelOptions(normalizeProvider(settings?.provider));
    } catch {
      setSettingsNote('Bridge еще загружается', 'error');
    }
  }

  function normalizeProvider(value) {
    return value === 'openrouter' || value === 'openai-compatible' || value === 'puter' ? value : DEFAULT_PROVIDER;
  }

  function providerLabel(provider) {
    const activeProvider = normalizeProvider(provider);
    if (activeProvider === 'openrouter') return 'OpenRouter';
    if (activeProvider === 'openai-compatible') return 'OpenAI-compatible';
    if (activeProvider === 'puter') return 'Puter.js';
    return 'Gemini';
  }

  function providerNeedsApiKey(provider) {
    return normalizeProvider(provider) !== 'puter';
  }

  function normalizeOpenAiCompatibleBaseUrl(value) {
    let raw = String(value || '').trim();
    if (!raw) return '';
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
      raw = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|host\.docker\.internal)([:/]|$)/i.test(raw)
        ? 'http://' + raw
        : 'https://' + raw;
    }
    try {
      const url = new URL(raw);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
      url.hash = '';
      url.search = '';
      return url.href.replace(/\/+$/, '');
    } catch {
      return '';
    }
  }

  function providerHasRequiredConfig(provider) {
    const activeProvider = normalizeProvider(provider);
    if (activeProvider === 'puter') return true;
    if (activeProvider === 'openai-compatible') return !!state.settings.hasOpenAiCompatibleBaseUrl;
    return !!state.settings.hasApiKey;
  }

  function providerMissingConfigMessage(provider) {
    const activeProvider = normalizeProvider(provider);
    if (activeProvider === 'openai-compatible') {
      return 'Сначала укажите Base URL OpenAI-compatible API';
    }
    return 'Сначала добавьте ' + providerLabel(activeProvider) + ' API key';
  }

  function normalizeModelMode(value) {
    return value === MODEL_MODES.image ? MODEL_MODES.image : MODEL_MODES.text;
  }

  function currentModelMode() {
    if (state.isBuilderMode) return MODEL_MODES.text;
    return state.selectedContext?.mode === MODEL_MODES.image ? MODEL_MODES.image : MODEL_MODES.text;
  }

  function updatePromptPlaceholder() {
    const textarea = state.panel?.querySelector('[data-role="prompt"]');
    if (!textarea) return;
    textarea.placeholder = state.isBuilderMode
      ? 'Уточнение к сборке или обычное описание компонен��а...'
      : 'Опиши, что изменить в выбранном слое...';
  }

  function codeInputElement(panel = state.panel) {
    return panel?.querySelector?.('[data-role="code-input"]') || null;
  }

  function styleInputElement(panel = state.panel) {
    return panel?.querySelector?.('[data-role="style-input"]') || null;
  }

  function scriptInputElement(panel = state.panel) {
    return panel?.querySelector?.('[data-role="script-input"]') || null;
  }

  function codeEditorFieldConfigs() {
    return [
      { inputRole: 'code-input', mode: 'ace/mode/html' },
      { inputRole: 'style-input', mode: 'ace/mode/css' },
      { inputRole: 'script-input', mode: 'ace/mode/javascript' }
    ];
  }

  function codeEditorHostForInput(input) {
    const role = input?.dataset?.role;
    if (!role) return null;
    return input.closest?.('#' + PANEL_ID)?.querySelector?.('[data-role="code-editor"][data-editor-for="' + cssEscape(role) + '"]') || null;
  }

  function codeEditorForInput(input) {
    return codeEditorHostForInput(input)?.__ttEnhancerAceEditor || null;
  }

  function codeFieldValue(input) {
    const editor = codeEditorForInput(input);
    if (editor?.getValue) return String(editor.getValue() || '').trim();
    return String(input?.value || '').trim();
  }

  function setCodeFieldValue(input, value) {
    if (!input) return;
    const nextValue = String(value || '');
    input.value = nextValue;
    const editor = codeEditorForInput(input);
    if (editor?.getValue && editor.getValue() !== nextValue) {
      try {
        editor.setValue(nextValue, -1);
      } catch {}
    }
  }

  function focusCodeField(input) {
    const editor = codeEditorForInput(input);
    if (editor) {
      resizeCodeEditor(editor);
      editor.focus?.();
      return;
    }
    input?.focus?.();
  }

  function ensureAceSearchBox() {
    const aceGlobal = window.ace;
    if (!aceGlobal?.require) return false;
    try {
      return !!aceGlobal.require('ace/ext/searchbox');
    } catch {
      return false;
    }
  }

  function openAceFind(editor) {
    if (!editor) return;
    ensureAceSearchBox();
    try {
      editor.focus?.();
      editor.execCommand?.('find');
    } catch {}
  }

  function bindAceSearchShortcut(host, editor) {
    if (!host || !editor || host.__ttEnhancerAceSearchBound) return;
    host.__ttEnhancerAceSearchBound = true;
    host.addEventListener('keydown', (event) => {
      const key = String(event.key || '').toLowerCase();
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || '');
      const isFind = key === 'f' && (isMac ? event.metaKey : event.ctrlKey) && !event.altKey;
      if (!isFind) return;
      event.preventDefault();
      event.stopPropagation();
      openAceFind(editor);
    }, true);

    try {
      editor.commands?.addCommand?.({
        name: 'ttEnhancerAiFind',
        bindKey: { win: 'Ctrl-F', mac: 'Command-F' },
        exec: openAceFind
      });
    } catch {}
  }

  function initCodeEditorForInput(panel, config, aceGlobal) {
    const input = panel?.querySelector?.('[data-role="' + config.inputRole + '"]');
    const host = panel?.querySelector?.('[data-role="code-editor"][data-editor-for="' + config.inputRole + '"]');
    if (!input || !host) return false;
    if (host.__ttEnhancerAceEditor) return true;

    try {
      host.textContent = '';
      const editor = aceGlobal.edit(host);
      host.__ttEnhancerAceEditor = editor;
      host.__ttEnhancerAceInput = input;
      state.codeEditors.set(config.inputRole, editor);

      editor.session?.setMode?.(config.mode);
      editor.session?.setUseWorker?.(false);
      editor.session?.setUseWrapMode?.(true);
      editor.setOptions?.({
        displayIndentGuides: false,
        fontSize: '12px',
        highlightActiveLine: true,
        scrollPastEnd: 0.08,
        showPrintMargin: false,
        tabSize: 2,
        useSoftTabs: true,
        useWorker: false,
        wrap: true
      });
      editor.setValue?.(input.value || '', -1);
      editor.session?.on?.('change', () => {
        input.value = editor.getValue?.() || '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      bindAceSearchShortcut(host, editor);
      input.classList.add('tt-enhancer-ai-panel__ace-source');
      input.__ttEnhancerAcePrevTabIndex = input.getAttribute('tabindex');
      input.setAttribute('tabindex', '-1');
      input.setAttribute('aria-hidden', 'true');
      host.setAttribute('aria-label', input.getAttribute('placeholder') || 'Редактор кода');
      host.classList.add('is-ready');
      resizeCodeEditor(editor);
      return true;
    } catch {
      host.__ttEnhancerAceEditor = null;
      return false;
    }
  }

  function initCodeEditors(panel = state.panel) {
    if (!panel || state.isDestroyed) return true;
    const aceGlobal = window.ace;
    if (!aceGlobal?.edit) return false;
    ensureAceSearchBox();

    let initialized = false;
    codeEditorFieldConfigs().forEach((config) => {
      initialized = initCodeEditorForInput(panel, config, aceGlobal) || initialized;
    });
    if (initialized) {
      resizeCodeEditors(panel);
      scheduleCodeBoxResize(panel);
    }
    return true;
  }

  function scheduleCodeEditorsInit(panel = state.panel, attempt = 0) {
    if (!panel || state.isDestroyed) return;
    if (state.codeEditorInitTimer) {
      clearTimeout(state.codeEditorInitTimer);
      state.codeEditorInitTimer = 0;
    }

    state.codeEditorInitTimer = setTimeout(() => {
      state.codeEditorInitTimer = 0;
      if (state.isDestroyed || !document.contains(panel)) return;
      const isReady = initCodeEditors(panel);
      if (!isReady && attempt < 40) scheduleCodeEditorsInit(panel, attempt + 1);
    }, attempt ? 120 : 0);
  }

  function resizeCodeEditor(editor) {
    if (!editor) return;
    try {
      editor.resize?.(true);
      editor.renderer?.updateFull?.();
    } catch {}
  }

  function resizeCodeEditorHost(host) {
    resizeCodeEditor(host?.__ttEnhancerAceEditor || null);
  }

  function resizeCodeEditors(panel = state.panel) {
    panel?.querySelectorAll?.('[data-role="code-editor"].is-ready').forEach(resizeCodeEditorHost);
  }

  function destroyCodeEditors(panel = state.panel) {
    panel?.querySelectorAll?.('[data-role="code-editor"]').forEach((host) => {
      const editor = host.__ttEnhancerAceEditor;
      const input = host.__ttEnhancerAceInput;
      if (editor?.destroy) {
        try {
          editor.destroy();
        } catch {}
      }
      if (input) {
        input.classList.remove('tt-enhancer-ai-panel__ace-source');
        input.removeAttribute('aria-hidden');
        if (input.__ttEnhancerAcePrevTabIndex == null) {
          input.removeAttribute('tabindex');
        } else {
          input.setAttribute('tabindex', input.__ttEnhancerAcePrevTabIndex);
        }
        delete input.__ttEnhancerAcePrevTabIndex;
      }
      delete host.__ttEnhancerAceEditor;
      delete host.__ttEnhancerAceInput;
      host.classList.remove('is-ready');
    });
    state.codeEditors.clear();
  }

  function codeDraftValue(panel = state.panel) {
    return codeFieldValue(codeInputElement(panel));
  }

  function styleDraftValue(panel = state.panel) {
    return codeFieldValue(styleInputElement(panel));
  }

  function scriptDraftValue(panel = state.panel) {
    return codeFieldValue(scriptInputElement(panel));
  }

  function codeDraftTotalLength(panel = state.panel) {
    return codeDraftValue(panel).length + styleDraftValue(panel).length + scriptDraftValue(panel).length;
  }

  function updateCodeStatus(panel = state.panel) {
    const status = panel?.querySelector?.('[data-role="code-status"]');
    if (!status) return;
    const length = codeDraftTotalLength(panel);
    status.textContent = length ? `${length} симв.` : 'пусто';
  }

  function focusCodeInput(panel = state.panel) {
    const box = panel?.querySelector?.('[data-role="code-box"]');
    if (box) box.open = true;
    setCodeTab('source', panel);
    focusCodeField(codeInputElement(panel));
    scheduleCodeBoxResize(panel);
  }

  function closeCodeBox(panel = state.panel) {
    const box = panel?.querySelector?.('[data-role="code-box"]');
    if (!box?.open) return;
    box.open = false;
    clearCodeBoxInlineSize(panel);
  }

  function setCodeTab(tabName, panel = state.panel) {
    const activeTab = tabName === 'rules' || tabName === 'script' || tabName === 'styles' ? tabName : 'source';
    panel?.querySelectorAll?.('[data-code-tab]').forEach((button) => {
      const isActive = button.dataset.codeTab === activeTab;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    panel?.querySelectorAll?.('[data-code-panel]').forEach((item) => {
      item.hidden = item.dataset.codePanel !== activeTab;
    });
    resizeCodeEditors(panel);
    scheduleCodeBoxResize(panel);
  }

  function closeBuildMenus(panel = state.panel, except = null) {
    panel?.querySelectorAll?.('.tt-enhancer-ai-panel__build-split').forEach((root) => {
      if (root === except) return;
      root.classList.remove('is-open');
      const menu = root.querySelector('[data-role="build-menu"]');
      const toggle = root.querySelector('[data-action="toggle-build-menu"]');
      if (menu) menu.hidden = true;
      toggle?.setAttribute?.('aria-expanded', 'false');
    });
  }

  function toggleBuildMenu(button, panel = state.panel) {
    const root = button?.closest?.('.tt-enhancer-ai-panel__build-split');
    const menu = root?.querySelector?.('[data-role="build-menu"]');
    if (!root || !menu) return;
    const shouldOpen = menu.hidden;
    closeBuildMenus(panel, root);
    root.classList.toggle('is-open', shouldOpen);
    menu.hidden = !shouldOpen;
    button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  }

  function clearCodeBoxInlineSize(panel = state.panel) {
    const box = panel?.querySelector?.('[data-role="code-box"]');
    if (!box) return;
    box.querySelector('.tt-enhancer-ai-panel__code-body')?.style?.removeProperty('height');
    box.querySelectorAll('[data-code-panel]').forEach((item) => {
      item.style.removeProperty('height');
    });
    box.querySelectorAll('[data-role="code-input"], [data-role="style-input"], [data-role="script-input"], [data-role="code-editor"], .tt-enhancer-ai-panel__rules-list').forEach((item) => {
      item.style.removeProperty('height');
      item.style.removeProperty('max-height');
    });
    resizeCodeEditors(panel);
  }

  function resizeOpenCodeBox(panel = state.panel) {
    const box = panel?.querySelector?.('[data-role="code-box"]');
    if (!panel || !box || !box.open || !state.isOpen) {
      clearCodeBoxInlineSize(panel);
      return;
    }

    const body = box.querySelector('.tt-enhancer-ai-panel__code-body');
    const activePanel = box.querySelector('[data-code-panel]:not([hidden])');
    if (!body || !activePanel) return;

    const boxRect = box.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    const activeRect = activePanel.getBoundingClientRect();
    if (!boxRect.height || !bodyRect.top || !activeRect.top) return;

    const bodyStyle = getComputedStyle(body);
    const panelStyle = getComputedStyle(activePanel);
    const bodyPaddingBottom = parseFloat(bodyStyle.paddingBottom) || 0;
    const panelGap = parseFloat(panelStyle.rowGap || panelStyle.gap) || 8;
    const actions = activePanel.querySelector('.tt-enhancer-ai-panel__code-actions');
    const actionsHeight = actions?.getBoundingClientRect?.().height || 0;
    const content = activePanel.dataset.codePanel === 'rules'
      ? activePanel.querySelector('.tt-enhancer-ai-panel__rules-list')
      : activePanel.querySelector('[data-role="code-editor"].is-ready')
        || activePanel.querySelector('[data-role="code-input"], [data-role="style-input"], [data-role="script-input"]');

    if (!content) return;

    const bodyHeight = Math.max(180, boxRect.bottom - bodyRect.top);
    const panelHeight = Math.max(140, boxRect.bottom - activeRect.top - bodyPaddingBottom);
    const contentHeight = Math.max(96, panelHeight - actionsHeight - (actionsHeight ? panelGap : 0));

    body.style.height = Math.round(bodyHeight) + 'px';
    activePanel.style.height = Math.round(panelHeight) + 'px';
    content.style.height = Math.round(contentHeight) + 'px';
    content.style.maxHeight = 'none';
    if (content.matches?.('[data-role="code-editor"]')) resizeCodeEditorHost(content);
  }

  function scheduleCodeBoxResize(panel = state.panel) {
    if (state.codeResizeFrame) {
      cancelAnimationFrame(state.codeResizeFrame);
      state.codeResizeFrame = 0;
    }
    state.codeResizeFrame = requestAnimationFrame(() => {
      state.codeResizeFrame = requestAnimationFrame(() => {
        state.codeResizeFrame = 0;
        resizeOpenCodeBox(panel);
      });
    });
  }

  function replaceRuleRows(panel = state.panel, scope = 'chat') {
    return Array.from(panel?.querySelectorAll?.('[data-rule-replace-scope="' + cssEscape(scope) + '"] [data-rule-replace-row]') || []);
  }

  function readReplaceRuleInputs(panel = state.panel, scope = 'chat') {
    const from = [];
    const to = [];
    replaceRuleRows(panel, scope).forEach((row) => {
      const fromValue = String(row.querySelector('[data-rule-field="replaceFrom"]')?.value || '').trim();
      const toValue = String(row.querySelector('[data-rule-field="replaceTo"]')?.value || '').trim();
      if (!fromValue && !toValue) return;
      from.push(fromValue);
      to.push(toValue);
    });
    return {
      replaceFrom: from.join('\n'),
      replaceTo: to.join('\n')
    };
  }

  function syncReplaceRuleInputs(panel = state.panel, scope = 'chat', rules = {}) {
    const list = panel?.querySelector?.('[data-rule-replace-list="' + cssEscape(scope) + '"]');
    if (!list) return;
    list.innerHTML = replaceRuleRowsFromRules(rules)
      .map((row, index) => replaceRuleRowMarkup(scope, row, index))
      .join('');
    refreshReplaceRuleActions(panel, scope);
    validateReplaceRuleInputs(panel, scope);
  }

  function refreshReplaceRuleActions(panel = state.panel, scope = 'chat') {
    replaceRuleRows(panel, scope).forEach((row, index) => {
      const button = row.querySelector('[data-action="add-replace-rule"], [data-action="remove-replace-rule"]');
      if (!button) return;
      const isFirstRow = index === 0;
      const title = isFirstRow ? 'Добавить замену' : 'Удалить замену';
      button.dataset.action = isFirstRow ? 'add-replace-rule' : 'remove-replace-rule';
      button.dataset.ruleScope = scope;
      button.title = title;
      button.setAttribute('aria-label', title);
      button.innerHTML = iconSvg(isFirstRow ? 'plus' : 'trash');
    });
  }

  function displayReplaceClassName(value) {
    const className = constructorSingleClassSelector(value);
    return className ? '.' + className : '';
  }

  function validateReplaceRuleInputs(panel = state.panel, scope = 'chat') {
    const inputs = Array.from(panel?.querySelectorAll?.('[data-rule-replace-scope="' + cssEscape(scope) + '"] input[data-rule-field]') || []);
    const seen = new Map();
    inputs.forEach((input) => {
      input.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
      const error = input.closest('.tt-enhancer-ai-panel__replace-field')?.querySelector('[data-rule-replace-error]');
      if (error) error.textContent = '';
    });
    inputs.forEach((input) => {
      const displayName = displayReplaceClassName(input.value);
      if (!displayName) return;
      const key = displayName.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, input);
        return;
      }
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
      const error = input.closest('.tt-enhancer-ai-panel__replace-field')?.querySelector('[data-rule-replace-error]');
      if (error) error.textContent = 'Класс ' + displayName + ' уже задан';
    });
  }

  function addReplaceRuleRow(panel = state.panel, scope = 'chat') {
    const list = panel?.querySelector?.('[data-rule-replace-list="' + cssEscape(scope) + '"]');
    if (!list) return;
    const template = document.createElement('template');
    template.innerHTML = replaceRuleRowMarkup(scope);
    const row = template.content.firstElementChild;
    if (!row) return;
    list.appendChild(row);
    refreshReplaceRuleActions(panel, scope);
    validateReplaceRuleInputs(panel, scope);
    if (scope === 'chat') writeBuilderRuleDraft(readRuleInputs(panel, 'chat'));
    row.querySelector('input')?.focus();
    scheduleCodeBoxResize(panel);
  }

  function removeReplaceRuleRow(button, panel = state.panel, scope = 'chat') {
    const row = button?.closest?.('[data-rule-replace-row]');
    if (!row) return;
    row.remove();
    if (!replaceRuleRows(panel, scope).length) {
      addReplaceRuleRow(panel, scope);
      return;
    }
    refreshReplaceRuleActions(panel, scope);
    validateReplaceRuleInputs(panel, scope);
    if (scope === 'chat') writeBuilderRuleDraft(readRuleInputs(panel, 'chat'));
    scheduleCodeBoxResize(panel);
  }

  function handleRuleInput(event) {
    const input = event.target?.closest?.('[data-rule-scope][data-rule-field]');
    if (!input || !state.panel?.contains?.(input)) return;
    const scope = input.dataset.ruleScope || 'chat';
    if (input.dataset.ruleField === 'replaceFrom' || input.dataset.ruleField === 'replaceTo') {
      validateReplaceRuleInputs(state.panel, scope);
    }
    if (scope === 'chat') writeBuilderRuleDraft(readRuleInputs(state.panel, 'chat'));
    scheduleCodeBoxResize(state.panel);
  }

  function ruleInputSelector(scope) {
    return '[data-rule-scope="' + cssEscape(scope) + '"][data-rule-field]';
  }

  function readRuleInputs(panel = state.panel, scope = 'chat') {
    const result = {};
    BUILDER_RULE_FIELDS.forEach((field) => {
      const input = panel?.querySelector?.('[data-rule-scope="' + cssEscape(scope) + '"][data-rule-field="' + cssEscape(field.key) + '"]');
      result[field.key] = String(input?.value || '').trim();
    });
    Object.assign(result, readReplaceRuleInputs(panel, scope));
    return result;
  }

  function syncRuleInputs(panel = state.panel, scope = 'chat', rules = {}) {
    const values = normalizeBuilderRules(rules);
    panel?.querySelectorAll?.(ruleInputSelector(scope)).forEach((input) => {
      const key = input.dataset.ruleField;
      input.value = values[key] || '';
    });
    syncReplaceRuleInputs(panel, scope, values);
  }

  function currentBuilderRules(panel = state.panel) {
    return effectiveBuilderRules(readRuleInputs(panel, 'chat'));
  }

  function setRulesSettingsNote(text, status = 'idle', panel = state.panel) {
    const note = panel?.querySelector?.('[data-role="rules-settings-note"]');
    if (!note) return;
    note.textContent = text || '';
    note.dataset.status = status;
  }

  function resetChatRules(panel = state.panel) {
    clearBuilderRuleDraft();
    syncRuleInputs(panel, 'chat', readBuilderRuleDefaults());
    setCodeTab('rules', panel);
  }

  function saveRuleDefaultsFromPanel(panel = state.panel) {
    const defaults = readRuleInputs(panel, 'defaults');
    writeBuilderRuleDefaults(defaults);
    if (!readBuilderRuleDraft()) syncRuleInputs(panel, 'chat', defaults);
    setRulesSettingsNote('Правила сохранены', 'success', panel);
  }

  function resetRuleDefaults(panel = state.panel) {
    const defaults = presetBuilderRules();
    writeBuilderRuleDefaults(defaults);
    syncRuleInputs(panel, 'defaults', defaults);
    if (!readBuilderRuleDraft()) syncRuleInputs(panel, 'chat', defaults);
    setRulesSettingsNote('Предустановки восстановлены', 'success', panel);
  }

  function isMenuOpen(panel = state.panel) {
    return !!panel?.classList?.contains('is-menu-open');
  }

  function setMenuOpen(isOpen, panel = state.panel) {
    const menu = panel?.querySelector?.('[data-role="main-menu"]');
    const button = panel?.querySelector?.('[data-action="toggle-menu"]');
    if (!menu) return;

    clearTimeout(state.menuHideTimer);
    state.menuHideTimer = 0;

    if (isOpen) {
      menu.hidden = false;
      panel?.classList?.remove('is-menu-closing');
      try {
        menu.getBoundingClientRect();
      } catch {}
      panel?.classList?.add('is-menu-open');
    } else {
      panel?.classList?.remove('is-menu-open');
      panel?.classList?.add('is-menu-closing');
      state.menuHideTimer = setTimeout(() => {
        state.menuHideTimer = 0;
        if (panel?.classList?.contains('is-menu-open')) return;
        menu.hidden = true;
        panel?.classList?.remove('is-menu-closing');
      }, MENU_CLOSE_ANIMATION_MS);
    }

    button?.classList?.toggle('is-active', !!isOpen);
    button?.setAttribute?.('aria-pressed', isOpen ? 'true' : 'false');
  }

  function syncSettingsViewState(panel = state.panel) {
    const hasSubview = !!panel?.querySelector?.('.tt-enhancer-ai-panel__settings-view:not([hidden])');
    panel?.classList?.toggle('is-settings-view', hasSubview);
  }

  function openSettingsView(panel = state.panel) {
    if (!panel) return;
    state.panel = panel;
    const settings = panel.querySelector('[data-role="settings"]');
    if (!settings) return;
    setMenuOpen(false, panel);
    closePanelSubViews(panel, { keep: settings });
    settings.hidden = false;
    syncSettingsViewState(panel);
    const provider = normalizeProvider(state.settings.provider);
    const focusTarget = provider === 'openai-compatible' && !state.settings.hasOpenAiCompatibleBaseUrl
      ? panel.querySelector('[data-role="base-url"]')
      : providerNeedsApiKey(provider)
        ? panel.querySelector('[data-role="api-key"]')
        : panel.querySelector('.tt-enhancer-ai-panel__settings-model');
    focusTarget?.focus();
  }

  function openRulesView(panel = state.panel) {
    if (panel) state.panel = panel;
    const rules = panel?.querySelector?.('[data-role="rules-settings"]');
    if (!rules) return;
    setMenuOpen(false, panel);
    syncRuleInputs(panel, 'defaults', readBuilderRuleDefaults());
    closePanelSubViews(panel, { keep: rules });
    rules.hidden = false;
    syncSettingsViewState(panel);
    rules.querySelector('[data-rule-scope="defaults"]')?.focus();
  }

  function closePanelSubViews(panel = state.panel, options = {}) {
    if (panel) state.panel = panel;
    const keep = options.keep || null;
    panel?.querySelectorAll?.('.tt-enhancer-ai-panel__settings-view').forEach((view) => {
      if (view !== keep) view.hidden = true;
    });
    syncSettingsViewState(panel);
  }

  function closeSettingsView(panel = state.panel) {
    closePanelSubViews(panel);
  }

  function syncBuilderModeUi() {
    if (!state.panel) return;
    state.panel.classList.toggle('is-builder-mode', !!state.isBuilderMode);
    const input = state.panel.querySelector('[data-role="builder-mode"]');
    if (input) input.checked = !!state.isBuilderMode;
    updatePromptPlaceholder();
    renderLayerChip();
    renderQuickActions(state.panel, state.selectedContext);
    syncModelSelects(getProviderModel(state.settings.provider, currentModelMode()), currentModelMode());
    updateBuilderImageUi(state.panel);
    scheduleCodeBoxResize(state.panel);
  }

  function setBuilderMode(value) {
    state.isBuilderMode = !!value;
    writeBuilderMode(state.isBuilderMode);
    syncBuilderModeUi();
  }

  function defaultModelForProvider(provider, mode = MODEL_MODES.text) {
    const activeProvider = normalizeProvider(provider);
    const activeMode = normalizeModelMode(mode);
    if (activeProvider === 'gemini' && activeMode === MODEL_MODES.image) return DEFAULT_IMAGE_MODEL;
    if (activeProvider === 'openrouter' && activeMode === MODEL_MODES.image) return DEFAULT_OPENROUTER_IMAGE_MODEL;
    if (activeProvider === 'puter' && activeMode === MODEL_MODES.image) return DEFAULT_PUTER_IMAGE_MODEL;
    if (activeProvider === 'openai-compatible') return DEFAULT_OPENAI_COMPATIBLE_MODEL;
    return activeProvider === 'openrouter' ? DEFAULT_OPENROUTER_MODEL
      : activeProvider === 'puter' ? DEFAULT_PUTER_MODEL
      : DEFAULT_MODEL;
  }

  function sanitizeModelInput(provider, value) {
    const activeProvider = normalizeProvider(provider);
    const model = String(value || '').trim().replace(/^models\//, '');
    if (!model) return '';
    if (activeProvider === 'gemini' || activeProvider === 'puter') {
      if (model === 'gemini-2.5-flash-image-preview') return DEFAULT_IMAGE_MODEL;
      if (activeProvider === 'puter' && model === 'gemini-3.1-flash-image') return 'gemini-3.1-flash-image-preview';
      return /^[a-z0-9._:-]+$/i.test(model) ? model : '';
    }
    if (activeProvider === 'openai-compatible') {
      return /^[a-z0-9._:/+@=-]+$/i.test(model) ? model : '';
    }
    return /^[a-z0-9._:/+-]+$/i.test(model) ? model : '';
  }

  function normalizeModel(provider, value, mode = MODEL_MODES.text) {
    const activeProvider = normalizeProvider(provider);
    const fallback = defaultModelForProvider(activeProvider, mode);
    return sanitizeModelInput(activeProvider, value || fallback) || fallback;
  }

  function normalizeModelForMode(provider, value, mode = MODEL_MODES.text) {
    const activeProvider = normalizeProvider(provider);
    const activeMode = normalizeModelMode(mode);
    const model = normalizeModel(activeProvider, value, activeMode);
    if (activeProvider === 'gemini' && activeMode === MODEL_MODES.image) {
      return isImageGenerationModel(model) ? model : DEFAULT_IMAGE_MODEL;
    }
    if (activeProvider === 'gemini' && isImageGenerationModel(model)) return DEFAULT_MODEL;
    if (activeProvider === 'puter' && activeMode === MODEL_MODES.image) {
      return isImageGenerationModel(model) ? model : DEFAULT_PUTER_IMAGE_MODEL;
    }
    if (activeProvider === 'puter' && isImageGenerationModel(model)) return DEFAULT_PUTER_MODEL;
    return model;
  }

  function normalizeCustomModelList(provider, values) {
    const result = [];
    if (!Array.isArray(values)) return result;
    values.forEach((value) => {
      const model = sanitizeModelInput(provider, value);
      if (model && !result.includes(model)) result.push(model);
    });
    return result.slice(0, CUSTOM_MODEL_LIMIT);
  }

  function normalizeCustomModels(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      gemini: normalizeCustomModelList('gemini', source.gemini),
      openrouter: normalizeCustomModelList('openrouter', source.openrouter),
      'openai-compatible': normalizeCustomModelList('openai-compatible', source['openai-compatible'] || source.openAiCompatible),
      puter: normalizeCustomModelList('puter', source.puter)
    };
  }

  function applySettings(settings) {
    const provider = normalizeProvider(settings?.provider);
    const mode = currentModelMode();
    const customModels = normalizeCustomModels(settings?.customModels || state.settings.customModels);
    const geminiModel = normalizeModelForMode('gemini', settings?.geminiModel || (provider === 'gemini' ? settings?.model : DEFAULT_MODEL), MODEL_MODES.text);
    const geminiImageModel = normalizeModelForMode('gemini', settings?.geminiImageModel || DEFAULT_IMAGE_MODEL, MODEL_MODES.image);
    const openRouterModel = normalizeModelForMode('openrouter', settings?.openRouterModel || (provider === 'openrouter' ? settings?.model : DEFAULT_OPENROUTER_MODEL), MODEL_MODES.text);
    const openRouterImageModel = normalizeModelForMode('openrouter', settings?.openRouterImageModel || DEFAULT_OPENROUTER_IMAGE_MODEL, MODEL_MODES.image);
    const openAiCompatibleModel = normalizeModelForMode('openai-compatible', settings?.openAiCompatibleModel || (provider === 'openai-compatible' ? settings?.model : DEFAULT_OPENAI_COMPATIBLE_MODEL), MODEL_MODES.text);
    const openAiCompatibleBaseUrl = normalizeOpenAiCompatibleBaseUrl(settings?.openAiCompatibleBaseUrl || '');
    const puterModel = normalizeModelForMode('puter', settings?.puterModel || (provider === 'puter' ? settings?.model : DEFAULT_PUTER_MODEL), MODEL_MODES.text);
    const puterImageModel = normalizeModelForMode('puter', settings?.puterImageModel || DEFAULT_PUTER_IMAGE_MODEL, MODEL_MODES.image);
    let activeModel = settings?.model || (
      provider === 'openrouter' ? openRouterModel
      : provider === 'openai-compatible' ? openAiCompatibleModel
      : provider === 'puter' ? puterModel
      : geminiModel
    );
    if (mode === MODEL_MODES.image && provider === 'gemini') activeModel = geminiImageModel;
    if (mode === MODEL_MODES.image && provider === 'openrouter') activeModel = openRouterImageModel;
    if (mode === MODEL_MODES.image && provider === 'puter') activeModel = puterImageModel;
    state.settings = {
      provider,
      model: normalizeModelForMode(provider, activeModel, mode),
      geminiModel,
      geminiImageModel,
      openRouterModel,
      openRouterImageModel,
      openAiCompatibleModel,
      openAiCompatibleBaseUrl,
      puterModel,
      puterImageModel,
      customModels,
      hasApiKey: provider === 'puter'
        ? true
        : provider === 'openai-compatible'
          ? !!settings?.hasOpenAiCompatibleBaseUrl
          : !!settings?.hasApiKey,
      hasGeminiApiKey: !!settings?.hasGeminiApiKey,
      hasOpenRouterApiKey: !!settings?.hasOpenRouterApiKey,
      hasOpenAiCompatibleApiKey: !!settings?.hasOpenAiCompatibleApiKey,
      hasOpenAiCompatibleBaseUrl: !!settings?.hasOpenAiCompatibleBaseUrl,
      hasPuterApiKey: true
    };
    syncSettingsUi();
  }

  function getProviderModel(provider, mode = currentModelMode()) {
    const activeProvider = normalizeProvider(provider);
    const activeMode = normalizeModelMode(mode);
    if (activeProvider === 'gemini' && activeMode === MODEL_MODES.image) {
      return normalizeModelForMode(activeProvider, state.settings.geminiImageModel, activeMode);
    }
    if (activeProvider === 'openrouter' && activeMode === MODEL_MODES.image) {
      return normalizeModelForMode(activeProvider, state.settings.openRouterImageModel, activeMode);
    }
    if (activeProvider === 'openai-compatible') {
      return normalizeModelForMode(activeProvider, state.settings.openAiCompatibleModel, MODEL_MODES.text);
    }
    if (activeProvider === 'puter' && activeMode === MODEL_MODES.image) {
      return normalizeModelForMode(activeProvider, state.settings.puterImageModel, activeMode);
    }
    return activeProvider === 'openrouter'
      ? normalizeModelForMode(activeProvider, state.settings.openRouterModel, activeMode)
      : activeProvider === 'openai-compatible'
        ? normalizeModelForMode(activeProvider, state.settings.openAiCompatibleModel, MODEL_MODES.text)
      : activeProvider === 'puter'
        ? normalizeModelForMode(activeProvider, state.settings.puterModel, activeMode)
      : normalizeModelForMode(activeProvider, state.settings.geminiModel, activeMode);
  }

  function setProviderModel(provider, model, mode = currentModelMode()) {
    const activeProvider = normalizeProvider(provider);
    const activeMode = normalizeModelMode(mode);
    const value = normalizeModelForMode(activeProvider, model, activeProvider === 'openai-compatible' ? MODEL_MODES.text : activeMode);
    if (activeProvider === 'gemini' && activeMode === MODEL_MODES.image) state.settings.geminiImageModel = value;
    else if (activeProvider === 'openrouter' && activeMode === MODEL_MODES.image) state.settings.openRouterImageModel = value;
    else if (activeProvider === 'openai-compatible') state.settings.openAiCompatibleModel = value;
    else if (activeProvider === 'puter' && activeMode === MODEL_MODES.image) state.settings.puterImageModel = value;
    else if (activeProvider === 'openrouter') state.settings.openRouterModel = value;
    else if (activeProvider === 'puter') state.settings.puterModel = value;
    else state.settings.geminiModel = value;
    if (state.settings.provider === activeProvider && currentModelMode() === activeMode) state.settings.model = value;
    return value;
  }

  function modelOptionLabel(provider, model) {
    return providerLabel(provider) + ' - ' + model;
  }

  function optionTier(item) {
    const tier = item?.tier || '';
    if (tier === 'free' || tier === 'paid' || tier === 'custom') return tier;
    const value = String(item?.value || '');
    return value === 'openrouter/free' || value.endsWith(':free') ? 'free' : 'paid';
  }

  function modelOptionMode(item) {
    const mode = item?.mode || '';
    if (mode === MODEL_MODES.image || mode === MODEL_MODES.text) return mode;
    return isImageGenerationModel(item?.value) ? MODEL_MODES.image : MODEL_MODES.text;
  }

  function modelOptionMatchesMode(item, mode) {
    return modelOptionMode(item) === normalizeModelMode(mode);
  }

  function modelOptionsForProvider(provider, mode = currentModelMode(), current = '') {
    const activeProvider = normalizeProvider(provider);
    const activeMode = normalizeModelMode(mode);
    const filterMode = activeProvider === 'openai-compatible' ? MODEL_MODES.text : activeMode;
    const options = mergeUniqueModelOptions([
      ...(state.modelOptions?.[activeProvider] || MODEL_OPTIONS[activeProvider] || []),
      ...customModelOptions(activeProvider, filterMode)
    ]).filter((item) => modelOptionMatchesMode(item, filterMode));
    const normalizedCurrent = sanitizeModelInput(activeProvider, current);
    if (normalizedCurrent && !options.some((item) => item.value === normalizedCurrent)) {
      options.push({
        value: normalizedCurrent,
        label: modelOptionLabel(activeProvider, normalizedCurrent),
        tier: 'custom',
        mode: filterMode
      });
    }
    return options;
  }

  function customModelOptions(provider, mode = currentModelMode()) {
    const activeProvider = normalizeProvider(provider);
    const activeMode = normalizeModelMode(mode);
    const customModels = normalizeCustomModels(state.settings.customModels);
    return customModels[activeProvider]
      .filter((model) => {
        if (activeProvider === 'openrouter' || activeProvider === 'openai-compatible') return true;
        const isImageModel = isImageGenerationModel(model);
        return activeMode === MODEL_MODES.image ? isImageModel : !isImageModel;
      })
      .map((model) => ({
        value: model,
        label: modelOptionLabel(activeProvider, model),
        tier: 'custom',
        mode: activeMode
      }));
  }

  function normalizeLiveOpenRouterModel(item) {
    const rawId = item?.id || item?.value || '';
    const id = normalizeModel('openrouter', rawId);
    if (!id || id === DEFAULT_OPENROUTER_MODEL && !rawId) return null;
    return {
      value: id,
      label: modelOptionLabel('openrouter', id),
      tier: 'free',
      mode: MODEL_MODES.text,
      name: String(item?.name || '').trim().slice(0, 140)
    };
  }

  function mergeUniqueModelOptions(items) {
    const byValue = new Map();
    (items || []).forEach((item) => {
      if (!item?.value || byValue.has(item.value)) return;
      byValue.set(item.value, item);
    });
    return Array.from(byValue.values());
  }

  function applyLiveOpenRouterModels(models) {
    const routerOption = MODEL_OPTIONS.openrouter.find((item) => item.value === DEFAULT_OPENROUTER_MODEL) || {
      value: DEFAULT_OPENROUTER_MODEL,
      label: modelOptionLabel('openrouter', DEFAULT_OPENROUTER_MODEL),
      tier: 'free'
    };
    const liveFreeOptions = (models || [])
      .map(normalizeLiveOpenRouterModel)
      .filter(Boolean);
    const staticPaidOptions = MODEL_OPTIONS.openrouter
      .filter((item) => optionTier(item) === 'paid' && modelOptionMatchesMode(item, MODEL_MODES.text));

    state.modelOptions.openrouter = mergeUniqueModelOptions([
      routerOption,
      ...liveFreeOptions,
      ...staticPaidOptions
    ]);
    state.openRouterModelsLoaded = true;
    if (state.settings.provider === 'openrouter') {
      syncModelSelects(getProviderModel('openrouter', currentModelMode()), currentModelMode());
    }
  }

  async function loadOpenRouterModelOptions() {
    if (state.openRouterModelsLoading || state.openRouterModelsLoaded) return;
    state.openRouterModelsLoading = true;
    try {
      const result = await requestBridge('getModels', {
        provider: 'openrouter',
        tier: 'free'
      }, { timeout: 18000 });
      applyLiveOpenRouterModels(result?.models || []);
    } catch {
      state.openRouterModelsLoaded = false;
    } finally {
      state.openRouterModelsLoading = false;
    }
  }

  function normalizeLiveOpenAiCompatibleModel(item) {
    const rawId = item?.id || item?.value || '';
    const id = normalizeModel('openai-compatible', rawId, MODEL_MODES.text);
    if (!id) return null;
    return {
      value: id,
      label: modelOptionLabel('openai-compatible', id),
      tier: 'free',
      mode: MODEL_MODES.text,
      name: String(item?.name || item?.label || '').trim().slice(0, 140)
    };
  }

  function applyLiveOpenAiCompatibleModels(models, baseUrl = '') {
    const staticOptions = MODEL_OPTIONS['openai-compatible']
      .filter((item) => modelOptionMatchesMode(item, MODEL_MODES.text));
    const liveOptions = (models || [])
      .map(normalizeLiveOpenAiCompatibleModel)
      .filter(Boolean);

    state.modelOptions['openai-compatible'] = mergeUniqueModelOptions([
      ...staticOptions,
      ...liveOptions
    ]);
    state.openAiCompatibleModelsLoaded = true;
    state.openAiCompatibleModelsBaseUrl = normalizeOpenAiCompatibleBaseUrl(baseUrl);
    if (state.settings.provider === 'openai-compatible') {
      syncModelSelects(getProviderModel('openai-compatible', currentModelMode()), currentModelMode());
    }
  }

  async function loadOpenAiCompatibleModelOptions(force = false) {
    const baseUrl = normalizeOpenAiCompatibleBaseUrl(state.settings.openAiCompatibleBaseUrl);
    if (!baseUrl) return;
    if (
      state.openAiCompatibleModelsLoading
      || (!force && state.openAiCompatibleModelsLoaded && state.openAiCompatibleModelsBaseUrl === baseUrl)
    ) return;

    state.openAiCompatibleModelsLoading = true;
    try {
      const result = await requestBridge('getModels', {
        provider: 'openai-compatible',
        baseUrl
      }, { timeout: 18000 });
      applyLiveOpenAiCompatibleModels(result?.models || [], baseUrl);
    } catch {
      state.openAiCompatibleModelsLoaded = false;
      state.openAiCompatibleModelsBaseUrl = '';
    } finally {
      state.openAiCompatibleModelsLoading = false;
    }
  }

  function loadProviderModelOptions(provider, options = {}) {
    const activeProvider = normalizeProvider(provider);
    if (activeProvider === 'openrouter') {
      loadOpenRouterModelOptions();
      return;
    }
    if (activeProvider === 'openai-compatible') {
      loadOpenAiCompatibleModelOptions(options.force === true);
    }
  }

  function normalizeSearchText(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function modelSearchText(item) {
    return normalizeSearchText([
      item?.value,
      item?.label,
      item?.name,
      MODEL_TIER_LABELS[optionTier(item)]
    ].filter(Boolean).join(' '));
  }

  function getModelInput(control) {
    if (control?.matches?.('[data-role="model"]')) return control;
    return control?.querySelector?.('[data-role="model"]') || null;
  }

  function getModelCombobox(input) {
    return input?.closest?.('.tt-enhancer-ai-model-combobox') || null;
  }

  function getModelMenu(input) {
    return getModelCombobox(input)?.querySelector?.('[data-role="model-menu"]') || null;
  }

  function modelOptionSubtitle(provider, item) {
    const tier = optionTier(item);
    const parts = [MODEL_TIER_LABELS[tier] || tier, providerLabel(provider)];
    if (item?.name && item.name !== item.value) parts.push(item.name);
    return parts.filter(Boolean).join(' · ');
  }

  function setActiveModelOption(input, option) {
    const menu = getModelMenu(input);
    if (!menu) return;
    menu.querySelectorAll('.tt-enhancer-ai-model-combobox__option').forEach((button) => {
      button.classList.toggle('is-active', button === option);
    });
    if (option) option.scrollIntoView({ block: 'nearest' });
  }

  function activeModelOption(input) {
    return getModelMenu(input)?.querySelector('.tt-enhancer-ai-model-combobox__option.is-active') || null;
  }

  function modelOptionButtons(input) {
    return Array.from(getModelMenu(input)?.querySelectorAll('.tt-enhancer-ai-model-combobox__option') || []);
  }

  function renderModelMenu(input, query = '', shouldOpen = true) {
    const control = getModelInput(input);
    if (!control) return;
    const menu = getModelMenu(control);
    if (!menu) return;

    const activeProvider = normalizeProvider(control.dataset.provider || state.settings.provider);
    const activeMode = normalizeModelMode(control.dataset.mode || currentModelMode());
    const current = normalizeModelForMode(activeProvider, control.dataset.value || getProviderModel(activeProvider, activeMode), activeMode);
    const options = modelOptionsForProvider(activeProvider, activeMode, current);
    const normalizedQuery = normalizeSearchText(query);
    const filtered = normalizedQuery
      ? options.filter((item) => modelSearchText(item).includes(normalizedQuery))
      : options;

    menu.innerHTML = '';

    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'tt-enhancer-ai-model-combobox__empty';
      empty.textContent = 'Модели не найдены';
      menu.appendChild(empty);
    } else {
      MODEL_TIER_ORDER.forEach((tier) => {
        const tierOptions = filtered.filter((item) => optionTier(item) === tier);
        if (!tierOptions.length) return;

        const group = document.createElement('div');
        group.className = 'tt-enhancer-ai-model-combobox__group';

        const header = document.createElement('div');
        header.className = 'tt-enhancer-ai-model-combobox__group-title';
        header.textContent = MODEL_TIER_LABELS[tier] || tier;
        group.appendChild(header);

        tierOptions.forEach((item) => {
          const option = document.createElement('button');
          option.type = 'button';
          option.className = 'tt-enhancer-ai-model-combobox__option';
          option.dataset.modelValue = item.value;
          option.setAttribute('role', 'option');
          option.setAttribute('aria-selected', item.value === current ? 'true' : 'false');

          const title = document.createElement('span');
          title.className = 'tt-enhancer-ai-model-combobox__option-title';
          title.textContent = item.value;

          const subtitle = document.createElement('span');
          subtitle.className = 'tt-enhancer-ai-model-combobox__option-subtitle';
          subtitle.textContent = modelOptionSubtitle(activeProvider, item);

          option.append(title, subtitle);
          group.appendChild(option);
        });

        menu.appendChild(group);
      });
    }

    if (shouldOpen) {
      menu.hidden = false;
      getModelCombobox(control)?.classList.add('is-open');
      control.setAttribute('aria-expanded', 'true');
      setActiveModelOption(control, menu.querySelector('[aria-selected="true"]') || menu.querySelector('.tt-enhancer-ai-model-combobox__option'));
    }
  }

  function closeModelMenu(input, restoreValue = true) {
    const control = getModelInput(input);
    if (!control) return;
    const menu = getModelMenu(control);
    if (menu) menu.hidden = true;
    getModelCombobox(control)?.classList.remove('is-open');
    control.setAttribute('aria-expanded', 'false');
    if (restoreValue) {
      control.value = control.dataset.value || '';
    }
  }

  function closeAllModelMenus(except = null, restoreValue = true) {
    state.panel?.querySelectorAll('[data-role="model"]').forEach((input) => {
      if (input !== except) closeModelMenu(input, restoreValue);
    });
  }

  function openModelMenu(input, query = '') {
    const control = getModelInput(input);
    if (!control) return;
    closeAllModelMenus(control);
    renderModelMenu(control, query, true);
  }

  function selectedModelValue(input) {
    const control = getModelInput(input);
    return control?.dataset?.value || control?.value || '';
  }

  function setModelSelectOptions(input, provider, value, mode = currentModelMode()) {
    const control = getModelInput(input);
    if (!control) return;
    const activeProvider = normalizeProvider(provider);
    const activeMode = normalizeModelMode(mode);
    const effectiveMode = activeProvider === 'openai-compatible' ? MODEL_MODES.text : activeMode;
    const current = normalizeModelForMode(activeProvider, value, effectiveMode);
    const options = modelOptionsForProvider(activeProvider, activeMode, current);
    const selected = options.find((item) => item.value === current) || null;
    const toggle = getModelCombobox(control)?.querySelector('[data-action="toggle-model-options"]');

    control.dataset.provider = activeProvider;
    control.dataset.mode = activeMode;
    control.dataset.value = current;
    control.disabled = false;
    if (toggle) toggle.disabled = false;
    control.value = current;
    control.title = selected?.label || modelOptionLabel(activeProvider, current);
    control.placeholder = activeProvider === 'openai-compatible' || activeMode !== MODEL_MODES.image
      ? 'Найти модель...'
      : 'Найти image-модель...';
    renderModelMenu(control, '', false);
  }

  function syncProviderSelect(provider) {
    const value = normalizeProvider(provider || state.settings.provider);
    state.settings.provider = value;
    const select = state.panel?.querySelector('[data-role="provider"]');
    if (select) select.value = value;
  }

  function syncModelSelects(model, mode = currentModelMode()) {
    const provider = normalizeProvider(state.settings.provider);
    const activeMode = normalizeModelMode(mode);
    const value = setProviderModel(provider, model || getProviderModel(provider, activeMode), activeMode);
    state.panel?.querySelectorAll('[data-role="model"]').forEach((input) => {
      setModelSelectOptions(input, provider, value, activeMode);
    });
  }

  function apiKeyPlaceholder(provider) {
    if (!providerNeedsApiKey(provider)) return 'API key не нужен';
    if (normalizeProvider(provider) === 'openrouter') return 'sk-or-v1...';
    if (normalizeProvider(provider) === 'openai-compatible') return 'Bearer token (optional)';
    return 'AIza...';
  }

  function customModelPlaceholder(provider, mode = currentModelMode()) {
    const activeProvider = normalizeProvider(provider);
    if (activeProvider === 'openrouter') return 'provider/model-id';
    if (activeProvider === 'openai-compatible') return 'model-id';
    if (activeProvider === 'puter') return normalizeModelMode(mode) === MODEL_MODES.image ? 'gemini-image-model-id' : 'gemini-model-id';
    return normalizeModelMode(mode) === MODEL_MODES.image ? 'gemini-image-model-id' : 'gemini-model-id';
  }

  function syncSettingsUi() {
    if (!state.panel) return;
    const provider = normalizeProvider(state.settings.provider);
    const needsApiKey = providerNeedsApiKey(provider);
    state.settings.hasApiKey = !needsApiKey
      ? true
      : provider === 'openai-compatible'
        ? !!state.settings.hasOpenAiCompatibleBaseUrl
      : provider === 'openrouter'
        ? !!state.settings.hasOpenRouterApiKey
        : !!state.settings.hasGeminiApiKey;
    syncProviderSelect(provider);
    syncModelSelects(getProviderModel(provider, currentModelMode()), currentModelMode());
    const keyLabel = state.panel.querySelector('[data-role="api-key-label"]');
    if (keyLabel) {
      keyLabel.textContent = provider === 'openai-compatible'
        ? 'Bearer token'
        : 'Ключ ' + providerLabel(provider) + ' API';
    }
    const baseUrlInput = state.panel.querySelector('[data-role="base-url"]');
    const baseUrlField = baseUrlInput?.closest?.('.tt-enhancer-ai-panel__field') || null;
    if (baseUrlField) baseUrlField.hidden = provider !== 'openai-compatible';
    if (baseUrlInput) {
      if (baseUrlInput !== document.activeElement) {
        baseUrlInput.value = provider === 'openai-compatible' ? state.settings.openAiCompatibleBaseUrl || '' : '';
      }
      baseUrlInput.placeholder = 'http://localhost:8081/v1';
    }
    const input = state.panel.querySelector('[data-role="api-key"]');
    const keyField = input?.closest?.('.tt-enhancer-ai-panel__field') || null;
    if (keyField) keyField.hidden = !needsApiKey;
    if (input) {
      const hasSavedToken = provider === 'openai-compatible'
        ? !!state.settings.hasOpenAiCompatibleApiKey
        : state.settings.hasApiKey;
      input.placeholder = hasSavedToken ? 'Ключ сохранён' : apiKeyPlaceholder(provider);
      if (!needsApiKey) input.value = '';
    }
    const clearKeyButton = state.panel.querySelector('[data-action="clear-key"]');
    if (clearKeyButton) clearKeyButton.hidden = !needsApiKey;
    const customModelInput = state.panel.querySelector('[data-role="custom-model"]');
    if (customModelInput) {
      customModelInput.placeholder = customModelPlaceholder(provider, currentModelMode());
    }
    setSettingsNote(
      provider === 'openai-compatible'
        ? state.settings.hasOpenAiCompatibleBaseUrl
          ? (
            state.settings.hasOpenAiCompatibleApiKey
              ? 'Base URL и token сохранены в chrome.storage.sync'
              : 'Base URL сохранён. Token можно оставить пустым, если провайдер его не требует'
          )
          : 'Укажите Base URL OpenAI-compatible API, например http://localhost:8081/v1 или http://localhost:9655/v1'
      : !needsApiKey
        ? 'Puter.js работает без API key'
        : state.settings.hasApiKey ? 'Ключ ' + providerLabel(provider) + ' сохранён в chrome.storage.sync' : 'Добавьте ключ ' + providerLabel(provider) + ' API',
      provider === 'openai-compatible'
        ? (state.settings.hasOpenAiCompatibleBaseUrl ? 'success' : 'idle')
        : (!needsApiKey || state.settings.hasApiKey ? 'success' : 'idle')
    );
  }

  function setSettingsNote(text, status = 'idle') {
    const note = state.panel?.querySelector('[data-role="settings-note"]');
    if (!note) return;
    note.textContent = text || '';
    note.dataset.status = status;
  }

  function formatBridgeUiError(error, fallback) {
    const message = String(error?.message || error || '');
    if (/extension context invalidated|AI bridge не ответил/i.test(message)) {
      return 'Контекст расширения обновился. Перезагрузите ст��аницу TapTop и попробуйте ещё раз.';
    }
    return message || fallback;
  }

  async function saveSettingsFromPanel() {
    const apiKeyInput = state.panel?.querySelector('[data-role="api-key"]');
    const baseUrlInput = state.panel?.querySelector('[data-role="base-url"]');
    const provider = normalizeProvider(state.panel?.querySelector('[data-role="provider"]')?.value || state.settings.provider);
    const mode = currentModelMode();
    const modelInput = state.panel?.querySelector('.tt-enhancer-ai-panel__settings-model');
    const model = normalizeModelForMode(provider, selectedModelValue(modelInput), mode);
    const apiKey = String(apiKeyInput?.value || '').trim();
    const baseUrl = normalizeOpenAiCompatibleBaseUrl(baseUrlInput?.value || '');
    setSettingsNote('Сохраняем...', 'loading');

    try {
      const settings = await requestBridge('saveSettings', { provider, apiKey, baseUrl, model, mode }, { retry: true, timeout: 8000 });
      if (apiKeyInput) apiKeyInput.value = '';
      applySettings(settings);
      loadProviderModelOptions(provider, { force: true });
    } catch (error) {
      setSettingsNote(formatBridgeUiError(error, 'Не удалось сохранить настройки'), 'error');
    }
  }

  async function clearApiKey() {
    const provider = normalizeProvider(state.settings.provider);
    const mode = currentModelMode();
    if (!providerNeedsApiKey(provider)) {
      setSettingsNote('Puter.js работает без API key', 'success');
      return;
    }
    setSettingsNote('Сбрасываем...', 'loading');
    try {
      const settings = await requestBridge('saveSettings', {
        provider,
        model: getProviderModel(provider, mode),
        mode,
        clearKey: true
      }, { retry: true, timeout: 8000 });
      applySettings(settings);
    } catch (error) {
      setSettingsNote(formatBridgeUiError(error, 'Не удалось сбросить ключ'), 'error');
    }
  }

  async function saveProvider(provider, mode = currentModelMode()) {
    const activeProvider = normalizeProvider(provider);
    const activeMode = normalizeModelMode(mode);
    try {
      const settings = await requestBridge('saveSettings', {
        provider: activeProvider,
        model: getProviderModel(activeProvider, activeMode),
        mode: activeMode
      }, { retry: true, timeout: 8000 });
      applySettings(settings);
    } catch {}
  }

  async function saveModel(model, provider = state.settings.provider, mode = currentModelMode()) {
    const activeProvider = normalizeProvider(provider);
    const activeMode = normalizeModelMode(mode);
    const normalizedModel = normalizeModelForMode(activeProvider, model, activeMode);
    try {
      const settings = await requestBridge('saveSettings', {
        provider: activeProvider,
        model: normalizedModel,
        mode: activeMode
      }, { retry: true, timeout: 8000 });
      applySettings(settings);
    } catch {}
  }

  function addCustomModelToState(provider, model) {
    const activeProvider = normalizeProvider(provider);
    const normalized = sanitizeModelInput(activeProvider, model);
    if (!normalized) return '';
    const customModels = normalizeCustomModels(state.settings.customModels);
    const list = customModels[activeProvider].filter((item) => item !== normalized);
    customModels[activeProvider] = [normalized, ...list].slice(0, CUSTOM_MODEL_LIMIT);
    state.settings.customModels = customModels;
    return normalized;
  }

  async function addCustomModelFromPanel() {
    const provider = normalizeProvider(state.settings.provider);
    const mode = currentModelMode();
    const input = state.panel?.querySelector('[data-role="custom-model"]');
    const model = sanitizeModelInput(provider, input?.value);
    if (!model) {
      setSettingsNote('Введите корректный model id для ' + providerLabel(provider), 'error');
      input?.focus?.();
      return;
    }
    if (mode === MODEL_MODES.image && (provider === 'gemini' || provider === 'puter') && !isImageGenerationModel(model)) {
      setSettingsNote('Для image-режима нужна модель с image/imagen в id', 'error');
      input?.focus?.();
      return;
    }

    addCustomModelToState(provider, model);
    setProviderModel(provider, model, mode);
    syncModelSelects(model, mode);
    setSettingsNote('Сохраняем модель...', 'loading');

    try {
      const settings = await requestBridge('saveSettings', {
        provider,
        model,
        mode,
        customModel: model
      }, { retry: true, timeout: 8000 });
      if (input) input.value = '';
      applySettings(settings);
      setSettingsNote('Модель добавлена: ' + model, 'success');
    } catch (error) {
      setSettingsNote(formatBridgeUiError(error, 'Не удалось добавить модель'), 'error');
    }
  }

  function readObjectValue(item, key) {
    if (!item) return '';
    try {
      if (typeof item.get === 'function') {
        const value = item.get(key);
        if (value !== undefined && value !== null && value !== '') return value;
      }
    } catch {}
    return item[key] ?? '';
  }

  function readExistingObjectValue(item, key) {
    if (!item || key === undefined || key === null) return { found: false, value: undefined };
    try {
      if (typeof item.get === 'function') {
        const value = item.get(key);
        if (value !== undefined && value !== null) return { found: true, value };
      }
    } catch {}
    try {
      if (Object.prototype.hasOwnProperty.call(item, key)) {
        return { found: true, value: item[key] };
      }
    } catch {}
    try {
      if (key in Object(item)) {
        const value = item[key];
        if (value !== undefined && value !== null) return { found: true, value };
      }
    } catch {}
    return { found: false, value: undefined };
  }

  function readTagSlot(tag, key) {
    const direct = readExistingObjectValue(tag, key);
    if (direct.found) {
      return { found: true, value: direct.value, ref: { type: 'model', container: tag, key } };
    }

    try {
      if (typeof tag?.getData === 'function') {
        const value = tag.getData(key);
        if (value !== undefined && value !== null) {
          return { found: true, value, ref: { type: 'tag-data', container: tag, key } };
        }
      }
    } catch {}

    try {
      if (typeof tag?.getAttr === 'function') {
        const value = tag.getAttr(key);
        if (value !== undefined && value !== null) {
          return { found: true, value, ref: { type: 'tag-attr', container: tag, key } };
        }
      }
    } catch {}

    return { found: false, value: undefined, ref: null };
  }

  function getRefValue(ref) {
    if (!ref?.container) return '';
    try {
      if (ref.type === 'tag-data' && typeof ref.container.getData === 'function') return ref.container.getData(ref.key);
      if (ref.type === 'tag-attr' && typeof ref.container.getAttr === 'function') return ref.container.getAttr(ref.key);
    } catch {}
    return readObjectValue(ref.container, ref.key);
  }

  function setObjectValue(obj, key, value) {
    if (!obj || !key) return;
    try {
      if (typeof obj.set === 'function') {
        obj.set(key, value);
        return;
      }
    } catch {}
    obj[key] = value;
  }

  function setRefValue(ref, value) {
    if (!ref?.container) return false;
    try {
      if (ref.type === 'tag-data' && typeof ref.container.setData === 'function') {
        ref.container.setData(ref.key, value);
        return true;
      }
      if (ref.type === 'tag-attr' && typeof ref.container.setAttr === 'function') {
        ref.container.setAttr(ref.key, value);
        return true;
      }
    } catch {}
    setObjectValue(ref.container, ref.key, value);
    return true;
  }

  function stableStringHash(value) {
    let text = '';
    try {
      text = typeof value === 'string' ? value : JSON.stringify(value || '');
    } catch {
      text = String(value || '');
    }
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function currentClipboardRaw() {
    try {
      return localStorage.getItem(CLIPBOARD_KEY) || '';
    } catch {
      return '';
    }
  }

  function safeJsonClone(value) {
    if (!value || typeof value !== 'object') return value || null;
    try {
      return deepCloneJson(value);
    } catch {
      return value;
    }
  }

  function readLayerClipboardDataPreservingClipboard(api, layerId) {
    const previousRaw = currentClipboardRaw();
    let previousClipboard = null;
    try {
      previousClipboard = safeJsonClone(api?.clipboard?.getClipboard?.() || null);
    } catch {}

    try {
      const data = readLayerClipboardData(api, layerId);
      return safeJsonClone(data);
    } catch {
      return null;
    } finally {
      if (previousRaw) restoreClipboardRaw(api, previousRaw);
      else if (previousClipboard) setClipboardData(api, previousClipboard);
      else restoreClipboardRaw(api, '');
    }
  }

  function collectionEntries(collection) {
    if (!collection) return [];
    if (collection instanceof Map) return Array.from(collection.entries());
    if (Array.isArray(collection)) {
      return collection.map((item, index) => [readObjectValue(item, 'id') || index, item]);
    }

    const candidates = [
      readObjectValue(collection, 'map'),
      readObjectValue(collection, 'list'),
      readObjectValue(collection, 'items'),
      readObjectValue(collection, 'values')
    ].filter((item) => item && item !== collection);

    for (const candidate of candidates) {
      const entries = collectionEntries(candidate);
      if (entries.length) return entries;
    }

    try {
      if (typeof collection.serialize === 'function') {
        const serialized = collection.serialize();
        if (serialized && serialized !== collection) {
          const entries = collectionEntries(serialized);
          if (entries.length) return entries;
        }
      }
    } catch {}

    try {
      if (typeof collection.forEach === 'function') {
        const result = [];
        collection.forEach((value, key) => result.push([key, value]));
        if (result.length) return result;
      }
    } catch {}

    if (collection && typeof collection === 'object') return Object.entries(collection);
    return [];
  }

  function classNameValue(item) {
    if (typeof item === 'string' || typeof item === 'number') return String(item).trim();
    const value = readObjectValue(item, 'value')
      || readObjectValue(item, 'name')
      || readObjectValue(item, 'className')
      || readObjectValue(item, 'text');
    return String(constructorDataPayloadValue(value) || '').trim();
  }

  function classNameMapFromLayout(layout) {
    const result = new Map();
    [
      layout?.mainClassNameCollection,
      layout?.designClassNameCollection
    ].forEach((collection) => {
      collectionEntries(collection).forEach(([key, item]) => {
        const id = String(readObjectValue(item, 'id') || key || '').trim();
        const value = classNameValue(item);
        if (id && value) result.set(id, value);
      });
    });
    return result;
  }

  function selectorEntriesFromCollection(collection) {
    return collectionEntries(collection).map(([key, item]) => {
      const rawKey = String(key || '');
      const slashIndex = rawKey.indexOf('/');
      const mediaFromKey = slashIndex > -1 ? rawKey.slice(0, slashIndex) : '';
      const selectorFromKey = slashIndex > -1 ? rawKey.slice(slashIndex + 1) : rawKey;
      const media = String(readObjectValue(item, 'media') || mediaFromKey || 'screen').trim() || 'screen';
      const selectorText = String(
        readObjectValue(item, 'selectorText')
        || readObjectValue(item, 'selector')
        || readObjectValue(item, 'value')
        || selectorFromKey
        || ''
      ).trim();
      const rules = readObjectValue(item, 'rules')
        || readObjectValue(item, 'css')
        || readObjectValue(item, 'style')
        || {};
      return selectorText ? { media, selectorText, rules } : null;
    }).filter(Boolean);
  }

  function selectorEntriesFromLayout(layout) {
    return [
      ...selectorEntriesFromCollection(layout?.mainSelectorCollection),
      ...selectorEntriesFromCollection(layout?.designSelectorCollection)
    ];
  }

  function styleObjectFromRules(rules) {
    const styles = {};
    collectionEntries(rules).forEach(([key, rule]) => {
      const property = normalizeCssPropertyName(readObjectValue(rule, 'name') || key);
      const value = selectorCssValue(rule);
      if (property && value !== '') styles[property] = value;
    });
    return styles;
  }

  function selectorSingleClassName(selectorText) {
    const match = String(selectorText || '').trim().match(/^\.([_a-zA-Z-][_a-zA-Z0-9-]*)$/);
    return match?.[1] || '';
  }

  function isSystemConstructorClass(className) {
    const name = String(className || '').trim();
    return !name
      || CONSTRUCTOR_SYSTEM_CLASS_NAMES.has(name)
      || CONSTRUCTOR_IGNORED_CLASS_CONFLICT_NAMES.has(name)
      || CONSTRUCTOR_UNIQUE_CLASS_RE.test(name);
  }

  function tagClassNamesFromMap(tag, classMap) {
    const result = [];
    const append = (value) => {
      String(value || '').split(/\s+/).forEach((className) => {
        const normalized = className.trim();
        if (normalized && !result.includes(normalized)) result.push(normalized);
      });
    };

    toArrayLike(readObjectValue(tag, 'classNameIds')).forEach((id) => {
      const className = classMap.get(String(id));
      if (className) append(className);
    });
    append(readObjectValue(tag, 'className'));
    append(readObjectValue(tag, 'class'));
    return result;
  }

  function layoutUniqueSelectorCandidates(tag, classMap) {
    const id = String(readObjectValue(tag, 'id') || '').trim();
    const classes = tagClassNamesFromMap(tag, classMap);
    const result = new Set();
    classes.forEach((className) => {
      if (CONSTRUCTOR_UNIQUE_CLASS_RE.test(className)) result.add(`.${className}`);
      if (id && className.endsWith(`--u-${id}`)) result.add(`.${className}`);
    });
    const baseClass = String(readObjectValue(tag, 'className') || constructorBaseClass(constructorTypeFromClipboardTag(tag))).trim();
    if (id && baseClass) result.add(`.${baseClass}--u-${id}`);
    if (id) {
      result.add(`#${id}`);
      if (/_\d+$/.test(id)) {
        const cleanId = id.replace(/_\d+$/, '');
        result.add(`#${cleanId}`);
        if (baseClass) result.add(`.${baseClass}--u-${cleanId}`);
      }
    }
    return result;
  }

  function splitBaseAndMediaStyles(stylesByMedia) {
    const styles = {};
    const mediaStyles = {};
    Object.entries(stylesByMedia || {}).forEach(([media, style]) => {
      if (!style || !Object.keys(style).length) return;
      const normalizedMedia = normalizeConstructorMedia(media);
      if (normalizedMedia === 'screen') Object.assign(styles, style);
      else mediaStyles[normalizedMedia] = Object.assign({}, mediaStyles[normalizedMedia] || {}, style);
    });
    return { styles, mediaStyles };
  }

  function uniqueStylesForTag(layout, tag, classMap) {
    const candidates = layoutUniqueSelectorCandidates(tag, classMap);
    if (!candidates.size) return { styles: {}, mediaStyles: {} };
    const byMedia = {};
    selectorEntriesFromLayout(layout).forEach((entry) => {
      if (!candidates.has(String(entry.selectorText || '').trim())) return;
      const styles = styleObjectFromRules(entry.rules);
      if (!Object.keys(styles).length) return;
      const media = normalizeConstructorMedia(entry.media);
      byMedia[media] = Object.assign({}, byMedia[media] || {}, styles);
    });
    return splitBaseAndMediaStyles(byMedia);
  }

  function classStylesForLayout(layout, usedClasses) {
    const classStyles = {};
    const mediaClassStyles = {};
    const used = new Set(Array.from(usedClasses || []).map((item) => String(item || '').trim()).filter(Boolean));

    selectorEntriesFromLayout(layout).forEach((entry) => {
      const className = selectorSingleClassName(entry.selectorText);
      if (!className || isSystemConstructorClass(className) || (used.size && !used.has(className))) return;
      const styles = styleObjectFromRules(entry.rules);
      if (!Object.keys(styles).length) return;
      const media = normalizeConstructorMedia(entry.media);
      if (media === 'screen') {
        classStyles[className] = Object.assign({}, classStyles[className] || {}, styles);
      } else {
        mediaClassStyles[media] = mediaClassStyles[media] || {};
        mediaClassStyles[media][className] = Object.assign({}, mediaClassStyles[media][className] || {}, styles);
      }
    });

    return { classStyles, mediaClassStyles };
  }

  function constructorTypeFromClipboardTag(tag) {
    const raw = [
      readObjectValue(tag, 'type'),
      readObjectValue(tag, 'widgetName'),
      readObjectValue(tag, 'alias'),
      readObjectValue(tag, 'tagName'),
      readObjectValue(tag, 'className')
    ].map((item) => String(item || '').toLowerCase()).join(' ');
    if (/\b(image2|tt_image|image__img|img|image|picture)\b/.test(raw)) return 'image';
    if (/\b(tt_svg_icon|svg icon|svg-icon|svg)\b/.test(raw)) return 'svg';
    if (/\b(tt_embed|embed|custom code|script|style)\b/.test(raw)) return 'embed';
    if (/\b(tt_link|tt_link_block|link block|link-block|link|button| a )\b/.test(` ${raw} `)) return 'link';
    if (/\b(text|rich_text|rich text|paragraph|heading|h[1-6]|p|span|label|small|strong|em)\b/.test(raw)) return 'text';
    if (/\b(section|header|footer|main|article|aside|nav)\b/.test(raw)) return 'section';
    return 'div';
  }

  function layoutDataValue(tag, key) {
    const direct = readExistingObjectValue(tag, key);
    if (direct.found) return constructorDataPayloadValue(direct.value);
    const containers = [
      readObjectValue(tag, 'data'),
      readObjectValue(tag, 'attr'),
      readObjectValue(tag, 'attrs'),
      readObjectValue(tag, 'attributes')
    ];
    for (const container of containers) {
      if (!container || typeof container !== 'object') continue;
      const found = readExistingObjectValue(container, key);
      if (found.found) return constructorDataPayloadValue(found.value);
    }
    return '';
  }

  function firstPrimitiveValue(candidates) {
    for (const candidate of candidates) {
      const value = constructorDataPayloadValue(candidate);
      if (value === undefined || value === null) continue;
      if (typeof value === 'object') {
        const nested = value.src || value.href || value.url || value.text || value.html || value.value;
        if (nested !== undefined && nested !== null && nested !== '') return String(nested);
        continue;
      }
      const text = String(value);
      if (text !== '') return text;
    }
    return '';
  }

  function layoutTextValue(tag) {
    return firstPrimitiveValue([
      layoutDataValue(tag, 'text'),
      layoutDataValue(tag, 'html'),
      layoutDataValue(tag, 'content'),
      readObjectValue(tag, 'text'),
      readObjectValue(tag, 'html'),
      readObjectValue(tag, 'innerHTML')
    ]);
  }

  function layoutHrefValue(tag) {
    return firstPrimitiveValue([
      layoutDataValue(tag, 'href'),
      layoutDataValue(tag, 'url'),
      readObjectValue(tag, 'href')
    ]);
  }

  function layoutImageSourceValue(tag) {
    return firstPrimitiveValue([
      layoutDataValue(tag, 'image'),
      layoutDataValue(tag, 'src'),
      layoutDataValue(tag, 'url'),
      readObjectValue(tag, 'src'),
      readObjectValue(tag, 'url')
    ]);
  }

  function layoutEmbedCodeValue(tag) {
    return firstPrimitiveValue([
      layoutDataValue(tag, 'embedCode'),
      layoutDataValue(tag, 'embed_code'),
      layoutDataValue(tag, 'code'),
      layoutDataValue(tag, 'html'),
      layoutDataValue(tag, 'text'),
      readObjectValue(tag, 'embedCode'),
      readObjectValue(tag, 'code')
    ]);
  }

  function truncateLayoutValue(value, max = 1800) {
    const text = String(value || '');
    if (text.length <= max) return text;
    return text.slice(0, max) + `…[truncated ${text.length - max} chars]`;
  }

  function layoutAttrsFromTag(tag) {
    const attrs = {};
    const reserved = new Set([
      'text',
      'html',
      'content',
      'href',
      'src',
      'image',
      'url',
      'alt',
      'title',
      'embedCode',
      'embed_code',
      'code',
      'style',
      'class'
    ]);
    [
      readObjectValue(tag, 'attr'),
      readObjectValue(tag, 'attrs'),
      readObjectValue(tag, 'attributes'),
      readObjectValue(tag, 'data')
    ].forEach((container) => {
      if (!container || typeof container !== 'object') return;
      collectionEntries(container).forEach(([key, rawValue]) => {
        const name = String(key || '').trim();
        if (!name || reserved.has(name) || /^on/i.test(name)) return;
        const value = constructorDataPayloadValue(rawValue);
        if (value === undefined || value === null || typeof value === 'object') return;
        const text = String(value);
        if (text !== '') attrs[name] = truncateLayoutValue(text, 400);
      });
    });
    return attrs;
  }

  function clipboardTreeRootId(data) {
    const tags = data?.copiedLayout?.tree?.tags || {};
    const treeRoot = String(data?.copiedLayout?.tree?.root || '').trim();
    if (treeRoot && tags[treeRoot]) return treeRoot;
    const tagId = String(data?.tagID || treeRoot || '').trim();
    if (tagId && tags[tagId]) return tagId;
    const clean = tagId.replace(/_\d+$/, '');
    if (clean && tags[clean]) return clean;
    return treeRoot || clean || tagId || '';
  }

  function clipboardTagById(tags, id) {
    if (!tags || !id) return null;
    const raw = String(id);
    if (tags[raw]) return tags[raw];
    const clean = raw.replace(/_\d+$/, '');
    if (clean && tags[clean]) return tags[clean];
    const entry = Object.entries(tags).find(([key, tag]) => {
      const tagId = String(readObjectValue(tag, 'id') || key || '');
      return tagId === raw || tagId === clean || `${tagId}_0` === raw;
    });
    return entry?.[1] || null;
  }

  function constructorSpecNodeFromClipboardTag(layout, tag, classMap, visitChild) {
    const type = constructorTypeFromClipboardTag(tag);
    const tagId = String(readObjectValue(tag, 'id') || '').trim();
    const sourceTag = normalizeConstructorSourceTag(readObjectValue(tag, 'tagName') || '');
    const classes = tagClassNamesFromMap(tag, classMap).filter((className) => !isSystemConstructorClass(className));
    const uniqueStyles = uniqueStylesForTag(layout, tag, classMap);
    const node = {
      type,
      name: sanitizeTaptopName(readObjectValue(tag, 'name') || readObjectValue(tag, 'alias') || sourceTag || type, type)
    };
    if (tagId) node.id = tagId;
    if (sourceTag) node.sourceTag = sourceTag;
    if (classes.length) node.classes = classes;
    if (Object.keys(uniqueStyles.styles).length) node.styles = uniqueStyles.styles;
    if (Object.keys(uniqueStyles.mediaStyles).length) node.mediaStyles = uniqueStyles.mediaStyles;

    const attrs = layoutAttrsFromTag(tag);
    if (Object.keys(attrs).length) node.attrs = attrs;

    if (type === 'text') {
      const value = truncateLayoutValue(layoutTextValue(tag));
      if (value) {
        if (/<[a-z][\s\S]*>/i.test(value)) node.html = value;
        else node.text = value;
      }
    } else if (type === 'link') {
      const href = truncateLayoutValue(layoutHrefValue(tag), 800);
      if (href) node.href = href;
    } else if (type === 'image') {
      const src = truncateLayoutValue(layoutImageSourceValue(tag), 1200);
      if (src) node.src = src;
      const alt = truncateLayoutValue(firstPrimitiveValue([layoutDataValue(tag, 'alt'), readObjectValue(tag, 'alt')]), 400);
      if (alt) node.alt = alt;
    } else if (type === 'svg') {
      const svg = truncateLayoutValue(constructorSvgMarkupFromTag(tag) || layoutTextValue(tag), 2200);
      if (svg) node.svg = svg;
    } else if (type === 'embed') {
      const embedCode = truncateLayoutValue(layoutEmbedCodeValue(tag), 2200);
      if (embedCode) node.embedCode = embedCode;
    }

    if (!['image', 'svg', 'embed'].includes(type)) {
      const children = getChildIds(tag)
        .map((childId) => visitChild(childId))
        .filter(Boolean);
      if (children.length) node.children = children;
    }
    return node;
  }

  function collectConstructorSpecClasses(node, target = new Set()) {
    if (!node || typeof node !== 'object') return target;
    asArray(node.classes).forEach((className) => {
      const name = String(className || '').trim();
      if (name) target.add(name);
    });
    asArray(node.children).forEach((child) => collectConstructorSpecClasses(child, target));
    return target;
  }

  function constructorNodeHtmlOutline(node, depth = 0, lines = []) {
    if (!node || typeof node !== 'object' || lines.length >= MAX_LAYOUT_CONTEXT_LAYERS) return lines;
    const indent = '  '.repeat(Math.min(depth, 8));
    const tag = node.type === 'text'
      ? (node.sourceTag || 'p')
      : node.type === 'link'
        ? 'a'
        : node.type === 'image'
          ? 'img'
          : node.type === 'svg'
            ? 'svg'
            : node.type === 'embed'
              ? 'embed'
              : node.type === 'section'
                ? 'section'
                : 'div';
    const classText = asArray(node.classes).length ? ` class="${asArray(node.classes).join(' ')}"` : '';
    const nameText = node.name ? ` data-name="${String(node.name).replace(/"/g, '&quot;')}"` : '';
    const content = normalizeText(node.text || textForDisplay(node.html || '') || node.src || node.href || node.embedCode || '')
      .slice(0, MAX_LAYOUT_OUTLINE_TEXT_CHARS);
    const hasChildren = asArray(node.children).length > 0;
    if (tag === 'img') {
      lines.push(`${indent}<img${classText}${nameText} src="${String(node.src || '').slice(0, 120)}">`);
      return lines;
    }
    if (tag === 'svg' || tag === 'embed') {
      lines.push(`${indent}<${tag}${classText}${nameText}>${content || '...'}</${tag}>`);
      return lines;
    }
    if (!hasChildren) {
      lines.push(`${indent}<${tag}${classText}${nameText}>${content}</${tag}>`);
      return lines;
    }
    lines.push(`${indent}<${tag}${classText}${nameText}>${content}`);
    asArray(node.children).forEach((child) => constructorNodeHtmlOutline(child, depth + 1, lines));
    lines.push(`${indent}</${tag}>`);
    return lines;
  }

  function fitLayoutContextSize(context) {
    if (!context) return null;
    let next = context;
    try {
      if (JSON.stringify(next).length <= MAX_LAYOUT_CONTEXT_CHARS) return next;
    } catch {
      return context;
    }
    next = Object.assign({}, context, {
      classStyles: {},
      mediaClassStyles: {},
      htmlOutline: String(context.htmlOutline || '').slice(0, 9000),
      truncated: true
    });
    try {
      if (JSON.stringify(next).length <= MAX_LAYOUT_CONTEXT_CHARS) return next;
    } catch {
      return next;
    }
    next.htmlOutline = String(next.htmlOutline || '').slice(0, 3000);
    return next;
  }

  function buildLayoutContextFromClipboardData(data) {
    const layout = data?.copiedLayout;
    const tags = layout?.tree?.tags || {};
    const rootId = clipboardTreeRootId(data);
    const rootTag = clipboardTagById(tags, rootId);
    if (!layout || !rootTag) return null;

    const classMap = classNameMapFromLayout(layout);
    const seen = new Set();
    let layerCount = 0;
    let truncated = false;
    const visit = (idOrTag) => {
      if (layerCount >= MAX_LAYOUT_CONTEXT_LAYERS) {
        truncated = true;
        return null;
      }
      const tag = typeof idOrTag === 'object' ? idOrTag : clipboardTagById(tags, idOrTag);
      const tagId = String(readObjectValue(tag, 'id') || idOrTag || '').replace(/_\d+$/, '');
      if (!tag || !tagId || seen.has(tagId)) return null;
      seen.add(tagId);
      layerCount += 1;
      return constructorSpecNodeFromClipboardTag(layout, tag, classMap, visit);
    };

    const root = visit(rootTag);
    if (!root) return null;
    const usedClasses = collectConstructorSpecClasses(root);
    const classStyles = classStylesForLayout(layout, usedClasses);
    const htmlOutline = constructorNodeHtmlOutline(root).join('\n');
    const context = {
      format: LAYOUT_CONTEXT_FORMAT,
      root,
      classStyles: classStyles.classStyles,
      mediaClassStyles: classStyles.mediaClassStyles,
      htmlOutline,
      layerCount,
      truncated
    };
    const fitted = fitLayoutContextSize(context);
    fitted.hash = stableStringHash({
      root: fitted.root,
      classStyles: fitted.classStyles,
      mediaClassStyles: fitted.mediaClassStyles,
      truncated: fitted.truncated
    });
    return fitted;
  }

  function layoutRootIds(api) {
    const tree = api?.layout?.tree;
    const result = new Set();
    [
      tree?.root,
      tree?.composed?.root,
      readObjectValue(getRootTag(api), 'id')
    ].forEach((id) => {
      const value = String(id || '').trim();
      if (!value) return;
      result.add(value);
      result.add(value.replace(/_\d+$/, ''));
    });
    return result;
  }

  function isLayoutRootLayer(api, layerIdOrTag) {
    const tag = getOriginalTag(api, layerIdOrTag) || getTagById(api, layerIdOrTag);
    if (tag?.isRoot === true) return true;
    const id = String(readObjectValue(tag, 'id') || layerIdOrTag || '').trim();
    if (!id) return false;
    const roots = layoutRootIds(api);
    return roots.has(id) || roots.has(id.replace(/_\d+$/, ''));
  }

  function buildLiveLayoutClipboardLikeData(api, selectedId, selectedTag = null) {
    const rootTag = selectedTag || getOriginalTag(api, selectedId) || getTagById(api, selectedId);
    const rootId = String(readObjectValue(rootTag, 'id') || selectedId || '').replace(/_\d+$/, '');
    if (!api?.layout?.tree || !rootTag || !rootId) return null;

    const tags = {};
    getTagEntries(api.layout.tree).forEach((entry) => {
      const id = String(readObjectValue(entry.tag, 'id') || entry.id || '').replace(/_\d+$/, '');
      if (id && !tags[id]) tags[id] = entry.tag;
    });
    tags[rootId] = rootTag;

    return {
      copiedLayout: {
        tree: {
          tags,
          root: rootId,
          version: api.layout.tree.version || '3.1.0'
        },
        mainSelectorCollection: api.layout.mainSelectorCollection,
        designSelectorCollection: api.layout.designSelectorCollection,
        mainClassNameCollection: api.layout.mainClassNameCollection,
        designClassNameCollection: api.layout.designClassNameCollection
      },
      action: 'snapshot',
      tagID: rootId,
      isElementInCollection: false
    };
  }

  function buildLiveSelectedLayoutContext(api, selectedId, selectedTag = null) {
    return buildLayoutContextFromClipboardData(buildLiveLayoutClipboardLikeData(api, selectedId, selectedTag));
  }

  function buildSelectedLayoutContext(api, selectedId, selectedTag = null) {
    if (!api?.layout || !selectedId) return null;
    if (isLayoutRootLayer(api, selectedTag || selectedId)) {
      return buildLiveSelectedLayoutContext(api, selectedId, selectedTag);
    }
    const data = readLayerClipboardDataPreservingClipboard(api, selectedId);
    return buildLayoutContextFromClipboardData(data) || buildLiveSelectedLayoutContext(api, selectedId, selectedTag);
  }

  function toArrayLike(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      if (typeof value.toArray === 'function') return value.toArray();
    } catch {}
    try {
      if (typeof value.toJS === 'function') {
        const next = value.toJS();
        return Array.isArray(next) ? next : Object.values(next || {});
      }
    } catch {}
    try {
      if (typeof value[Symbol.iterator] === 'function') return Array.from(value);
    } catch {}
    try {
      if (typeof value.size === 'number' && typeof value.get === 'function') {
        return Array.from({ length: value.size }, (_, index) => value.get(index));
      }
    } catch {}
    return [];
  }

  function getTagEntries(tree) {
    const entries = [];
    const seen = new Set();
    const seenTags = new WeakSet();
    const add = (tag, id) => {
      if (!tag || typeof tag !== 'object') return;
      const key = String(id || readObjectValue(tag, 'id') || entries.length);
      if (seen.has(key) || seenTags.has(tag)) return;
      seen.add(key);
      seenTags.add(tag);
      entries.push({ id: key, tag });
    };
    const addCollection = (collection) => {
      if (!collection) return;
      if (collection instanceof Map) {
        collection.forEach((tag, id) => add(tag, id));
        return;
      }
      if (typeof collection.forEach === 'function') {
        try {
          collection.forEach((tag, id) => add(tag, id));
          return;
        } catch {}
      }
      if (typeof collection === 'object') Object.entries(collection).forEach(([id, tag]) => add(tag, id));
    };

    addCollection(readObjectValue(tree, 'tags'));
    addCollection(readObjectValue(tree, 'composed'));
    addCollection(readObjectValue(tree, 'map'));
    if (typeof tree?.forEach === 'function') {
      try {
        tree.forEach((tag, id) => add(tag, id));
      } catch {}
    }

    return entries;
  }

  function addIdentityVariants(target, value, seenObjects = new WeakSet()) {
    if (value && typeof value === 'object') {
      if (seenObjects.has(value)) return;
      seenObjects.add(value);
      ['id', 'tagID', 'tagId', 'nodeId', 'layerId', 'elementId', 'key', 'value'].forEach((key) => {
        addIdentityVariants(target, readObjectValue(value, key), seenObjects);
      });
      return;
    }

    const text = String(value || '').trim();
    if (!text) return;
    target.add(text);
    target.add(text.toLowerCase());
    const withoutInstanceSuffix = text.replace(/_\d+$/, '');
    if (withoutInstanceSuffix && withoutInstanceSuffix !== text) {
      target.add(withoutInstanceSuffix);
      target.add(withoutInstanceSuffix.toLowerCase());
    }
  }

  function identitySetHas(target, value) {
    const aliases = new Set();
    addIdentityVariants(aliases, value);
    for (const alias of aliases) {
      if (target.has(alias)) return true;
    }
    return false;
  }

  function getIdentityMapValue(target, value) {
    const aliases = new Set();
    addIdentityVariants(aliases, value);
    for (const alias of aliases) {
      if (target.has(alias)) return target.get(alias);
    }
    return null;
  }

  function addIdentityMapValue(target, value, entry) {
    const aliases = new Set();
    addIdentityVariants(aliases, value);
    aliases.forEach((alias) => target.set(alias, entry));
  }

  function getParentId(tag) {
    const parent = readObjectValue(tag, 'parent')
      || readObjectValue(tag, 'parentId')
      || readObjectValue(tag, 'parentID')
      || readObjectValue(tag, 'parent_id');
    if (!parent) return '';
    if (typeof parent === 'string' || typeof parent === 'number') return String(parent);
    return String(readObjectValue(parent, 'id') || readObjectValue(parent, 'tagID') || readObjectValue(parent, 'tagId') || '');
  }

  function getChildIds(tag) {
    const childValues = [];
    const append = (value) => {
      if (!value) return;
      if (typeof value === 'string' || typeof value === 'number') childValues.push(String(value));
      else {
        const id = readObjectValue(value, 'id') || readObjectValue(value, 'tagID') || readObjectValue(value, 'tagId');
        if (id) childValues.push(String(id));
      }
    };

    [
      readObjectValue(tag, 'children'),
      readObjectValue(tag, 'childrens'),
      readObjectValue(tag, 'items')
    ].forEach((children) => {
      const list = toArrayLike(children);
      if (list.length) list.forEach(append);
      else if (Array.isArray(children)) children.forEach(append);
      else if (children && typeof children === 'object') Object.values(children).forEach(append);
    });

    return childValues;
  }

  function getOriginalId(api, id) {
    return api?.events?.getOriginalID?.(id) || id || '';
  }

  function getTagById(api, id) {
    const tree = api?.layout?.tree;
    if (!tree || !id) return null;

    const originalId = getOriginalId(api, id);
    try {
      if (tree.composed?.has?.(id)) return tree.composed.get(id);
      if (tree.composed?.has?.(originalId)) return tree.composed.get(originalId);
      if (tree.has?.(originalId)) return tree.get(originalId);
      if (tree.has?.(id)) return tree.get(id);
      return tree.composed?.get?.(id) || tree.composed?.get?.(originalId) || tree.get?.(originalId) || tree.get?.(id) || null;
    } catch {
      return null;
    }
  }

  function getOriginalTag(api, tag) {
    const tree = api?.layout?.tree;
    const id = typeof tag === 'string' ? tag : readObjectValue(tag, 'id');
    if (!tree || !id) return tag || null;

    const originalId = getOriginalId(api, id);
    try {
      if (tree.has?.(originalId)) return tree.get(originalId);
      return tree.get?.(originalId) || tag || null;
    } catch {
      return tag || null;
    }
  }

  function getRootTag(api = getTaptopApi()) {
    const tree = api?.layout?.tree;
    const rootId = tree?.composed?.root || tree?.root || '';
    return getTagById(api, rootId) || tree?.composed?.get?.(rootId) || tree?.get?.(rootId) || null;
  }

  function setTagClassNameIds(tag, classNameIds) {
    if (!tag) return false;
    const next = Array.from(new Set((classNameIds || []).filter(Boolean)));
    try {
      tag.classNameIds = next;
      return true;
    } catch {
      return false;
    }
  }

  function getSelectedIdentityValues(api, selectedTag = null) {
    const selected = api?.runtime?.selected;
    const values = new Set();
    addIdentityVariants(values, selected);
    try {
      addIdentityVariants(values, api?.events?.getOriginalID?.(selected));
    } catch {}
    if (selectedTag) {
      ['id', 'tagID', 'tagId', 'nodeId', 'layerId', 'elementId', 'key'].forEach((key) => {
        addIdentityVariants(values, readObjectValue(selectedTag, key));
      });
    }
    return Array.from(values);
  }

  function getSelectedTag(api) {
    const selected = api?.runtime?.selected;
    const tree = api?.layout?.tree;
    if (!selected || !tree) return null;

    const selectedIds = getSelectedIdentityValues(api);
    try {
      for (const id of selectedIds) {
        if (tree.has?.(id)) return tree.get(id);
        if (tree.composed?.has?.(id)) return tree.composed.get(id);
        const tag = tree.get?.(id) || tree.composed?.get?.(id);
        if (tag) return tag;
      }
    } catch {}

    if (selected && typeof selected === 'object' && (
      readObjectValue(selected, 'id')
      || readObjectValue(selected, 'tagName')
      || readObjectValue(selected, 'type')
    )) {
      return selected;
    }

    const entries = getTagEntries(tree);
    return entries.find((entry) => (
      entry.tag === selected
      || identitySetHas(selectedIds, entry.id)
      || identitySetHas(selectedIds, readObjectValue(entry.tag, 'id'))
    ))?.tag || null;
  }

  function getTagLabel(tag, fallbackId = '') {
    return String(
      readObjectValue(tag, 'name')
      || readObjectValue(tag, 'alias')
      || readObjectValue(tag, 'title')
      || readObjectValue(tag, 'tagName')
      || readObjectValue(tag, 'type')
      || fallbackId
      || 'Layer'
    );
  }

  function getTagType(tag) {
    return String(
      readObjectValue(tag, 'tagName')
      || readObjectValue(tag, 'type')
      || readObjectValue(tag, 'widgetName')
      || 'tag'
    );
  }

  function selectedEntries(api) {
    const layout = api?.layout;
    const selected = api?.runtime?.selected;
    const selectedTag = getSelectedTag(api);
    if (!layout?.tree || !selected || !selectedTag) return [];

    const entries = getTagEntries(layout.tree);
    const selectedIds = new Set();
    getSelectedIdentityValues(api, selectedTag).forEach((id) => selectedIds.add(id));

    const byId = new Map();
    const parentById = new Map();
    entries.forEach((entry) => {
      addIdentityMapValue(byId, entry.id, entry);
      const tagId = readObjectValue(entry.tag, 'id');
      if (tagId) addIdentityMapValue(byId, tagId, entry);
    });

    entries.forEach((entry) => {
      const parentId = getParentId(entry.tag);
      if (parentId) parentById.set(String(entry.id), parentId);
      getChildIds(entry.tag).forEach((childId) => {
        if (!parentById.has(childId)) parentById.set(childId, entry.id);
      });
    });

    const isSelectedEntry = (entry) => (
      entry.tag === selectedTag
      || identitySetHas(selectedIds, entry.id)
      || identitySetHas(selectedIds, readObjectValue(entry.tag, 'id'))
    );

    const selectedList = entries.filter(isSelectedEntry);
    const result = new Set(selectedList);

    entries.forEach((entry) => {
      if (result.has(entry)) return;
      const seen = new Set();
      let parentId = parentById.get(String(entry.id)) || getParentId(entry.tag);
      while (parentId && !seen.has(parentId)) {
        seen.add(parentId);
        if (identitySetHas(selectedIds, parentId)) {
          result.add(entry);
          return;
        }
        const parentEntry = getIdentityMapValue(byId, parentId);
        parentId = parentEntry ? (parentById.get(String(parentEntry.id)) || getParentId(parentEntry.tag)) : '';
      }
    });

    if (!result.size) {
      result.add({
        id: String(readObjectValue(selectedTag, 'id') || selected),
        tag: selectedTag
      });
    }

    return Array.from(result);
  }

  function isTextContainer(value) {
    const type = String(readObjectValue(value, 'type') || readObjectValue(value, 'tagName') || '').toUpperCase();
    let hasValue = Object.prototype.hasOwnProperty.call(value || {}, 'value');
    try {
      if (!hasValue && typeof value?.get === 'function') hasValue = value.get('value') !== undefined;
    } catch {}
    return /(HTML|STRING|TEXT|RICH)/.test(type) && hasValue;
  }

  function isLikelyContentKey(key) {
    const normalized = String(key)
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/-/g, '_');
    return /(^|_)(text|title|subtitle|headline|description|caption|content|html|rich|label|alt|button|body)(_|$)/i.test(normalized);
  }

  function shouldSkipKey(key) {
    return /^(id|parent|children|className|classNameIds|widgetName|widgetExportSettings|can|dataAccess|dataAccessPath|dataSource|type|tagName|src|href|image_id|ver_id|filename|ext|size|name|alias|key|key\?)$/i.test(String(key));
  }

  function shouldSkipObjectWalk(key, value) {
    const keyText = String(key || '');
    if (!keyText || keyText[0] === '_' || keyText[0] === '$') return true;
    if (/^(key|key\?|values_|data_|hasMap_|dehancer|enhancer|equals|interceptors_|changeListeners_)$/i.test(keyText)) return true;
    const ctor = String(value?.constructor?.name || '');
    if (/Reaction|Atom|ComputedValue/i.test(ctor)) return true;
    return false;
  }

  function getObjectEntriesForTextWalk(obj) {
    if (obj instanceof Map) return Array.from(obj.entries());
    const ctor = String(obj?.constructor?.name || '');
    if (/Map/i.test(ctor) && typeof obj?.forEach === 'function') {
      try {
        const entries = [];
        obj.forEach((value, key) => entries.push([key, value]));
        if (entries.length) return entries;
      } catch {}
    }
    return Object.entries(obj);
  }

  function isLayerMetadataText(text, meta, field = '') {
    const normalized = normalizeText(textForDisplay(text) || text).toLowerCase();
    if (!normalized) return false;
    const metaValues = [
      meta?.tagId,
      meta?.layerName,
      meta?.layerType,
      field
    ].map((value) => normalizeText(value).toLowerCase()).filter(Boolean);

    if (metaValues.includes(normalized)) return true;
    if (normalized.length > 64) return false;
    return /(^|\.)((tag_?)?id|key|name|alias|type|tagname|layername|classname|widgetname)$/i.test(String(field || ''));
  }

  function textsMatchForApply(left, right) {
    const leftText = normalizeText(textForDisplay(left) || left);
    const rightText = normalizeText(textForDisplay(right) || right);
    return !!leftText && !!rightText && leftText === rightText;
  }

  function stripCssUrl(value) {
    let source = String(value || '').trim();
    const match = source.match(/^url\(([\s\S]+)\)$/i);
    if (match) {
      source = match[1].trim().replace(/^['"]|['"]$/g, '');
    }
    return source;
  }

  function parseDataImageUrl(value) {
    const match = String(value || '').trim().match(/^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i);
    if (!match) return null;
    return {
      mimeType: match[1].toLowerCase(),
      data: match[2].replace(/\s+/g, ''),
      dataUrl: String(value || '').trim()
    };
  }

  function normalizeImageSourceUrl(value) {
    const source = stripCssUrl(value);
    if (!source) return '';
    if (/^data:image\//i.test(source)) return source;
    try {
      return new URL(source, location.href).href;
    } catch {
      return source;
    }
  }

  function imageMimeFromSource(source, fallback = '') {
    const type = String(fallback || '').split(';')[0].trim().toLowerCase();
    if (type.startsWith('image/')) return type;
    const clean = stripCssUrl(source).split(/[?#]/)[0].toLowerCase();
    if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
    if (clean.endsWith('.png')) return 'image/png';
    if (clean.endsWith('.webp')) return 'image/webp';
    if (clean.endsWith('.gif')) return 'image/gif';
    if (clean.endsWith('.svg')) return 'image/svg+xml';
    return 'image/png';
  }

  function imageExtFromMime(mimeType) {
    const type = String(mimeType || '').toLowerCase();
    if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
    if (type.includes('webp')) return 'webp';
    if (type.includes('gif')) return 'gif';
    if (type.includes('svg')) return 'svg';
    return 'png';
  }

  function isLikelyImageSource(value) {
    const source = stripCssUrl(value);
    if (!source) return false;
    if (/^data:image\//i.test(source)) return true;
    if (/^https?:\/\//i.test(source) || /^\/\//.test(source) || source[0] === '/') return true;
    return /\.(png|jpe?g|webp|gif|svg)([?#].*)?$/i.test(source);
  }

  function firstImageValue(value) {
    if (!value || typeof value !== 'object') return value;
    if (value.src || value.filename || value.image_id) return value;
    return value.ru || value.en || value.value || value;
  }

  function getImageInfoFromValue(value, api = null) {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') {
      if (!isLikelyImageSource(value)) return null;
      const sourceUrl = normalizeImageSourceUrl(value);
      return {
        sourceUrl,
        mimeType: imageMimeFromSource(sourceUrl),
        width: 0,
        height: 0,
        raw: value
      };
    }
    if (typeof value !== 'object') return null;

    if (String(value.type || '').toLowerCase() === 'image2') {
      return getImageInfoFromValue(firstImageValue(value.value), api);
    }

    const localized = firstImageValue(value);
    if (localized !== value) return getImageInfoFromValue(localized, api);

    const src = value.src || value.url || value.href || '';
    const filename = value.filename || '';
    let sourceUrl = src || '';
    if (!sourceUrl && filename) {
      try {
        const imagesDir = api?.events?.getGlobalVar?.('images_dir', false) || api?.events?.getGlobalVar?.('IMAGES_DIR', false) || '';
        sourceUrl = imagesDir ? String(imagesDir) + String(filename) : String(filename);
      } catch {
        sourceUrl = String(filename);
      }
    }
    if (!sourceUrl) return null;
    if (!isLikelyImageSource(sourceUrl) && !filename && !value.image_id) return null;
    sourceUrl = normalizeImageSourceUrl(sourceUrl);
    return {
      sourceUrl,
      mimeType: imageMimeFromSource(sourceUrl, value.mimeType || value.type || ''),
      width: Number(value.image_width || value.width || 0) || 0,
      height: Number(value.image_height || value.height || 0) || 0,
      raw: value
    };
  }

  function collectTextRefs(entries) {
    const refs = [];
    const slotMap = new WeakMap();
    const directTextKeys = [
      'value',
      'text',
      'textContent',
      'innerText',
      'content',
      'html',
      'innerHTML',
      'richText',
      'subtitle',
      'headline',
      'description',
      'caption',
      'alt',
      'buttonText'
    ];
    const directObjectKeys = ['data', 'attrs', 'attributes', 'props', 'properties', 'options', 'settings'];

    const hasSlot = (container, key) => {
      if (!container || typeof container !== 'object') return false;
      let keys = slotMap.get(container);
      if (!keys) {
        keys = new Set();
        slotMap.set(container, keys);
      }
      const normalizedKey = String(key);
      if (keys.has(normalizedKey)) return true;
      keys.add(normalizedKey);
      return false;
    };

    const addRef = (container, key, value, meta, path, refOverride = null) => {
      const text = String(value || '');
      if (!text.trim()) return;
      if (isLayerMetadataText(text, meta, path.join('.'))) return;
      if (hasSlot(container, key)) return;
      refs.push({
        id: 'txt_' + (refs.length + 1),
        tagId: meta.tagId,
        layerName: meta.layerName,
        layerType: meta.layerType,
        field: path.join('.'),
        text,
        promptText: textForDisplay(text) || text,
        previewText: textForDisplay(text) || text,
        ref: refOverride || { type: 'model', container, key }
      });
    };

    const addTextValueRefs = (container, key, value, meta, path, refOverride = null) => {
      if (typeof value === 'string') {
        addRef(container, key, value, meta, path, refOverride);
        return;
      }
      if (!value || typeof value !== 'object') return;
      ['ru', 'en'].forEach((lang) => {
        const langValue = readObjectValue(value, lang);
        if (typeof langValue === 'string') {
          addRef(value, lang, langValue, meta, path.concat(lang));
        }
      });
    };

    entries.forEach((entry) => {
      const meta = {
        tagId: String(readObjectValue(entry.tag, 'id') || entry.id),
        layerName: getTagLabel(entry.tag, entry.id),
        layerType: getTagType(entry.tag)
      };
      const seen = new WeakSet();

      const visit = (obj, path = [], parentKey = '', depth = 0) => {
        if (!obj || typeof obj !== 'object' || depth > 9) return;
        if (seen.has(obj)) return;
        seen.add(obj);

        if (isTextContainer(obj)) {
          const current = readObjectValue(obj, 'value');
          addTextValueRefs(obj, 'value', current, meta, path.concat('value'));
          return;
        }

        const children = getObjectEntriesForTextWalk(obj);
        children.forEach(([childKey, child]) => {
          const childKeyText = String(childKey);
          const canTreatAsTextField = isLikelyContentKey(childKeyText)
            || (childKeyText === 'value' && isLikelyContentKey(parentKey));
          if (canTreatAsTextField) {
            addTextValueRefs(obj, childKey, child, meta, path.concat(childKey));
            if (typeof child === 'string') return;
            if (child && typeof child === 'object' && (
              typeof readObjectValue(child, 'ru') === 'string'
              || typeof readObjectValue(child, 'en') === 'string'
            )) {
              return;
            }
          }
          if (typeof child === 'string') {
            return;
          }
          if (shouldSkipKey(childKey)) return;
          if (shouldSkipObjectWalk(childKey, child)) return;
          if (child && typeof child === 'object') {
            visit(child, path.concat(childKey), childKey, depth + 1);
          }
        });
      };

      directTextKeys.forEach((key) => {
        const slot = readTagSlot(entry.tag, key);
        if (!slot.found) return;
        const value = slot.value;
        if (value === undefined || value === null || value === '') return;
        if ((key === 'title' || key === 'label') && normalizeText(value) === normalizeText(meta.layerName)) return;
        addTextValueRefs(slot.ref.container, slot.ref.key, value, meta, [meta.tagId, key], slot.ref);
      });
      directObjectKeys.forEach((key) => {
        const slot = readTagSlot(entry.tag, key);
        const value = slot.value;
        if (value && typeof value === 'object') visit(value, [meta.tagId, key], key, 1);
      });
      visit(entry.tag, [meta.tagId]);
    });

    return refs;
  }

  function isImageLayerTag(tag) {
    if (!tag) return false;
    if (tag.isImage || tag.isImageImg || tag.isBothImage || tag.isSvgImage) return true;
    const type = String(getTagType(tag) || '').toLowerCase();
    const widgetName = String(readObjectValue(tag, 'widgetName') || '').toLowerCase();
    const tagName = String(readObjectValue(tag, 'tagName') || '').toLowerCase();
    return /(^|_)(tt_)?image(_+img)?$/.test(type)
      || /(^|_)(tt_)?image(_+img)?$/.test(widgetName)
      || tagName === 'img';
  }

  function collectImageRefs(entries, api = null) {
    const refs = [];
    const seenSources = new Set();
    const directImageKeys = ['image', 'src', 'poster', 'backgroundImage', 'background-image'];
    const directObjectKeys = ['data', 'attrs', 'attributes', 'props', 'properties', 'options', 'settings'];

    const addRef = (value, meta, path) => {
      const info = getImageInfoFromValue(value, api);
      if (!info?.sourceUrl) return;
      const dedupeKey = info.sourceUrl.toLowerCase();
      if (seenSources.has(dedupeKey)) return;
      seenSources.add(dedupeKey);
      refs.push({
        id: 'img_' + (refs.length + 1),
        tagId: meta.tagId,
        layerName: meta.layerName,
        layerType: meta.layerType,
        field: path.join('.'),
        sourceUrl: info.sourceUrl,
        mimeType: info.mimeType,
        width: info.width,
        height: info.height
      });
    };

    entries.forEach((entry) => {
      const meta = {
        tagId: String(readObjectValue(entry.tag, 'id') || entry.id),
        layerName: getTagLabel(entry.tag, entry.id),
        layerType: getTagType(entry.tag)
      };
      const seen = new WeakSet();

      const visit = (obj, path = [], depth = 0) => {
        if (!obj || typeof obj !== 'object' || depth > 7) return;
        if (seen.has(obj)) return;
        seen.add(obj);

        if (String(readObjectValue(obj, 'type') || '').toLowerCase() === 'image2') {
          addRef(obj, meta, path);
          return;
        }

        getObjectEntriesForTextWalk(obj).forEach(([key, child]) => {
          const keyText = String(key || '');
          const childPath = path.concat(key);
          if (directImageKeys.includes(keyText) || /(^|_)(image|src|poster)(_|$)/i.test(keyText)) {
            addRef(child, meta, childPath);
          }
          if (!child || typeof child !== 'object') return;
          if (shouldSkipObjectWalk(keyText, child)) return;
          visit(child, childPath, depth + 1);
        });
      };

      directImageKeys.forEach((key) => {
        const slot = readTagSlot(entry.tag, key);
        if (slot.found) addRef(slot.value, meta, [meta.tagId, key]);
      });
      directObjectKeys.forEach((key) => {
        const slot = readTagSlot(entry.tag, key);
        if (slot.value && typeof slot.value === 'object') visit(slot.value, [meta.tagId, key], 1);
      });
      visit(entry.tag, [meta.tagId]);
    });

    return refs;
  }

  function collectMatchingTextRefs(entries, targetText) {
    const refs = [];
    const seenRefs = new Set();
    const target = normalizeText(textForDisplay(targetText) || targetText);
    if (!target) return refs;
    const directTextKeys = [
      'value',
      'text',
      'textContent',
      'innerText',
      'content',
      'html',
      'innerHTML',
      'richText',
      'subtitle',
      'headline',
      'description',
      'caption',
      'alt',
      'buttonText',
      'title'
    ];
    const directObjectKeys = ['data', 'attrs', 'attributes', 'props', 'properties', 'options', 'settings'];
    const maxVisits = 220;
    let visits = 0;

    const shouldSkipMatchingKey = (key) => {
      const keyText = String(key || '');
      return keyText[0] === '_' || keyText[0] === '$' || /_$/.test(keyText);
    };

    const addRef = (container, key, value, meta, path, refOverride = null) => {
      if (typeof value !== 'string' || !textsMatchForApply(value, targetText)) return;
      if (isLayerMetadataText(value, meta, path.join('.'))) return;
      const ref = refOverride || { type: 'model', container, key };
      const dedupeKey = [ref.type, path.join('.'), String(key)].join(':');
      if (seenRefs.has(dedupeKey)) return;
      seenRefs.add(dedupeKey);
      refs.push({
        id: 'txt_' + (refs.length + 1),
        tagId: meta.tagId,
        layerName: meta.layerName,
        layerType: meta.layerType,
        field: path.join('.'),
        text: value,
        promptText: textForDisplay(value) || value,
        previewText: textForDisplay(value) || value,
        ref
      });
    };

    const addTextValueRefs = (container, key, value, meta, path, refOverride = null) => {
      if (typeof value === 'string') {
        addRef(container, key, value, meta, path, refOverride);
        return;
      }
      if (!value || typeof value !== 'object') return;
      ['ru', 'en'].forEach((lang) => {
        const langValue = readObjectValue(value, lang);
        if (typeof langValue === 'string') {
          addRef(value, lang, langValue, meta, path.concat(lang));
        }
      });
    };

    const canWalkObject = (key, value) => {
      if (!value || typeof value !== 'object') return false;
      try {
        if (value instanceof Node || value instanceof Window || value instanceof Document) return false;
      } catch {}
      const keyText = String(key || '');
      if (keyText === 'parent' || keyText === 'ownerDocument') return false;
      if (shouldSkipMatchingKey(keyText)) return false;
      const ctor = String(value?.constructor?.name || '');
      if (/Reaction|Atom|ComputedValue|HTMLElement|HTMLDocument|Window|Event/i.test(ctor)) return false;
      return true;
    };

    const getLimitedEntries = (obj) => {
      if (!obj || typeof obj !== 'object') return [];
      try {
        if (obj instanceof Map) return Array.from(obj.entries()).slice(0, 80);
      } catch {}
      const ctor = String(obj?.constructor?.name || '');
      if (/Map/i.test(ctor) && typeof obj?.forEach === 'function') {
        const result = [];
        try {
          obj.forEach((value, key) => {
            if (result.length < 80) result.push([key, value]);
          });
        } catch {}
        return result;
      }
      const keys = directTextKeys.concat(directObjectKeys, ['ru', 'en']);
      const result = [];
      keys.forEach((key) => {
        const existing = readExistingObjectValue(obj, key);
        if (existing.found) result.push([key, existing.value]);
      });
      return result;
    };

    for (const entry of entries) {
      if (refs.length || visits >= maxVisits) break;
      const meta = {
        tagId: String(readObjectValue(entry.tag, 'id') || entry.id),
        layerName: getTagLabel(entry.tag, entry.id),
        layerType: getTagType(entry.tag)
      };
      const seen = new WeakSet();

      const visit = (obj, path = [], depth = 0) => {
        if (refs.length || visits >= maxVisits) return;
        visits += 1;
        if (!obj || typeof obj !== 'object' || depth > 4) return;
        if (seen.has(obj)) return;
        seen.add(obj);

        if (isTextContainer(obj)) {
          addRef(obj, 'value', readObjectValue(obj, 'value'), meta, path.concat('value'));
        }

        for (const [childKey, child] of getLimitedEntries(obj)) {
          if (refs.length || visits >= maxVisits) break;
          const childPath = path.concat(childKey);
          if (shouldSkipMatchingKey(childKey)) continue;
          if (typeof child === 'string') {
            addRef(obj, childKey, child, meta, childPath);
            continue;
          }
          if (canWalkObject(childKey, child)) visit(child, childPath, depth + 1);
        }
      };

      directTextKeys.forEach((key) => {
        if (refs.length) return;
        const slot = readTagSlot(entry.tag, key);
        if (!slot.found) return;
        addTextValueRefs(slot.ref.container, slot.ref.key, slot.value, meta, [meta.tagId, key], slot.ref);
      });

      directObjectKeys.forEach((key) => {
        if (refs.length) return;
        const slot = readTagSlot(entry.tag, key);
        if (!slot.found || !canWalkObject(key, slot.value)) return;
        visit(slot.value, [meta.tagId, key], 1);
      });

      visit(entry.tag, [meta.tagId]);
    }

    return refs;
  }

  function findModelTextRefByText(entries, text) {
    const directRef = collectTextRefs(entries).find((ref) => ref?.ref?.container && (
      textsMatchForApply(ref.text, text)
      || textsMatchForApply(ref.promptText, text)
      || textsMatchForApply(ref.previewText, text)
    ));
    if (directRef) return directRef;
    return collectMatchingTextRefs(entries, text).find((ref) => ref?.ref?.container) || null;
  }

  function addElementClassIdentityIds(target, element) {
    let className = '';
    try {
      className = element.getAttribute?.('class') || String(element.className || '');
    } catch {}

    String(className).replace(/(?:^|\s)[a-z]+--(?:u|s\d+)-([a-zA-Z0-9_-]+)/g, (_, id) => {
      addIdentityVariants(target, id);
      return _;
    });
  }

  function getElementPossibleIds(element) {
    const ids = new Set();
    const add = (value) => addIdentityVariants(ids, value);

    ['id', 'data-id', 'data-tag-id', 'data-tagid', 'data-node-id', 'data-layer-id', 'data-element-id', 'data-tt-id'].forEach((name) => {
      try {
        add(element.getAttribute?.(name));
      } catch {}
    });

    try {
      Object.values(element.dataset || {}).forEach(add);
    } catch {}

    addElementClassIdentityIds(ids, element);
    return ids;
  }

  function getElementViewportRect(element, frameRect = null) {
    const rect = element.getBoundingClientRect();
    if (!frameRect) return rect;
    const frame = element.ownerDocument?.defaultView?.frameElement;
    const scaleX = frame?.offsetWidth ? frameRect.width / frame.offsetWidth : 1;
    const scaleY = frame?.offsetHeight ? frameRect.height / frame.offsetHeight : 1;
    return {
      left: rect.left * scaleX + frameRect.left,
      top: rect.top * scaleY + frameRect.top,
      right: rect.right * scaleX + frameRect.left,
      bottom: rect.bottom * scaleY + frameRect.top,
      width: rect.width * scaleX,
      height: rect.height * scaleY
    };
  }

  function isCanvasTextElement(element, rect) {
    if (!element || element.nodeType !== 1) return false;
    if (element.closest?.(
      '#' + PANEL_ID
      + ', .tt-design-mode-right-panel'
      + ', .tt-right-panel'
      + ', .right-panel-popup'
      + ', .tt-layers'
      + ', .tt-panel'
      + ', .tt-dropdown'
      + ', .tt-tooltip'
      + ', [class*="right-panel"]'
    )) return false;
    if (rect.width < 2 || rect.height < 2) return false;
    if (rect.right < 0 || rect.bottom < 0 || rect.left > window.innerWidth || rect.top > window.innerHeight) return false;
    try {
      const style = element.ownerDocument?.defaultView?.getComputedStyle(element) || getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    } catch {}
    return !!textForDisplay(element.textContent);
  }

  function collectSelectedDomTextInDocument(doc, selectedIds, frameRect = null) {
    const selector = [
      '[id]',
      '[data-id]',
      '[data-tag-id]',
      '[data-tagid]',
      '[data-node-id]',
      '[data-layer-id]',
      '[data-element-id]',
      '[data-tt-id]',
      '[class*="--u-"]',
      '[class*="--s1-"]',
      '[class*="--s2-"]'
    ].join(', ');
    const matches = [];

    try {
      doc.querySelectorAll(selector).forEach((element) => {
        const elementIds = getElementPossibleIds(element);
        const isMatch = Array.from(elementIds).some((id) => selectedIds.has(id));
        if (!isMatch) return;

        const rect = getElementViewportRect(element, frameRect);
        if (!isCanvasTextElement(element, rect)) return;

        const text = textForDisplay(element.textContent);
        if (!text) return;
        matches.push({
          text,
          area: Math.max(1, rect.width * rect.height)
        });
      });
    } catch {}

    return matches;
  }

  function findSelectedDomText(api, selectedTag) {
    const selectedIds = new Set(getSelectedIdentityValues(api, selectedTag));
    if (!selectedIds.size) return '';
    const meta = {
      tagId: String(readObjectValue(selectedTag, 'id') || ''),
      layerName: getTagLabel(selectedTag),
      layerType: getTagType(selectedTag)
    };

    const matches = collectSelectedDomTextInDocument(document, selectedIds);
    document.querySelectorAll('iframe').forEach((frame) => {
      try {
        const doc = frame.contentDocument;
        if (!doc) return;
        matches.push(...collectSelectedDomTextInDocument(doc, selectedIds, frame.getBoundingClientRect()));
      } catch {}
    });

    return matches
      .filter((item) => !isLayerMetadataText(item.text, meta, 'dom'))
      .sort((a, b) => a.text.length - b.text.length || a.area - b.area)[0]?.text || '';
  }

  function buildRightPanelTextRef(selectedTag, selectedId, entries = []) {
    const control = findRightPanelTextControl();
    if (!control) return null;

    const text = String(control.value || '');
    if (!text.trim()) return null;
    const modelRef = findModelTextRefByText(entries, text);

    return {
      id: 'txt_1',
      tagId: String(readObjectValue(selectedTag, 'id') || selectedId),
      layerName: getTagLabel(selectedTag, selectedId),
      layerType: getTagType(selectedTag),
      field: modelRef?.field || 'Текст',
      text,
      promptText: text,
      previewText: text,
      ref: modelRef?.ref || { type: 'right-panel-textarea' }
    };
  }

  function buildDomTextRef(api, selectedTag, selectedId, entries = []) {
    const text = findSelectedDomText(api, selectedTag);
    if (!text.trim()) return null;
    const modelRef = findModelTextRefByText(entries, text);

    return {
      id: 'txt_1',
      tagId: String(readObjectValue(selectedTag, 'id') || selectedId),
      layerName: getTagLabel(selectedTag, selectedId),
      layerType: getTagType(selectedTag),
      field: modelRef?.field || 'Холст',
      text,
      promptText: text,
      previewText: text,
      ref: modelRef?.ref || { type: 'dom-text' }
    };
  }

  function buildSelectedImageContext(api, selectedTag, selectedId, entries = []) {
    const imageRefs = collectImageRefs(entries, api);
    const selectedLooksLikeImage = isImageLayerTag(selectedTag);
    if (!selectedLooksLikeImage) return null;

    const image = imageRefs[0] || null;
    if (!image?.sourceUrl) return null;

    const normalizedSelectedId = String(readObjectValue(selectedTag, 'id') || selectedId);
    return {
      mode: 'image',
      selectedId: normalizedSelectedId,
      selectionKey: [
        'image',
        normalizedSelectedId,
        entries.length,
        image.sourceUrl,
        image.width || 0,
        image.height || 0
      ].join(':'),
      layerName: getTagLabel(selectedTag, normalizedSelectedId),
      layerType: getTagType(selectedTag),
      entriesCount: entries.length,
      image,
      refs: [],
      refsById: new Map(),
      promptTexts: []
    };
  }


  function makePromptTexts(refs) {
    const result = [];
    let total = 0;

    for (const ref of refs) {
      if (result.length >= MAX_PROMPT_TEXTS || total >= MAX_TOTAL_TEXT_CHARS) break;
      const remaining = MAX_TOTAL_TEXT_CHARS - total;
      const source = String(ref.promptText || ref.previewText || ref.text || '');
      const text = source.slice(0, Math.min(MAX_TEXT_CHARS, remaining));
      total += text.length;
      result.push({
        id: ref.id,
        layer: ref.layerName,
        type: ref.layerType,
        field: ref.field,
        text
      });
    }

    return result;
  }

  function buildSelectedContext() {
    const api = getTaptopApi();
    const selected = api?.runtime?.selected;
    const selectedTag = getSelectedTag(api);
    if (!api?.layout || !selected || !selectedTag) return null;

    const entries = selectedEntries(api);
    const selectedId = String(readObjectValue(selectedTag, 'id') || selected);
    const isRoot = isLayoutRootLayer(api, selectedTag);
    const layout = buildSelectedLayoutContext(api, selectedId, selectedTag);
    const layoutHash = layout?.hash || '';
    const imageContext = buildSelectedImageContext(api, selectedTag, selected, entries);
    if (imageContext) {
      imageContext.isRoot = isRoot;
      imageContext.layout = layout;
      imageContext.selectionKey = [imageContext.selectionKey, layoutHash].filter(Boolean).join(':');
      return imageContext;
    }

    const rightPanelRef = buildRightPanelTextRef(selectedTag, selected, entries);
    let refs = rightPanelRef ? [rightPanelRef] : collectTextRefs(entries);
    if (!refs.length) {
      const domRef = buildDomTextRef(api, selectedTag, selected, entries);
      if (domRef) refs = [domRef];
    }
    const refsById = new Map(refs.map((ref) => [ref.id, ref]));
    const textSignature = refs
      .map((ref) => normalizeText(ref.promptText || ref.previewText || ref.text).slice(0, 80))
      .join('|');
    return {
      selectedId,
      selectionKey: [selectedId, entries.length, refs.length, textSignature, layoutHash].join(':'),
      layerName: getTagLabel(selectedTag, selectedId),
      layerType: getTagType(selectedTag),
      entriesCount: entries.length,
      isRoot,
      layout,
      refs,
      refsById,
      promptTexts: makePromptTexts(refs)
    };
  }

  function refreshSelectedContext(options = {}) {
    const next = buildSelectedContext();
    const previousKey = state.selectedContext?.selectionKey || '';
    const nextKey = next?.selectionKey || '';
    if (options.force || previousKey !== nextKey) {
      state.selectedContext = next;
      renderLayerChip();
    }
    if (options.announce) {
      if (next) addSystemMessage(`Связан слой: ${next.layerName}`);
      else addSystemMessage('Слой не выбран');
    }
    return next;
  }

  function refreshSelectedContextSafe(options = {}) {
    try {
      return refreshSelectedContext(options);
    } catch (error) {
      console.error('Taptop Enhancer AI context refresh error:', error);
      return state.selectedContext || null;
    }
  }

  function renderLayerChip() {
    const chip = state.panel?.querySelector('[data-role="layer-chip"]');
    if (!chip) return;
    const context = state.selectedContext;
    renderQuickActions(state.panel, context);
    syncModelSelects(getProviderModel(state.settings.provider, currentModelMode()), currentModelMode());
    if (state.isBuilderMode && !context) {
      chip.className = 'tt-enhancer-ai-panel__layer is-builder';
      chip.innerHTML = [
        '<span class="tt-enhancer-ai-panel__layer-main">',
        '  <span class="tt-enhancer-ai-panel__layer-icon">' + iconSvg('layers') + '</span>',
        '  <span class="tt-enhancer-ai-panel__layer-name">Режим конструктора</span>',
        '</span>',
        '<span class="tt-enhancer-ai-panel__layer-meta">слой не нужен</span>'
      ].join('');
      return;
    }
    if (!context) {
      chip.className = 'tt-enhancer-ai-panel__layer is-empty';
      chip.innerHTML = '<span class="tt-enhancer-ai-panel__layer-main"><span class="tt-enhancer-ai-panel__layer-icon">' + iconSvg('layers') + '</span><span class="tt-enhancer-ai-panel__layer-name">Слой не выбран</span></span>';
      return;
    }
    chip.className = 'tt-enhancer-ai-panel__layer';
    chip.innerHTML = [
      '<span class="tt-enhancer-ai-panel__layer-main">',
      '  <span class="tt-enhancer-ai-panel__layer-icon">' + iconSvg('layers') + '</span>',
      '  <span class="tt-enhancer-ai-panel__layer-name"></span>',
      '</span>',
      '<span class="tt-enhancer-ai-panel__layer-meta"></span>'
    ].join('');
    chip.querySelector('.tt-enhancer-ai-panel__layer-name').textContent = context.layerName;
    const layoutCount = Number(context.layout?.layerCount || 0) || 0;
    const layoutText = layoutCount
      ? `структура ${layoutCount}`
      : '';
    chip.querySelector('.tt-enhancer-ai-panel__layer-meta').textContent = state.isBuilderMode
      ? ['точка вставки', layoutText].filter(Boolean).join(' · ')
      : context.mode === 'image'
      ? ['изображение', layoutText].filter(Boolean).join(' · ')
      : [
        layoutText,
        `${context.refs.length} ${pluralRu(context.refs.length, 'текст', 'текста', 'текстов')}`
      ].filter(Boolean).join(' + ');
  }

  function renderQuickActions(panel = state.panel, context = state.selectedContext) {
    const quickHost = panel?.querySelector('[data-role="quick-actions"]');
    if (!quickHost) return;

    const mode = state.isBuilderMode ? 'builder' : context?.mode === 'image' ? 'image' : 'text';
    if (quickHost.dataset.mode === mode && quickHost.children.length) return;

    quickHost.dataset.mode = mode;
    quickHost.innerHTML = '';
    const actions = mode === 'builder' ? BUILDER_QUICK_ACTIONS : mode === 'image' ? IMAGE_QUICK_ACTIONS : QUICK_ACTIONS;
    actions.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tt-enhancer-ai-panel__quick-button';
      button.textContent = action.label;
      button.title = action.title;
      button.dataset.prompt = action.prompt;
      if (action.codeAction) button.dataset.codeAction = '1';
      quickHost.appendChild(button);
    });
  }

  function formatFileSize(bytes) {
    const size = Number(bytes) || 0;
    if (size >= 1024 * 1024) return (size / 1024 / 1024).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1) + ' МБ';
    if (size >= 1024) return Math.round(size / 1024) + ' КБ';
    return Math.max(0, Math.round(size)) + ' Б';
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Не удалось прочитать изображение'));
      reader.readAsDataURL(file);
    });
  }

  function updateBuilderImageUi(panel = state.panel) {
    if (!panel) return;
    const image = state.builderImage;
    const chip = panel.querySelector('[data-role="builder-image-chip"]');
    const preview = panel.querySelector('[data-role="builder-image-preview"]');
    const name = panel.querySelector('[data-role="builder-image-name"]');
    const meta = panel.querySelector('[data-role="builder-image-meta"]');
    const uploadButton = panel.querySelector('[data-action="upload-builder-image"]');
    const buildButton = panel.querySelector('[data-action="build-from-image"]');

    if (chip) chip.hidden = !image;
    if (preview) preview.style.backgroundImage = image?.dataUrl ? `url("${image.dataUrl.replace(/"/g, '%22')}")` : '';
    if (name) name.textContent = image?.name || 'Изображение';
    if (meta) {
      const size = image?.size ? formatFileSize(image.size) : '';
      const dimensions = image?.width && image?.height ? `${image.width}x${image.height}` : '';
      meta.textContent = [size, dimensions].filter(Boolean).join(' · ');
    }
    uploadButton?.classList.toggle('is-active', !!image);
    if (buildButton) {
      buildButton.hidden = !state.isBuilderMode;
      buildButton.disabled = state.isLoading || !image;
    }
    scheduleCodeBoxResize(panel);
  }

  function clearBuilderImage(panel = state.panel) {
    state.builderImage = null;
    const input = panel?.querySelector?.('[data-role="builder-image-input"]');
    if (input) input.value = '';
    updateBuilderImageUi(panel);
  }

  async function handleBuilderImageInputChange(event) {
    const input = event.target;
    const panel = input?.closest?.('#' + PANEL_ID) || state.panel;
    const file = input?.files?.[0] || null;
    if (!file) return;

    const fileType = String(file.type || '').trim();
    const fileName = String(file.name || '').trim();
    const isImageFile = fileType.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(fileName);
    if (!isImageFile) {
      addErrorMessage('Выберите файл изображения');
      input.value = '';
      return;
    }
    if (file.size > BUILDER_IMAGE_MAX_BYTES) {
      addErrorMessage('Изображение слишком большое. Максимум ' + formatFileSize(BUILDER_IMAGE_MAX_BYTES) + '.');
      input.value = '';
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const parsed = parseDataImageUrl(dataUrl);
      if (!parsed?.mimeType || !parsed?.data) throw new Error('Не удалось подготовить изображение');
      const dimensions = await measureImage(dataUrl);
      state.builderImage = {
        name: file.name || 'image',
        size: file.size || parsed.data.length,
        mimeType: parsed.mimeType,
        data: parsed.data,
        dataUrl,
        width: dimensions.width || 0,
        height: dimensions.height || 0
      };
      if (!state.isBuilderMode) setBuilderMode(true);
      updateBuilderImageUi(panel);
    } catch (error) {
      state.builderImage = null;
      updateBuilderImageUi(panel);
      addErrorMessage(error?.message || 'Не удалось загрузить изображение');
    } finally {
      if (input) input.value = '';
    }
  }

  function startSelectionSync() {
    if (state.selectionTimer) return;
    state.selectionTimer = setInterval(() => {
      if (state.isOpen && !state.isLoading) refreshSelectedContextSafe();
    }, SELECTION_SYNC_INTERVAL_MS);
  }

  function stopSelectionSync() {
    clearInterval(state.selectionTimer);
    state.selectionTimer = 0;
    clearSelectionWarmup();
  }

  function clearSelectionWarmup() {
    state.selectionWarmupTimers.forEach((timer) => clearTimeout(timer));
    state.selectionWarmupTimers = [];
  }

  function scheduleSelectionWarmup() {
    clearSelectionWarmup();
    [180, 420, 800, 1300].forEach((delay) => {
      const timer = setTimeout(() => {
        state.selectionWarmupTimers = state.selectionWarmupTimers.filter((item) => item !== timer);
        if (state.isOpen) refreshSelectedContextSafe({ force: true });
      }, delay);
      state.selectionWarmupTimers.push(timer);
    });
  }

  async function waitForTextContext(maxWaitMs = 900) {
    const started = Date.now();
    let context = refreshSelectedContextSafe({ force: true });
    while (state.isOpen && (!context || !context.refs.length) && Date.now() - started < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, 120));
      context = refreshSelectedContextSafe({ force: true });
    }
    return context;
  }

  function setLoading(isLoading) {
    state.isLoading = !!isLoading;
    state.panel?.classList.toggle('is-loading', state.isLoading);
    state.panel?.querySelectorAll([
      '[data-role="composer"] button',
      '[data-role="composer"] input',
      '[data-role="composer"] textarea',
      '[data-role="composer"] select',
      '[data-role="settings"] button',
      '[data-role="settings"] input',
      '[data-role="settings"] select',
      '[data-role="rules-settings"] button',
      '[data-role="rules-settings"] textarea'
    ].join(', ')).forEach((control) => {
      control.disabled = state.isLoading;
    });
    if (!state.isLoading) {
      syncChangeCardStates();
      updateBuilderImageUi(state.panel);
    }
  }

  function messagesRoot() {
    return state.panel?.querySelector('[data-role="messages"]') || null;
  }

  function hideEmptyState() {
    state.panel?.querySelector('[data-role="empty"]')?.remove();
  }

  function scrollMessagesToBottom() {
    const root = messagesRoot();
    if (root) root.scrollTop = root.scrollHeight;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function promiseWithTimeout(promise, timeoutMs, errorText) {
    let timer = 0;
    return new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error(errorText)), timeoutMs);
      Promise.resolve(promise)
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }

  async function ensurePuterSdk() {
    if (window.puter?.ai?.chat) return window.puter;
    await requestBridge('loadPuterSdk', {}, { retry: true, timeout: 30000 });
    const startedAt = Date.now();
    while (!window.puter?.ai?.chat && Date.now() - startedAt < 5000) {
      await wait(80);
    }
    if (!window.puter?.ai?.chat) {
      throw new Error('Puter.js загрузился, но window.puter.ai.chat не найден');
    }
    return window.puter;
  }

  async function ensurePuterAuth(puter) {
    if (!puter?.auth?.isSignedIn || !puter?.auth?.signIn) return;
    let signedIn = false;
    try {
      signedIn = !!puter.auth.isSignedIn();
    } catch {}
    if (signedIn) return;

    await promiseWithTimeout(
      puter.auth.signIn(),
      120000,
      'Puter не завершил авторизацию. Закройте popup, войдите в Puter и отправьте запрос ещё раз.'
    );

    try {
      signedIn = !!puter.auth.isSignedIn();
    } catch {}
    if (!signedIn) {
      throw new Error('Puter всё ещё не видит авторизацию. Попробуйте выйти/войти в Puter или перезагрузить вкладку TapTop.');
    }
  }

  async function ensurePuterSandbox() {
    if (
      state.puterSandboxFrame?.contentWindow &&
      state.puterSandboxFrame.isConnected &&
      state.puterSandboxFrame.src
    ) {
      return state.puterSandboxFrame;
    }

    if (!state.puterSandboxUrl) {
      const result = await requestBridge('getRuntimeUrl', {
        path: 'features/ai-panel/puter-sandbox.html'
      }, { retry: true, timeout: 8000 });
      state.puterSandboxUrl = result?.url || '';
    }
    if (!state.puterSandboxUrl) {
      throw new Error('Не удалось получить URL Puter sandbox');
    }

    document.getElementById(PUTER_SANDBOX_ID)?.remove();
    const iframe = document.createElement('iframe');
    iframe.id = PUTER_SANDBOX_ID;
    iframe.src = state.puterSandboxUrl;
    iframe.title = 'Puter sandbox';
    iframe.tabIndex = -1;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none;left:-9999px;top:-9999px;';

    const loaded = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Puter sandbox не загрузился')), 30000);
      iframe.addEventListener('load', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      iframe.addEventListener('error', () => {
        clearTimeout(timer);
        reject(new Error('Puter sandbox не загрузился'));
      }, { once: true });
    });

    (document.body || document.documentElement).appendChild(iframe);
    state.puterSandboxFrame = iframe;
    await loaded;
    return iframe;
  }

  function readPuterStorageSnapshot() {
    const readStorage = (storage) => {
      const result = {};
      if (!storage) return result;
      try {
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index);
          if (!key || !/puter/i.test(key)) continue;
          const value = storage.getItem(key);
          if (typeof value === 'string' && value.length <= 200000) {
            result[key] = value;
          }
        }
      } catch {}
      return result;
    };

    return {
      local: readStorage(window.localStorage),
      session: readStorage(window.sessionStorage)
    };
  }

  async function requestPuterSandbox(payload) {
    const iframe = await ensurePuterSandbox();
    const target = iframe.contentWindow;
    if (!target) throw new Error('Puter sandbox недоступен');
    if (!state.puterSdkCode) {
      const sdk = await requestBridge('fetchPuterSdk', {}, { retry: true, timeout: 30000 });
      state.puterSdkCode = String(sdk?.code || '');
      state.puterSdkSourceUrl = String(sdk?.sourceUrl || 'https://js.puter.com/v2/');
    }
    if (!state.puterSdkCode) throw new Error('Не удалось загрузить Puter SDK');

    const id = uid('puter');
    const timeoutMs = Math.min(130000, Math.max(10000, Number(payload?.timeoutMs || 70000) + 10000));
    return new Promise((resolve, reject) => {
      let done = false;
      const cleanup = () => {
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
      };
      const finish = (callback, value) => {
        if (done) return;
        done = true;
        cleanup();
        callback(value);
      };
      const onMessage = (event) => {
        if (event.source !== target) return;
        const message = event.data;
        if (!message || message.source !== PUTER_SANDBOX_RESPONSE_SOURCE || message.id !== id) return;
        if (message.ok) finish(resolve, message.result || null);
        else finish(reject, new Error(message.error || 'Puter sandbox error'));
      };
      const timer = setTimeout(() => {
        finish(reject, new Error('Puter sandbox не ответил'));
      }, timeoutMs);
      window.addEventListener('message', onMessage);
      target.postMessage({
        source: PUTER_SANDBOX_REQUEST_SOURCE,
        id,
        payload,
        sdkCode: state.puterSdkCode,
        sdkSourceUrl: state.puterSdkSourceUrl,
        storageSnapshot: readPuterStorageSnapshot()
      }, '*');
    });
  }

  function normalizePuterRole(role) {
    return role === 'model' || role === 'assistant' ? 'assistant' : role === 'system' ? 'system' : 'user';
  }

  function puterInlineMedia(part) {
    const inlineData = part?.inlineData || part?.inline_data;
    const mimeType = String(inlineData?.mimeType || inlineData?.mime_type || '').trim();
    const data = String(inlineData?.data || '').trim();
    if (!mimeType.startsWith('image/') || !data) return null;
    const dataUrl = `data:${mimeType};base64,${data}`;
    try {
      if (typeof File !== 'function' || typeof atob !== 'function') return dataUrl;
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const extension = mimeType.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'png';
      return new File([bytes], `taptop-image.${extension}`, { type: mimeType });
    } catch {
      return dataUrl;
    }
  }

  function puterTextFromParts(parts) {
    return (Array.isArray(parts) ? parts : [])
      .map((part) => String(part?.text || '').trim())
      .filter(Boolean)
      .join('\n');
  }

  function puterMessagesFromPayload(payload) {
    const messages = [];
    const systemText = String(payload?.systemInstruction || '').trim();
    if (systemText) messages.push({ role: 'system', content: systemText });

    (Array.isArray(payload?.contents) ? payload.contents : []).forEach((item) => {
      const role = normalizePuterRole(item?.role);
      const parts = Array.isArray(item?.parts) ? item.parts : [];
      const content = [];
      parts.forEach((part) => {
        const text = String(part?.text || '').trim();
        if (text) content.push({ type: 'text', text });
      });
      if (!content.length) return;
      messages.push({
        role,
        content: content.length === 1 ? content[0].text : content
      });
    });

    return messages;
  }

  function puterPromptFromPayload(payload) {
    const parts = [];
    const systemText = String(payload?.systemInstruction || '').trim();
    if (systemText) parts.push(systemText);
    (Array.isArray(payload?.contents) ? payload.contents : []).forEach((item) => {
      const text = puterTextFromParts(item?.parts);
      if (text) parts.push(text);
    });
    return parts.join('\n\n').trim();
  }

  function puterMediaFromPayload(payload) {
    const contents = Array.isArray(payload?.contents) ? payload.contents : [];
    for (const item of contents) {
      const parts = Array.isArray(item?.parts) ? item.parts : [];
      for (const part of parts) {
        const media = puterInlineMedia(part);
        if (media) return media;
      }
    }
    return '';
  }

  function puterContentToText(content) {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return content.map((part) => {
      if (typeof part === 'string') return part;
      if (typeof part?.text === 'string') return part.text;
      if (typeof part?.content === 'string') return part.content;
      return '';
    }).filter(Boolean).join('\n');
  }

  function extractPuterResponseText(response) {
    if (typeof response === 'string') return response.trim();
    const values = [
      response?.text,
      response?.message?.text,
      puterContentToText(response?.message?.content),
      puterContentToText(response?.content),
      response?.answer
    ];
    return values
      .map((value) => String(value || '').trim())
      .find(Boolean) || '';
  }

  function addPuterImage(images, image) {
    const url = String(
      image?.image_url?.url ||
      image?.imageUrl?.url ||
      image?.url ||
      image?.src ||
      ''
    ).trim();
    if (!/^data:image\//i.test(url)) return;
    const mimeType = url.split(';')[0].replace(/^data:/i, '') || 'image/png';
    const data = url.includes(',') ? url.split(',').slice(1).join(',') : '';
    images.push({
      mimeType,
      data,
      dataUrl: url
    });
  }

  function extractPuterResponseImages(response) {
    const images = [];
    const sources = [
      response?.images,
      response?.message?.images
    ];
    sources.forEach((items) => {
      (Array.isArray(items) ? items : []).forEach((image) => addPuterImage(images, image));
    });
    const contentItems = [
      ...(Array.isArray(response?.content) ? response.content : []),
      ...(Array.isArray(response?.message?.content) ? response.message.content : [])
    ];
    contentItems.forEach((part) => {
      addPuterImage(images, part?.image || part);
    });
    return images;
  }

  function builderImageInlineData() {
    const image = state.builderImage;
    if (!image?.mimeType || !image?.data) return null;
    if (!String(image.mimeType).startsWith('image/')) return null;
    if (String(image.data).length > Math.ceil(BUILDER_IMAGE_MAX_BYTES * 4 / 3) + 4096) return null;
    return {
      mimeType: image.mimeType,
      data: image.data
    };
  }

  async function requestPuterDirect(payload, model, mode) {
    const puter = await ensurePuterSdk();
    await ensurePuterAuth(puter);

    const options = { model };
    const maxTokens = Number(payload?.maxTokens ?? payload?.max_tokens);
    if (Number.isFinite(maxTokens) && maxTokens > 0) {
      const normalizedMaxTokens = Math.min(65536, Math.max(1, Math.round(maxTokens)));
      options.max_tokens = normalizedMaxTokens;
      options.maxTokens = normalizedMaxTokens;
    }
    const prompt = puterPromptFromPayload(payload);
    const media = puterMediaFromPayload(payload);
    const timeoutMs = Math.min(120000, Math.max(10000, Number(payload?.timeoutMs || 70000) || 70000));
    const request = media
      ? puter.ai.chat(prompt, media, false, options)
      : puter.ai.chat(prompt, options);
    const response = await promiseWithTimeout(
      request,
      timeoutMs,
      'Puter.js не ответил за отведённое время. Модель: ' + model
    );

    return {
      model,
      mode,
      text: extractPuterResponseText(response),
      images: extractPuterResponseImages(response)
    };
  }

  async function sendPuterGenerationRequest(payload) {
    const mode = Array.isArray(payload?.modalities) && payload.modalities.includes('image') ? MODEL_MODES.image : currentModelMode();
    const model = normalizeModelForMode('puter', payload?.model, mode);
    const normalizedPayload = {
      ...payload,
      model
    };

    try {
      return await requestPuterDirect(normalizedPayload, model, mode);
    } catch (error) {
      const message = error?.message || String(error);
      if (!/content security policy|refused to connect|failed to fetch|network error|load failed|csp/i.test(message)) {
        throw error;
      }
      return requestPuterSandbox(normalizedPayload);
    }
  }

  function addSystemMessage(text) {
    const root = messagesRoot();
    if (!root) return;
    hideEmptyState();
    const item = document.createElement('div');
    item.className = 'tt-enhancer-ai-message tt-enhancer-ai-message--system';
    item.textContent = text;
    root.appendChild(item);
    scrollMessagesToBottom();
  }

  function addUserMessage(text, context) {
    const root = messagesRoot();
    if (!root) return;
    hideEmptyState();
    const item = document.createElement('div');
    item.className = 'tt-enhancer-ai-message tt-enhancer-ai-message--user';
    const meta = context
      ? `<span class="tt-enhancer-ai-message__meta-icon">${iconSvg('layers')}</span><span>${escapeHtml(context.layerName)}</span>`
      : '';
    item.innerHTML = meta ? `<div class="tt-enhancer-ai-message__meta">${meta}</div>` : '';
    const body = document.createElement('div');
    body.className = 'tt-enhancer-ai-message__body';
    body.textContent = text;
    item.appendChild(body);
    root.appendChild(item);
    scrollMessagesToBottom();
  }

  function addAssistantThinkingMessage() {
    const root = messagesRoot();
    if (!root) return null;
    hideEmptyState();

    const item = document.createElement('div');
    item.className = 'tt-enhancer-ai-message tt-enhancer-ai-message--assistant tt-enhancer-ai-message--thinking';
    item.setAttribute('aria-live', 'polite');
    item.innerHTML = [
      '<div class="tt-enhancer-ai-message__body">',
      '  <span>Думаю</span>',
      '  <span class="tt-enhancer-ai-message__dots" aria-hidden="true"><span></span><span></span><span></span></span>',
      '</div>'
    ].join('');
    root.appendChild(item);
    scrollMessagesToBottom();
    return item;
  }

  function looksLikeTruncatedJson(value) {
    const text = String(value || '').trim();
    if (!text) return false;
    if (/["[{,:]\s*$/.test(text)) return true;
    let braces = 0;
    let brackets = 0;
    let inString = false;
    let escaped = false;
    for (const char of text) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (char === '{') braces += 1;
      else if (char === '}') braces -= 1;
      else if (char === '[') brackets += 1;
      else if (char === ']') brackets -= 1;
    }
    return inString || braces > 0 || brackets > 0;
  }

  function constructorJsonErrorMessage(rawText) {
    const text = String(rawText || '').trim();
    if (!text) return 'AI не вернул JSON конструктора. Повторите запрос.';
    if (looksLikeTruncatedJson(text)) {
      return 'AI вернул обрезанный JSON конструктора, поэтому слой не собран. Повторите запрос или выберите модель с большим лимитом ответа.';
    }
    return 'AI вернул невалидный JSON конструктора. Повторите запрос короткой командой или смените модель.';
  }

  function addAssistantMessage(rawText, parsed, context, options = {}) {
    const root = messagesRoot();
    if (!root) return;
    hideEmptyState();

    let parsedForResult = coerceAdditiveTextResponse(parsed, options.userPrompt);
    let constructorOptions = options;
    let localConstructorFallbackSource = '';
    if (options.builderMode) {
      const normalizedBuilderResponse = normalizeBuilderConstructorResponse(rawText, parsedForResult, options);
      if (normalizedBuilderResponse?.parsed) {
        parsedForResult = normalizedBuilderResponse.parsed;
        constructorOptions = normalizedBuilderResponse.options || constructorOptions;
        localConstructorFallbackSource = normalizedBuilderResponse.source || '';
      }
    }
    let replaceResult = normalizeReplaceSelectedLayer(parsedForResult, context, options);
    let constructorResult = replaceResult ? null : !options.builderMode && insertLayerNodesFromParsed(parsedForResult).length
      ? null
      : normalizeConstructorResult(parsedForResult, constructorOptions);
    if (options.builderMode && !constructorResult?.clipboardData && options.layoutCode) {
      const fallbackParsed = localConstructorParsedFromCode(options);
      const fallbackResult = fallbackParsed ? normalizeConstructorResult(fallbackParsed, options) : null;
      if (fallbackResult?.clipboardData) {
        parsedForResult = fallbackParsed;
        constructorOptions = options;
        constructorResult = fallbackResult;
        localConstructorFallbackSource = 'code-tabs';
      }
    }

    const replaceElement = options.replaceElement instanceof HTMLElement ? options.replaceElement : null;
    const item = replaceElement || document.createElement('div');
    item.className = 'tt-enhancer-ai-message tt-enhancer-ai-message--assistant';
    item.removeAttribute('aria-live');
    item.innerHTML = '';
    const builderJsonError = !parsedForResult && options.builderMode
      ? constructorJsonErrorMessage(rawText)
      : '';
    const fallbackMessage = localConstructorFallbackSource === 'code-tabs'
      ? 'AI вернул невалидный JSON, поэтому слой собран локально из вкладок конструктора.'
      : localConstructorFallbackSource === 'ai-code'
        ? 'AI сверстал HTML/CSS, слой собран локально для TapTop.'
        : localConstructorFallbackSource
          ? 'Слой собран локально из запроса AI.'
          : '';
    const messageText = String(
      fallbackMessage
      || parsedForResult?.message
      || parsedForResult?.answer
      || builderJsonError
      || (!parsedForResult ? rawText : '')
      || ''
    ).trim();
    const body = document.createElement('div');
    body.className = 'tt-enhancer-ai-message__body';
    body.textContent = messageText || 'Готово';
    item.appendChild(body);

    if (replaceResult?.error) {
      body.textContent = messageText
        ? `${messageText}\n\n${replaceResult.error}`
        : replaceResult.error;
    } else if (constructorResult?.error) {
      body.textContent = messageText
        ? `${messageText}\n\n${constructorResult.error}`
        : constructorResult.error;
    } else if (replaceResult?.clipboardData) {
      item.appendChild(createReplaceLayerCard(replaceResult, context));
    } else if (constructorResult?.clipboardData) {
      try {
        constructorResult.viewSource = constructorViewSource(rawText, parsedForResult, constructorOptions, constructorResult);
      } catch {
        constructorResult.viewSource = null;
      }
      item.appendChild(createConstructorChangeCard(constructorResult, context));
    } else {
      const changes = normalizeChanges(parsedForResult?.changes, context);
      const insertLayers = normalizeInsertLayers(parsedForResult, context, options);
      const styleChanges = normalizeStyleChanges(parsedForResult, context, options);
      if (changes.length) {
        item.appendChild(createChangeCard(changes, context));
      }
      if (insertLayers?.entries?.length) {
        item.appendChild(createInsertLayersCard(insertLayers, context));
      }
      if (styleChanges.length) {
        item.appendChild(createStyleChangeCard(styleChanges, context));
      }
      if (!changes.length && !insertLayers?.entries?.length && !styleChanges.length && parsed && !messageText) {
        body.textContent = rawText || 'AI провайдер не вернул текст';
      }
    }

    if (!item.isConnected) root.appendChild(item);
    scrollMessagesToBottom();
  }

  function addAssistantImageMessage(rawText, imageChange, context, options = {}) {
    const root = messagesRoot();
    if (!root) return;
    hideEmptyState();

    const replaceElement = options.replaceElement instanceof HTMLElement ? options.replaceElement : null;
    const item = replaceElement || document.createElement('div');
    item.className = 'tt-enhancer-ai-message tt-enhancer-ai-message--assistant';
    item.removeAttribute('aria-live');
    item.innerHTML = '';

    const body = document.createElement('div');
    body.className = 'tt-enhancer-ai-message__body';
    body.textContent = String(rawText || '').trim() || 'Готово, новая версия изображения создана.';
    item.appendChild(body);
    item.appendChild(createImageChangeCard(imageChange, context));

    if (!item.isConnected) root.appendChild(item);
    scrollMessagesToBottom();
  }

  function addErrorMessage(text) {
    const root = messagesRoot();
    if (!root) return;
    hideEmptyState();
    const item = document.createElement('div');
    item.className = 'tt-enhancer-ai-message tt-enhancer-ai-message--error';
    item.textContent = text;
    root.appendChild(item);
    scrollMessagesToBottom();
  }

  function isAdditiveLayerPrompt(value) {
    const text = normalizeText(value).toLowerCase();
    if (!text) return false;
    if (/(замени|заменить|исправ|перепиш|перевед|translate|rewrite|replace|fix)/i.test(text)) return false;
    return /(добав|созда|создай|встав|добавь|add|create|insert)/i.test(text);
  }

  function isWidePrompt(value) {
    return /(на\s+всю\s+ширину|во\s+всю\s+ширину|100\s*%|full\s+width|width\s*100)/i.test(String(value || ''));
  }

  function promptColumnCount(value) {
    const text = normalizeText(value).toLowerCase();
    const numberMatch = text.match(/(?:^|\D)(\d{1,2})\s*(?:колонк|столбц|columns?|cols?)/i)
      || text.match(/(?:колонк|столбц|columns?|cols?)[^\d]{0,20}(\d{1,2})/i);
    if (numberMatch) {
      const count = Number(numberMatch[1]);
      if (Number.isFinite(count) && count > 0 && count <= 12) return count;
    }
    const words = {
      'одну': 1,
      'одна': 1,
      'one': 1,
      'две': 2,
      'два': 2,
      'two': 2,
      'три': 3,
      'трех': 3,
      'трёх': 3,
      'three': 3,
      'четыре': 4,
      'четырех': 4,
      'четырёх': 4,
      'four': 4,
      'пять': 5,
      'пяти': 5,
      'five': 5,
      'шесть': 6,
      'шести': 6,
      'six': 6
    };
    for (const [word, count] of Object.entries(words)) {
      const re = new RegExp(`(?:${word})\\s*(?:колонк|столбц|columns?|cols?)|(?:колонк|столбц|columns?|cols?)\\s*(?:${word})`, 'i');
      if (re.test(text)) return count;
    }
    return 0;
  }

  function isGridPrompt(value) {
    const text = normalizeText(value).toLowerCase();
    return /(grid|грид|сетк|колонк|столбц|columns?|cols?)/i.test(text)
      && !/(таблиц|table)/i.test(text);
  }

  function promptStyleChangeStyles(value) {
    const text = normalizeText(value).toLowerCase();
    const styles = {};
    if (/(по\s+центру|по\s+середине|центрируй|center)/i.test(text)) styles['text-align'] = 'center';
    else if (/(по\s+лев(ому|ый|о)|left)/i.test(text)) styles['text-align'] = 'left';
    else if (/(по\s+прав(ому|ый|о)|right)/i.test(text)) styles['text-align'] = 'right';
    if (isGridPrompt(text)) {
      styles.display = 'grid';
      const columns = promptColumnCount(text);
      if (columns) styles['grid-template-columns'] = `repeat(${columns}, minmax(0, 1fr))`;
    }
    if (isWidePrompt(text)) styles.width = '100%';
    return styles;
  }

  function textInsertNodeFromChange(change) {
    const value = typeof change?.value === 'string' ? change.value.trim() : '';
    if (!value) return null;
    return {
      type: 'text',
      tag: 'p',
      name: 'paragraph',
      text: value
    };
  }

  function coerceAdditiveTextResponse(parsed, userPrompt) {
    if (!isPlainObject(parsed) || !isAdditiveLayerPrompt(userPrompt)) return parsed;
    if (insertLayerNodesFromParsed(parsed).length) return parsed;

    const insertLayers = (Array.isArray(parsed.changes) ? parsed.changes : [])
      .map(textInsertNodeFromChange)
      .filter(Boolean);
    if (!insertLayers.length) return parsed;

    const next = Object.assign({}, parsed, {
      changes: [],
      insertLayers
    });
    const styles = Object.assign(
      {},
      promptStyleChangeStyles(userPrompt),
      normalizeAiStyleChanges(parsed.styleChanges?.[0]?.styles || parsed.style_changes?.[0]?.styles || parsed.styles || {})
    );
    if (Object.keys(styles).length) {
      next.styleChanges = [{ target: 'selected', styles }];
    }
    return next;
  }

  function normalizeChanges(changes, context) {
    if (!Array.isArray(changes) || !context?.refsById) return [];
    return changes.map((change) => {
      const id = String(change?.id || '').trim();
      const ref = context.refsById.get(id);
      const value = typeof change?.value === 'string' ? change.value : '';
      if (!id || !ref) return null;
      if (!value.trim() && String(ref.text || '').trim()) return null;
      return {
        id,
        value,
        before: ref.text,
        beforePreview: ref.previewText || textForDisplay(ref.text) || ref.text,
        valuePreview: textForDisplay(value) || value,
        layerName: ref.layerName,
        field: ref.field,
        refType: ref.ref?.type || 'model'
      };
    }).filter(Boolean);
  }

  function createChangeCard(changes, context) {
    const changeSetId = uid('changes');
    state.changeSets.set(changeSetId, {
      type: 'text',
      context,
      changes,
      originals: [],
      applied: false
    });

    const card = document.createElement('div');
    card.className = 'tt-enhancer-ai-change-card is-expanded';
    card.dataset.changeSetId = changeSetId;

    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'tt-enhancer-ai-change-card__title';
    title.innerHTML = [
      '<span class="tt-enhancer-ai-change-card__title-icon">' + iconSvg('changes') + '</span>',
      '<span>' + changes.length + ' ' + pluralRu(changes.length, 'изменение', 'изменения', 'изменений') + '</span>'
    ].join('');
    title.setAttribute('aria-expanded', 'true');
    title.addEventListener('click', () => {
      const isExpanded = card.classList.toggle('is-expanded');
      title.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    });
    card.appendChild(title);

    const list = document.createElement('div');
    list.className = 'tt-enhancer-ai-change-card__list';
    changes.slice(0, 12).forEach((change) => {
      const row = document.createElement('div');
      row.className = 'tt-enhancer-ai-change-card__item';
      const before = document.createElement('div');
      before.className = 'tt-enhancer-ai-change-card__text is-before';
      before.textContent = change.beforePreview || change.before;
      const after = document.createElement('div');
      after.className = 'tt-enhancer-ai-change-card__text is-after';
      after.textContent = change.valuePreview || change.value;
      row.append(before, after);
      list.appendChild(row);
    });
    if (changes.length > 12) {
      const more = document.createElement('div');
      more.className = 'tt-enhancer-ai-change-card__more';
      more.textContent = `+${changes.length - 12} еще`;
      list.appendChild(more);
    }
    card.appendChild(list);

    const actions = document.createElement('div');
    actions.className = 'tt-enhancer-ai-change-card__actions';
    actions.innerHTML = [
      '<button type="button" class="tt-enhancer-ai-panel__secondary" data-action="undo-changes" data-change-set-id="' + changeSetId + '" disabled>' + iconSvg('undo') + '<span>Отменить</span></button>',
      '<button type="button" class="tt-enhancer-ai-panel__primary" data-action="apply-changes" data-change-set-id="' + changeSetId + '"><span>Применить</span></button>'
    ].join('');
    card.appendChild(actions);
    return card;
  }

  function createImageChangeCard(imageChange, context) {
    const changeSetId = uid('image');
    state.changeSets.set(changeSetId, {
      type: 'image',
      context,
      imageChange,
      applyState: null,
      applied: false
    });

    const card = document.createElement('div');
    card.className = 'tt-enhancer-ai-change-card tt-enhancer-ai-image-card is-expanded';
    card.dataset.changeSetId = changeSetId;

    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'tt-enhancer-ai-change-card__title';
    title.innerHTML = [
      '<span class="tt-enhancer-ai-change-card__title-icon">' + iconSvg('changes') + '</span>',
      '<span>1 изображение</span>'
    ].join('');
    title.setAttribute('aria-expanded', 'true');
    title.addEventListener('click', () => {
      const isExpanded = card.classList.toggle('is-expanded');
      title.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    });
    card.appendChild(title);

    const list = document.createElement('div');
    list.className = 'tt-enhancer-ai-change-card__list';
    const preview = document.createElement('div');
    preview.className = 'tt-enhancer-ai-image-card__preview';

    const before = document.createElement('figure');
    before.className = 'tt-enhancer-ai-image-card__figure';
    before.innerHTML = '<figcaption>Было</figcaption>';
    const beforeImg = document.createElement('img');
    beforeImg.alt = 'Исходное изображение';
    beforeImg.src = imageChange.beforeUrl || context?.image?.sourceUrl || '';
    before.appendChild(beforeImg);

    const after = document.createElement('figure');
    after.className = 'tt-enhancer-ai-image-card__figure';
    after.innerHTML = '<figcaption>Стало</figcaption>';
    const afterImg = document.createElement('img');
    afterImg.alt = 'Сгенерированное изображение';
    afterImg.src = imageChange.dataUrl || '';
    after.appendChild(afterImg);

    preview.append(before, after);
    list.appendChild(preview);
    card.appendChild(list);

    const actions = document.createElement('div');
    actions.className = 'tt-enhancer-ai-change-card__actions';
    actions.innerHTML = [
      '<button type="button" class="tt-enhancer-ai-panel__secondary" data-action="undo-changes" data-change-set-id="' + changeSetId + '" disabled>' + iconSvg('undo') + '<span>Отменить</span></button>',
      '<button type="button" class="tt-enhancer-ai-panel__primary" data-action="apply-changes" data-change-set-id="' + changeSetId + '"><span>Применить</span></button>'
    ].join('');
    card.appendChild(actions);
    return card;
  }

  function insertLayerNodesFromParsed(parsed) {
    if (!isPlainObject(parsed)) return [];
    const candidates = [
      parsed.insertLayers,
      parsed.insert_layers,
      parsed.layersToInsert,
      parsed.addLayers,
      parsed.add_layers,
      parsed.newLayers,
      parsed.new_layers,
      parsed.layers,
      parsed.insertLayer ? [parsed.insertLayer] : null,
      parsed.insert_layer ? [parsed.insert_layer] : null
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate.filter(isPlainObject);
    }
    return [];
  }

  function insertLayerPreviewText(node) {
    const text = String(node?.text ?? node?.html ?? node?.content ?? node?.value ?? '').replace(/\s+/g, ' ').trim();
    const name = sanitizeTaptopName(node?.name || node?.layerName || node?.tag || node?.type || 'Layer', 'Layer');
    return text ? `${name}: ${text.slice(0, 120)}` : name;
  }

  function inferInsertLayerType(node) {
    const explicit = node?.type || node?.tag || node?.element || node?.widget;
    if (explicit) return normalizeConstructorLayerType(explicit);
    const text = String(node?.text ?? node?.html ?? node?.content ?? node?.value ?? '').trim();
    return text ? 'text' : 'div';
  }

  function normalizeInsertLayers(parsed, context, options = {}) {
    if (!context?.selectedId || options.builderMode) return null;
    const nodes = insertLayerNodesFromParsed(parsed);
    if (!nodes.length) return null;

    const rules = effectiveBuilderRules(readRuleInputs(state.panel, 'chat'));
    const entries = nodes.slice(0, 12).map((node) => {
      const type = inferInsertLayerType(node);
      const normalizedNode = Object.assign({}, node, { type });
      if (type === 'text') {
        normalizedNode.sourceTag = normalizeConstructorSourceTag(node.tag || node.sourceTag || node.tagName || node.element) || 'p';
      }
      try {
        const clipboardData = buildConstructorClipboardData({
          name: sanitizeTaptopName(normalizedNode.name || normalizedNode.layerName || normalizedNode.sourceTag || type, 'AI layer'),
          root: normalizedNode
        }, { builderRules: rules });
        const tags = clipboardData?.copiedLayout?.tree?.tags || {};
        const rootTag = tags[clipboardData?.copiedLayout?.tree?.root] || {};
        return {
          clipboardData,
          name: sanitizeTaptopName(rootTag.name || normalizedNode.name || normalizedNode.sourceTag || type, 'AI layer'),
          preview: insertLayerPreviewText(normalizedNode),
          layerCount: Object.keys(tags).length,
          classCount: constructorClipboardClassCount(clipboardData)
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    if (!entries.length) return null;
    return {
      targetId: context.selectedId,
      targetName: context.layerName,
      entries
    };
  }

  function createInsertLayersCard(result, context) {
    const changeSetId = uid('insert');
    state.changeSets.set(changeSetId, {
      type: 'insert',
      context,
      insertLayers: result,
      applyState: null,
      applied: false
    });

    const count = result.entries.length;
    const card = document.createElement('div');
    card.className = 'tt-enhancer-ai-change-card is-expanded';
    card.dataset.changeSetId = changeSetId;

    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'tt-enhancer-ai-change-card__title';
    title.innerHTML = [
      '<span class="tt-enhancer-ai-change-card__title-icon">' + iconSvg('layers') + '</span>',
      '<span>' + count + ' ' + pluralRu(count, 'слой', 'слоя', 'слоев') + ' в ' + escapeHtml(context?.layerName || 'выбранный слой') + '</span>'
    ].join('');
    title.setAttribute('aria-expanded', 'true');
    title.addEventListener('click', () => {
      const isExpanded = card.classList.toggle('is-expanded');
      title.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    });
    card.appendChild(title);

    const list = document.createElement('div');
    list.className = 'tt-enhancer-ai-change-card__list';
    result.entries.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'tt-enhancer-ai-change-card__item';
      const after = document.createElement('div');
      after.className = 'tt-enhancer-ai-change-card__text is-after';
      after.textContent = entry.preview || entry.name;
      row.appendChild(after);
      list.appendChild(row);
    });
    card.appendChild(list);

    const actions = document.createElement('div');
    actions.className = 'tt-enhancer-ai-change-card__actions';
    actions.innerHTML = [
      '<button type="button" class="tt-enhancer-ai-panel__secondary" data-action="undo-changes" data-change-set-id="' + changeSetId + '" disabled>' + iconSvg('undo') + '<span>Отменить</span></button>',
      '<button type="button" class="tt-enhancer-ai-panel__primary" data-action="apply-changes" data-change-set-id="' + changeSetId + '"><span>Добавить</span></button>'
    ].join('');
    card.appendChild(actions);
    return card;
  }

  const AI_STYLE_CHANGE_PROPERTIES = new Set([
    'text-align',
    'color',
    'font-size',
    'font-weight',
    'font-style',
    'line-height',
    'letter-spacing',
    'display',
    'flex-direction',
    'justify-content',
    'align-items',
    'align-content',
    'flex-wrap',
    'row-gap',
    'column-gap',
    'width',
    'height',
    'min-width',
    'max-width',
    'min-height',
    'max-height',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'background-color',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-bottom-right-radius',
    'border-bottom-left-radius',
    'opacity'
  ]);

  function styleChangeNodesFromParsed(parsed) {
    if (!isPlainObject(parsed)) return [];
    const candidates = [
      parsed.styleChanges,
      parsed.style_changes,
      parsed.visualChanges,
      parsed.visual_changes,
      parsed.selectedStyles,
      parsed.selected_styles,
      parsed.styleChange ? [parsed.styleChange] : null,
      parsed.style_change ? [parsed.style_change] : null
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate.filter(Boolean);
      if (isPlainObject(candidate)) return [candidate];
    }
    if (isPlainObject(parsed.styles) || isPlainObject(parsed.style)) {
      return [{ styles: parsed.styles || parsed.style }];
    }
    return [];
  }

  function normalizeAiStyleChanges(styles) {
    const normalized = normalizeStyleObject(styles);
    const result = {};
    Object.entries(normalized).forEach(([property, value]) => {
      if (!AI_STYLE_CHANGE_PROPERTIES.has(property)) return;
      const cssValue = String(value ?? '').trim();
      if (!cssValue) return;
      result[property] = cssValue;
    });
    return result;
  }

  function normalizeStyleChanges(parsed, context, options = {}) {
    if (!context?.selectedId || options.builderMode) return [];
    const promptStyles = promptStyleChangeStyles(options.userPrompt);
    const nodes = styleChangeNodesFromParsed(parsed);
    const sourceNodes = nodes.length ? nodes : Object.keys(promptStyles).length ? [{ styles: promptStyles }] : [];
    return sourceNodes.map((change) => {
      const sourceStyles = isPlainObject(change?.styles) ? change.styles
        : isPlainObject(change?.style) ? change.style
          : change;
      const styles = Object.assign({}, promptStyles, normalizeAiStyleChanges(sourceStyles));
      if (!Object.keys(styles).length) return null;
      return {
        target: 'selected',
        targetId: context.selectedId,
        targetName: context.layerName,
        media: normalizeConstructorMedia(change?.media || change?.breakpoint || 'screen'),
        styles
      };
    }).filter(Boolean);
  }

  function createStyleChangeCard(styleChanges, context) {
    const changeSetId = uid('styles');
    state.changeSets.set(changeSetId, {
      type: 'style',
      context,
      styleChanges,
      originals: [],
      applied: false
    });

    const card = document.createElement('div');
    card.className = 'tt-enhancer-ai-change-card is-expanded';
    card.dataset.changeSetId = changeSetId;

    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'tt-enhancer-ai-change-card__title';
    title.innerHTML = [
      '<span class="tt-enhancer-ai-change-card__title-icon">' + iconSvg('changes') + '</span>',
      '<span>Стили выбранного слоя</span>'
    ].join('');
    title.setAttribute('aria-expanded', 'true');
    title.addEventListener('click', () => {
      const isExpanded = card.classList.toggle('is-expanded');
      title.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    });
    card.appendChild(title);

    const list = document.createElement('div');
    list.className = 'tt-enhancer-ai-change-card__list';
    styleChanges.forEach((change) => {
      Object.entries(change.styles).forEach(([property, value]) => {
        const row = document.createElement('div');
        row.className = 'tt-enhancer-ai-change-card__item';
        const after = document.createElement('div');
        after.className = 'tt-enhancer-ai-change-card__text is-after';
        after.textContent = `${property}: ${value}`;
        row.appendChild(after);
        list.appendChild(row);
      });
    });
    card.appendChild(list);

    const actions = document.createElement('div');
    actions.className = 'tt-enhancer-ai-change-card__actions';
    actions.innerHTML = [
      '<button type="button" class="tt-enhancer-ai-panel__secondary" data-action="undo-changes" data-change-set-id="' + changeSetId + '" disabled>' + iconSvg('undo') + '<span>Отменить</span></button>',
      '<button type="button" class="tt-enhancer-ai-panel__primary" data-action="apply-changes" data-change-set-id="' + changeSetId + '"><span>Применить</span></button>'
    ].join('');
    card.appendChild(actions);
    return card;
  }

  function escapeHtmlForView(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const VIEW_VOID_HTML_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

  function clipboardClassNameMap(clipboardData) {
    const layout = clipboardData?.copiedLayout || {};
    const map = {};
    [layout.mainClassNameCollection?.map, layout.designClassNameCollection?.map].forEach((collection) => {
      if (!isPlainObject(collection)) return;
      Object.values(collection).forEach((item) => {
        if (item && item.id) map[item.id] = item.value;
      });
    });
    return map;
  }

  function viewClassNamesForTag(tag, classMap) {
    const ids = Array.isArray(tag?.classNameIds) ? tag.classNameIds : [];
    const baseClass = String(tag?.className || '');
    return ids
      .map((id) => classMap[id])
      .filter((name) => typeof name === 'string' && name)
      .filter((name) => name !== baseClass && !/--u-/.test(name) && !/^helper--/.test(name));
  }

  function viewTagNameForTag(tag) {
    if (tag?.tagName) return String(tag.tagName).toLowerCase();
    if (tag?.type === 'text') return 'p';
    if (tag?.type === 'tt_link_block') return 'a';
    if (tag?.type === 'tt_svg_icon') return 'span';
    if (tag?.type === 'section') return 'section';
    return 'div';
  }

  function constructorClipboardToHtml(clipboardData) {
    const tree = clipboardData?.copiedLayout?.tree;
    const tags = tree?.tags;
    const rootId = tree?.root;
    if (!isPlainObject(tags) || !rootId || !tags[rootId]) return '';
    const classMap = clipboardClassNameMap(clipboardData);

    const renderTag = (id, depth) => {
      const tag = tags[id];
      if (!tag) return '';
      const pad = '  '.repeat(depth);
      const tagName = viewTagNameForTag(tag);
      const classNames = viewClassNamesForTag(tag, classMap);
      const attrs = [];
      if (classNames.length) attrs.push(`class="${escapeHtmlForView(classNames.join(' '))}"`);
      const href = tag?.data?.href?.value;
      if (tagName === 'a' && href) attrs.push(`href="${escapeHtmlForView(href)}"`);
      const attrText = attrs.length ? ' ' + attrs.join(' ') : '';

      if (tag.type === 'tt_embed') {
        const embed = String(tag.embedCode || '').trim();
        return `${pad}<!-- embed -->\n${embed ? embed.split('\n').map((line) => pad + line).join('\n') + '\n' : ''}`;
      }

      if (tag.type === 'text' || tag.type === 'tt_svg_icon') {
        const value = String(tag?.data?.text?.value || '').trim();
        if (VIEW_VOID_HTML_TAGS.has(tagName)) return `${pad}<${tagName}${attrText}>\n`;
        return `${pad}<${tagName}${attrText}>${value}</${tagName}>\n`;
      }

      if (VIEW_VOID_HTML_TAGS.has(tagName)) return `${pad}<${tagName}${attrText}>\n`;

      const childIds = Array.isArray(tag.children) ? tag.children : [];
      if (!childIds.length) return `${pad}<${tagName}${attrText}></${tagName}>\n`;
      const inner = childIds.map((childId) => renderTag(childId, depth + 1)).join('');
      return `${pad}<${tagName}${attrText}>\n${inner}${pad}</${tagName}>\n`;
    };

    return renderTag(rootId, 0).trim();
  }

  function constructorViewSource(rawText, parsed, options, result) {
    const source = { html: '', css: '', js: '' };
    try {
      const parts = builderCodePartsFromResponse(rawText, parsed);
      if (parts) {
        source.html = String(parts.html || '').trim();
        source.css = String(parts.css || '').trim();
        source.js = String(parts.js || '').trim();
      }
    } catch {}

    if (!source.html) {
      const layoutCode = String(options?.sourceLayoutCode || options?.layoutCode || '').trim();
      if (layoutCode) {
        const split = splitHtmlCodeForTabs(layoutCode, options?.styleCode || '', options?.embedCode || '');
        source.html = split.html || layoutCode;
        if (!source.css) source.css = split.css || '';
        if (!source.js) source.js = split.js || String(options?.embedCode || '').trim();
      }
    }

    if (!source.html && result?.clipboardData) {
      try {
        source.html = constructorClipboardToHtml(result.clipboardData);
      } catch {}
    }

    return source.html || source.css || source.js ? source : null;
  }

  function createConstructorChangeCard(result, context) {
    const changeSetId = uid('constructor');
    const insertTargetId = state.isBuilderMode && context?.selectedId ? context.selectedId : '';
    state.changeSets.set(changeSetId, {
      type: 'constructor',
      context,
      clipboardData: result.clipboardData,
      layerName: result.layerName,
      viewSource: result.viewSource || null,
      applyMode: 'clipboard',
      insertTargetId,
      applyState: null,
      applied: false
    });

    const card = document.createElement('div');
    card.className = 'tt-enhancer-ai-change-card tt-enhancer-ai-constructor-card is-expanded';
    card.dataset.changeSetId = changeSetId;

    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'tt-enhancer-ai-change-card__title';
    title.innerHTML = [
      '<span class="tt-enhancer-ai-change-card__title-icon">' + iconSvg('layers') + '</span>',
      '<span>Слой конструктора</span>'
    ].join('');
    title.setAttribute('aria-expanded', 'true');
    title.addEventListener('click', () => {
      const isExpanded = card.classList.toggle('is-expanded');
      title.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    });
    card.appendChild(title);

    const list = document.createElement('div');
    list.className = 'tt-enhancer-ai-change-card__list';
    const item = document.createElement('div');
    item.className = 'tt-enhancer-ai-change-card__item tt-enhancer-ai-constructor-card__summary';
    item.innerHTML = [
      '<div class="tt-enhancer-ai-constructor-card__name"></div>',
      '<div class="tt-enhancer-ai-constructor-card__meta"></div>'
    ].join('');
    item.querySelector('.tt-enhancer-ai-constructor-card__name').textContent = result.layerName || 'AI component';
    item.querySelector('.tt-enhancer-ai-constructor-card__meta').textContent = [
      `${result.layerCount || 0} ${pluralRu(result.layerCount || 0, 'слой', 'слоя', 'слоев')}`,
      `${result.classCount || 0} ${pluralRu(result.classCount || 0, 'класс', 'класса', 'классов')}`,
      result.embedCount ? `${result.embedCount} Embed` : ''
    ].filter(Boolean).join(' · ');
    list.appendChild(item);
    card.appendChild(list);

    const actions = document.createElement('div');
    actions.className = 'tt-enhancer-ai-change-card__actions';
    actions.innerHTML = [
      '<button type="button" class="tt-enhancer-ai-panel__secondary" data-action="undo-changes" data-change-set-id="' + changeSetId + '" disabled>' + iconSvg('undo') + '<span>Вернуть буфер</span></button>',
      result.viewSource ? '<button type="button" class="tt-enhancer-ai-panel__secondary" data-action="view-html" data-change-set-id="' + changeSetId + '">' + iconSvg('eye') + '<span>Смотреть</span></button>' : '',
      '<button type="button" class="tt-enhancer-ai-panel__primary" data-action="apply-changes" data-change-set-id="' + changeSetId + '"><span>В буфер TapTop</span></button>'
    ].filter(Boolean).join('');
    card.appendChild(actions);
    return card;
  }

  function readFirstOwnKey(obj, keys) {
    if (!isPlainObject(obj)) return undefined;
    for (const key of keys) {
      if (hasOwnKey(obj, key)) return readOwnKey(obj, key);
    }
    return undefined;
  }

  function isReplaceSelectedLayerPrompt(value) {
    return /(передел|пересоб|переверст|замен|обнови\s+структ|измени\s+структ|редизайн|перерис|rebuild|replace|redesign|rework|update\s+structure|change\s+structure)/i.test(String(value || ''));
  }

  function parsedHasExplicitLayerEdits(parsed) {
    if (!isPlainObject(parsed)) return false;
    if (insertLayerNodesFromParsed(parsed).length) return true;
    const textChanges = readFirstOwnKey(parsed, ['changes', 'textChanges', 'text_changes']);
    if (Array.isArray(textChanges) && textChanges.length) return true;
    const styleChanges = readFirstOwnKey(parsed, ['styleChanges', 'style_changes', 'visualChanges', 'visual_changes', 'selectedStyles', 'selected_styles']);
    if (Array.isArray(styleChanges) && styleChanges.length) return true;
    return false;
  }

  function replaceSelectedLayerPayload(parsed, options = {}) {
    const explicit = readFirstOwnKey(parsed, [
      'replaceSelectedLayer',
      'replace_selected_layer',
      'replaceLayer',
      'replace_layer',
      'updatedLayer',
      'updated_layer'
    ]);
    if (explicit !== undefined) return explicit;
    if (!options.builderMode
      && isPlainObject(parsed)
      && (hasOwnKey(parsed, 'constructor') || parsed.root || parsed.layer || Array.isArray(parsed.layers))
      && !parsedHasExplicitLayerEdits(parsed)
      && isReplaceSelectedLayerPrompt(options.userPrompt)) {
      return hasOwnKey(parsed, 'constructor') ? readOwnKey(parsed, 'constructor') : parsed;
    }
    return undefined;
  }

  function constructorSpecFromReplacementPayload(payload) {
    if (!isPlainObject(payload)) return null;
    const nested = readFirstOwnKey(payload, ['constructor', 'builder', 'component', 'tapTop', 'taptop']);
    if (nested && isPlainObject(nested)) return nested;
    if (payload.root || payload.layer || Array.isArray(payload.layers)) return payload;
    if (payload.type || payload.children || payload.text || payload.html || payload.src || payload.href || payload.svg || payload.embedCode) {
      return {
        name: payload.name || payload.layerName || 'updated component',
        root: payload
      };
    }
    return null;
  }

  function constructorClipboardSummary(clipboardData, fallbackName = 'AI component') {
    const tags = clipboardData?.copiedLayout?.tree?.tags || {};
    const rootTag = tags[clipboardData?.copiedLayout?.tree?.root] || tags[getClipboardRootId(clipboardData)] || {};
    return {
      clipboardData,
      layerName: sanitizeTaptopName(rootTag.name || fallbackName, fallbackName),
      layerCount: Object.keys(tags).length,
      classCount: constructorClipboardClassCount(clipboardData),
      embedCount: Object.values(tags).filter((tag) => tag?.type === 'tt_embed').length
    };
  }

  function normalizeReplaceSelectedLayer(parsed, context, options = {}) {
    if (options.builderMode || !context?.selectedId || !isPlainObject(parsed)) return null;
    const payload = replaceSelectedLayerPayload(parsed, options);
    if (payload === undefined) return null;
    if (context.isRoot) {
      return { error: 'Root-слой нельзя заменить целиком. Можно добавить новые дочерние слои внутрь root или выбрать вложенный слой для замены.' };
    }

    const directClipboard = normalizeLayerClipboardPayload(payload)
      || normalizeLayerClipboardPayload(payload?.clipboardData)
      || normalizeLayerClipboardPayload(payload?.clipboard)
      || normalizeLayerClipboardPayload(payload?.layerClipboard);
    if (directClipboard) {
      return constructorClipboardSummary(directClipboard, payload?.name || context.layerName || 'updated component');
    }

    const spec = constructorSpecFromReplacementPayload(payload);
    if (!spec) {
      return { error: 'AI вернул replaceSelectedLayer без корректного root' };
    }

    try {
      const rules = effectiveBuilderRules(readRuleInputs(state.panel, 'chat'));
      const clipboardData = buildConstructorClipboardData(spec, Object.assign({}, options, { builderRules: rules }));
      return constructorClipboardSummary(clipboardData, spec.name || spec.layerName || context.layerName || 'updated component');
    } catch (error) {
      return {
        error: error?.message || 'Не удалось собрать замену выбранного слоя'
      };
    }
  }

  function createReplaceLayerCard(result, context) {
    const changeSetId = uid('replace');
    state.changeSets.set(changeSetId, {
      type: 'replace',
      context,
      clipboardData: result.clipboardData,
      layerName: result.layerName,
      applyState: null,
      applied: false
    });

    const card = document.createElement('div');
    card.className = 'tt-enhancer-ai-change-card tt-enhancer-ai-replace-card is-expanded';
    card.dataset.changeSetId = changeSetId;

    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'tt-enhancer-ai-change-card__title';
    title.innerHTML = [
      '<span class="tt-enhancer-ai-change-card__title-icon">' + iconSvg('changes') + '</span>',
      '<span>Заменить выбранный слой</span>'
    ].join('');
    title.setAttribute('aria-expanded', 'true');
    title.addEventListener('click', () => {
      const isExpanded = card.classList.toggle('is-expanded');
      title.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    });
    card.appendChild(title);

    const list = document.createElement('div');
    list.className = 'tt-enhancer-ai-change-card__list';
    const item = document.createElement('div');
    item.className = 'tt-enhancer-ai-change-card__item tt-enhancer-ai-replace-card__summary';
    item.innerHTML = [
      '<div class="tt-enhancer-ai-replace-card__name"></div>',
      '<div class="tt-enhancer-ai-replace-card__meta"></div>'
    ].join('');
    item.querySelector('.tt-enhancer-ai-replace-card__name').textContent = `${context?.layerName || 'Выбранный слой'} → ${result.layerName || 'AI component'}`;
    item.querySelector('.tt-enhancer-ai-replace-card__meta').textContent = [
      `${result.layerCount || 0} ${pluralRu(result.layerCount || 0, 'слой', 'слоя', 'слоев')}`,
      `${result.classCount || 0} ${pluralRu(result.classCount || 0, 'класс', 'класса', 'классов')}`,
      result.embedCount ? `${result.embedCount} Embed` : ''
    ].filter(Boolean).join(' · ');
    list.appendChild(item);
    card.appendChild(list);

    const actions = document.createElement('div');
    actions.className = 'tt-enhancer-ai-change-card__actions';
    actions.innerHTML = [
      '<button type="button" class="tt-enhancer-ai-panel__secondary" data-action="undo-changes" data-change-set-id="' + changeSetId + '" disabled>' + iconSvg('undo') + '<span>Отменить</span></button>',
      '<button type="button" class="tt-enhancer-ai-panel__primary" data-action="apply-changes" data-change-set-id="' + changeSetId + '"><span>Заменить</span></button>'
    ].join('');
    card.appendChild(actions);
    return card;
  }

  function textSystemInstruction() {
    return [
      'Ты AI помощник для редактирования выбранного слоя конструктора TapTop.',
      'Отвечай только валидным JSON без markdown.',
      'Формат ответа: {"message":"короткий ответ пользователю","changes":[{"id":"txt_1","value":"новый текст"}],"insertLayers":[{"type":"text","tag":"p","name":"paragraph","text":"видимый текст"}],"styleChanges":[{"target":"selected","styles":{"text-align":"center"}}],"replaceSelectedLayer":{"name":"updated component","root":{"type":"div","children":[]},"embedCode":""}}.',
      'В контексте selected_layout приходит выбранный слой как taptop-constructor-spec/v1: дерево root, classes, styles, mediaStyles, classStyles/mediaClassStyles и htmlOutline.',
      'Для правки существующего текста используй changes. Меняй только тексты из массива selected_texts и всегда сохраняй их id.',
      'В value возвращай только видимый пользователю текст, без служебных ключей, HTML-тегов, JSON и пояснений.',
      'Для просьб добавить/создать новый вложенный слой внутри выбранного слоя используй insertLayers. Не отказывайся от добавления структуры: поддерживаются type div, text, link, image, svg, embed.',
      'Если в задач������������ есть "добавь", "создай" или "вставь", не используй changes для замены существующего текста; используй insertLayers для нового дочернего слоя.',
      'Если пользователь просит добавить текст, описание, абзац, заголовок, подпись или ��ругой видимый текст — выбери type "text"; по умолчанию tag "p", для заголовка h1-h6, для короткой inline-подписи span.',
      'Если пользователь просит добавить слой/блок/контейнер и не указал тип и текстовое содержание, по умолчанию выбери type "div".',
      'Если пользователь явно просит слой p, верни {"type":"text","tag":"p","text":"..."}. Для h1-h6/span указывай tag соответственно.',
      'insertLayers должен содержать только новые дочерние слои выбранного слоя, без обертки выбранного слоя.',
      'Для визуальных правок выбранного слоя используй styleChanges. Для "выровни текст по центру" верни {"text-align":"center"}, по ле��ому краю — {"text-align":"left"}, по правому — {"text-align":"right"}.',
      'Для "на всю ширину" или "во всю ширину" добавь в styleChanges {"width":"100%"}.',
      'Для выравнивания содержимого flex-контейнера можно использовать justify-content и align-items, но не меняй display без явной необходимости.',
      'Для полной структурной правки выбранного слоя используй replaceSelectedLayer. В root верни весь новый выбранный слой целиком, а не только добавленные дочерние элементы.',
      'changes — только для текстов, styleChanges — только для стилей выбранного слоя, insertLayers — только новые дочерние слои, replaceSelectedLayer — полная замена выбранного слоя.',
      'Если менять нечего, верни changes: [], insertLayers: [], styleChanges: [] и полезный текст в message.',
      'Сохраняй переносы строк и смысл, если пользователь не попросил иначе.'
    ].join('\n');
  }

  function constructorSystemInstruction() {
    return [
      'Ты AI помощник-разработчик для конструктора TapTop. Твоя задача — переводить обычные HTML/CSS/JS идеи в структуру слоев конструктора.',
      'Отвечай только валидным JSON без markdown.',
      'Ответ всегда должен начинаться символом "{" и заканчиваться символом "}". Не возвращай JSON-фрагменты, массивы верхнего уровня, raw CSS или пояснения вне JSON.',
      'JSON должен быть компактным: без форматирования, без комментариев, без повторения исходного CSS текстом. Не обрывай ответ; если компонент слишком большой, упрости структуру, но верни закрытый валидный JSON.',
      'Формат ответа: {"message":"коротко что создано","constructor":{"name":"component-name","root":{...},"embedCode":"<style>...</style><script>...</script>"}}.',
      'constructor.root — дерево слоев. Каждый слой: {"type":"div|text|link|image|svg|embed","name":"Layer name","classes":["bem-class"],"attrs":{"data-widget":"name"},"styles":{"display":"flex"},"mediaStyles":{"(max-width: 479px)":{"display":"block"}},"children":[...]}.',
      'Никогда не отвечай только CSS вроде display:grid или raw HTML. Даже для короткой задачи возвращай constructor.root.',
      'Для структурных задач создавай реальные дочерние слои, а не только стили контейнера.',
      'Правила перевода: div/section/article -> type "div" (Div Block); текстовые теги h1-h6/p/span -> type "text" и поле text/html; a/button -> type "link" с href и дочерним text; img -> type "image"; svg -> type "svg"; script -> отдельный embedCode.',
      'Для SVG-иконок всегда возвращай type "svg" и поле svg или html с полным inline <svg>...</svg>. Если исходник выглядит как <span class="svg-icon"><svg>...</svg></span>, это один слой type "svg", а не text/span.',
      'Обычные inline style="" и root-селекторы переноси в styles/mediaStyles конкретных слоев.',
      'CSS-правила из исходного <style> не возвращай в JSON как classStyles/mediaClassStyles: расширение само распарсит исходный <style> и перенесет эти стили в классы TapTop.',
      'Сохраняй классы из HTML на слоях. Составные CSS-селекторы из исходного <style> расширение расплющит само.',
      'Не используй shorthand gap в ответе. gap:20px возвращай как row-gap:"20px" и column-gap:"20px"; gap:10px 20px — row-gap:"10px", column-gap:"20px".',
      'В embedCode клади внешние <link rel="stylesheet">, внешние <script src>, в��сь JS и только CSS, который нельзя выразить стилями TapTop: keyframes, CSS-переменные, псевдоклассы/hover, псевдоэлементы, сложные глобальные селекторы, библиотечные служебные классы и JS-зависимые состояния.',
      'Классы указывай без точки, в BEM/читабельном виде. JS должен искать элементы по data-* атрибутам или классам, которые есть в слоях.',
      'Если нужен JS, embedCode должен содержать весь нужный <script>; если нужны внешние библиотеки, сохрани подключения в embedCode. Embed будет создан отдельным скрытым слоем внутри компонента.',
      'Если в prompt есть selected_layer/selected_layout, считай его точкой вставки на холсте: constructor будет добавлен внутрь выбранного слоя. Не возвращай replaceSelectedLayer в builder-mode, если пользователь явно не просит заменить выбранный слой.',
      'Не возвращай raw HTML как финальный результат. Всегда возвращай constructor-spec, который можно собрать в слои TapTop.'
    ].join('\n');
  }

  function builderCodeSystemInstruction() {
    return [
      'Ты AI frontend-верстальщик для конструктора TapTop.',
      'Сначала реши задачу пользователя как обычную HTML/CSS/JS верстку компонента. Расширение само конвертирует результат в JSON слоев TapTop.',
      'Отвечай только валидным JSON без markdown.',
      'Формат ответа: {"message":"коротко что сверстано","html":"...","css":"...","js":""}.',
      'html — только разметка компонента без <html>, <head>, <body>, <style>, <script> и внешних подключений.',
      'css — стили компонента без тега <style>. Используй классы из html; не отвечай только CSS без html.',
      'js — JavaScript без тега <script>. Если нужны внешние CSS/JS подклю��ения, добавь их в начало js как <link rel="stylesheet"> или <script src="..."></script>.',
      'Для любой структурной задачи создавай реальные HTML-элементы, которые затем станут слоями: контейнеры, карточки, колонки, текст, ссылки, изображения, svg.',
      'Не возвращай constructor.root, clipboardData или TapTop JSON на этом шаге. Нужен только frontend-код по вкладкам html/css/js.',
      'Для иконок предпочитай inline <svg> в html. Для интерактива используй классы/data-атрибуты, которые есть в html.'
    ].join('\n');
  }

  function systemInstruction(isBuilderMode = false, options = {}) {
    if (!isBuilderMode) return textSystemInstruction();
    return options.builderCodeMode ? builderCodeSystemInstruction() : constructorSystemInstruction();
  }

  function builderRulesPromptText(rules) {
    const normalized = normalizeBuilderRules(rules);
    if (!builderRulesHaveValue(normalized)) return '';

    const lines = [
      'Правила конвертации из вкладки "Правила". Эти правила имеют приоритет над общими правилами конструктора.'
    ];
    const append = (key, title, instruction) => {
      const value = normalized[key];
      if (!value) return;
      lines.push('', title + ':', value, instruction);
    };

    append(
      'rootSelectors',
      'Root-селекторы',
      'Стили этих селекторов переноси на root-слой constructor.root. Не используй это правило для обычных классов из <style>, если они не перечислены в "Классы > корневой класс слоя".'
    );
    append(
      'rootClassStyles',
      'Классы > корневой класс слоя',
      'Для исходного <style> это правило применит локальный сборщик: стили перечисленных классов попадут в styles/mediaStyles root-слоя. В ответе AI достаточно сохранить классы на слоях.'
    );
    if (normalized.replaceFrom || normalized.replaceTo) {
      lines.push(
        '',
        'Заменить:',
        'Что заменить:',
        normalized.replaceFrom || '',
        'На что заменить:',
        normalized.replaceTo || '',
        'Строки сопоставляются по порядку. Если заменить тег на класс, например h1 -> .t-h1, локальный сборщик заменит CSS-селектор h1 на .t-h1 и добавит класс t-h1 слоям из тегов h1. Если заменить класс на класс, например .container -> .t-container, старый класс container на слоях будет заменен на t-container.'
      );
    }
    append(
      'keepClasses',
      'Классы, которые нужно сохранить',
      'Оставь эти классы на соответствующих слоях, особенно если их ищет JS или библиотека.'
    );
    append(
      'skipClasses',
      'Классы, которые не нужно плодить',
      'Не создавай отдельные классы/слои только ради этих классов; перенеси их смысл в свойства слоя или игнорируй, если они не влияют на результат.'
    );
    append(
      'embedCss',
      'CSS, который допустим в embedCode',
      'Эти сложные CSS-состояния/конструкции можно оставлять в <style> embedCode. Обычные свойства не дублируй между styles/mediaStyles и embedCode.'
    );
    append(
      'styleGuards',
      'Защитные запреты',
      'Не придумывай эти стили, если их нет в исходнике или задаче пользователя. Особенно не добавляй случайные max-width/height со служебными значениями.'
    );
    append(
      'nativeStyles',
      'Обычные стили TapTop',
      'Для этих свойств используй styles/mediaStyles, если стиль пришел из inline/root-селектора или создан вручную. Не используй custom properties для стандартных значений; custom допускается только для calc/var/неподдерживаемых значений.'
    );

    return lines.join('\n');
  }

  function buildUserPrompt(userText, context, options = {}) {
    const layer = context ? {
      id: context.selectedId,
      name: context.layerName,
      type: context.layerType,
      nested_layers: context.entriesCount,
      can_insert_child_layers: true,
      can_style_selected_layer: true,
      can_replace_selected_layer: !!context.layout && !context.isRoot,
      supported_style_changes: ['text-align', 'justify-content', 'align-items', 'color', 'font-size', 'font-weight', 'line-height', 'padding', 'margin'],
      selected_texts: context.promptTexts
    } : null;
    const layout = context?.layout ? Object.assign({}, context.layout, { hash: undefined }) : null;
    const selectedContext = {
      selected_layer: layer,
      selected_layout: layout
    };

    if (options.builderMode) {
      const rulesText = options.builderRulesAlreadyIncluded
        ? ''
        : builderRulesPromptText(options.builderRules);
      if (options.builderCodeMode) {
        return [
          'Задача пользователя:',
          userText,
          '',
          rulesText,
          rulesText ? '' : null,
          'Контекст выбранного слоя для понимания места вставки JSON:',
          JSON.stringify(selectedContext, null, 2),
          '',
          'Сверстай компонент как обычный frontend-код и верни JSON с html, css, js. HTML должен содержать реальную структуру будущих слоев; CSS задает вид этой структуры; JS нужен только если без него компонент не работает. Не возвращай CSS-only, raw HTML вне JSON или constructor.root.'
        ].filter((part) => part !== null).join('\n');
      }
      return [
        'Задача пользователя:',
        userText,
        '',
        rulesText,
        rulesText ? '' : null,
        'Опциональная точка вставки/контекст выбранного слоя JSON:',
        JSON.stringify(selectedContext, null, 2),
        '',
        'Верни цельный JSON с constructor.root. Не возвращай CSS-only, raw HTML или текстовое описание вместо слоя. Если selected_layer не null, компонент бу��ет вставлен вн��т��ь этого слоя на холсте. Если пользователь прислал HTML/CSS/JS, переведи HTML в слои TapTop, inline/root CSS — в styles/mediaStyles, классы сохрани на слоях, JS и внешние подключения — в embedCode. CSS ��ростых классов из исходного <style> не повторяй в JSON: его обработает локальный сборщик.'
      ].filter((part) => part !== null).join('\n');
    }

    return [
      'Задача пользователя:',
      userText,
      '',
      'Контекст выбранного слоя JSON:',
      JSON.stringify(selectedContext, null, 2)
    ].join('\n');
  }

  function buildCodeLayoutPrompt(userText, layoutCode, styleCode = '', embedCode = '', rules = null) {
    const task = String(userText || '').trim() || 'Сверстай по коду';
    const rulesText = builderRulesPromptText(rules);
    const layout = String(layoutCode || '').trim();
    const styles = String(styleCode || '').trim();
    const embed = String(embedCode || '').trim();
    return [
      task,
      '',
      'Переведи исходную верстку из вкладки "Верстка" в constructor.root TapTop.',
      'HTML-структуру из вкладки "Верстка" разложи на слои TapTop.',
      'Inline style="" пе��енеси в styles/mediaStyles соответствующих слоев.',
      'CSS из вкладки "Стили" пользователь присылает без тега <style>. Считай его исходным CSS компонента.',
      'Сохрани классы из HTML на соответствующих слоях, но не возвращай большой classStyles/mediaClassStyles из исходного <style>: сборщик расширения сам перенесет CSS классов из <style> в TapTop-классы.',
      'CSS из вкладки "Стили" и @media в нем тоже обработает сборщик расширения. Если ты добавляешь новые адаптивные стили сверх исходника, используй mediaStyles с breakpoint TapTop: 991px, 767px, 479px.',
      'Составные class-селекторы из исходного CSS сборщик расплющит сам. Если создаешь такие классы вручную, используй BEM-класс на целевом слое: .card-green .stat-number -> card-green__stat-number.',
      'SVG-иконки переноси как слой type "svg" с полным inline <svg>...</svg> в поле svg/html. <span class="svg-icon"><svg>...</svg></span> считается одним SVG-слоем.',
      'gap не возвращай как gap; если задаешь gap вручную, используй row-gap и column-gap.',
      'Не переноси CSS простых классов в root/уникальный класс слоя. Исключение — только классы из правила "Классы > корневой класс слоя".',
      'Код из вкладки "Скрипт" не конвертируй в слои. Помести его целиком в constructor.embedCode.',
      'В constructor.embedCode также оставь внешние <link rel="stylesheet">, внешние <script src>, весь JS и только CSS из вкладки "Стили", который нельзя задать как TapTop-стили.',
      'Сохрани классы/data-атрибуты, нужные для JS, Swiper и навигации.',
      '',
      rulesText,
      '',
      '<TT_LAYOUT_CODE>',
      layout,
      '</TT_LAYOUT_CODE>',
      '',
      '<TT_STYLE_CODE>',
      styles,
      '</TT_STYLE_CODE>',
      '',
      '<TT_EMBED_CODE>',
      embed,
      '</TT_EMBED_CODE>'
    ].filter((part) => part !== '').join('\n');
  }

  function imageCodeSystemInstruction() {
    return [
      'Ты AI верстальщик для конструктора TapTop.',
      'По приложенному изображению восстанови компонент как обычный frontend-код.',
      'Отвечай только валидным JSON без markdown.',
      'Формат ответа: {"message":"коротко что сверстано","html":"...","css":"...","js":"..."}.',
      'html — только разметка компонента без <html>, <head>, <body>, <style>, <script> и внешних подключений.',
      'css — стили компонента без тега <style>. Используй классы из html, CSS variables ��ожно только если они реально упрощают повторяющиеся значения.',
      'js — JavaScript без тега <script>; если нужны внешние CSS/JS подключения, добавь их в начало js как <link rel="stylesheet"> или <script src="..."></script>.',
      'Старайся делать код самодостаточным, семантичным и пригодным для последующей конвертации в слои TapTop.',
      'Не возвращай constructor.root: на этом шаге нужен только код по вкладкам Верстка, Стили, Скрипт.'
    ].join('\n');
  }

  function buildImageCodePrompt(userText, image, rules = null) {
    const note = String(userText || '').trim();
    const rulesText = builderRulesPromptText(rules);
    const imageInfo = {
      name: image?.name || '',
      width: image?.width || 0,
      height: image?.height || 0,
      mimeType: image?.mimeType || ''
    };
    return [
      'Задача: сверстай компонент по приложенному изображению и разложи результат по вкладкам кода.',
      note ? 'Уточнение пользователя: ' + note : '',
      '',
      'Информация об изображении:',
      JSON.stringify(imageInfo, null, 2),
      '',
      rulesText,
      rulesText ? '' : null,
      'Требования к коду:',
      '- Верни JSON с ключами html, css, js.',
      '- Не помещай CSS в html. Не добавляй тег <style> в css.',
      '- Не помещай JS в html. Inline-обработчики лучше замени на классы/data-атрибуты и код в js.',
      '- Сохраняй визуальную структуру изображения: размеры, отступы, сетку, типографику, кнопки, карточки, изображения/плейсхолдеры.',
      '- Если точный текст не читается, используй короткие осмысленные русские плейсхолдеры.',
      '- Для изображений внутри макета используй placeholder <img src="/d/fgs16_image-placeholder2.png" alt="">, если исходный контент не является иконкой.',
      '- Для иконок предпочитай inline <svg> в html.',
      '- Делай классы читабельными и стабильными, чтобы потом сборщик TapTop мог перенести стили на слои.'
    ].filter((part) => part !== null && part !== '').join('\n');
  }

  function imageSystemInstruction() {
    return [
      'Ты AI помощник для редактирования изображения в выбранном слое конструктора TapTop.',
      'Используй приложенное исходное изображение как основу.',
      'Создай новую версию изображения по задаче пользователя.',
      'Верни результат именно как изображение. Текстовый ответ, если нужен, должен быть коротким.'
    ].join('\n');
  }

  function buildImageUserPrompt(userText, context) {
    const layer = context ? {
      id: context.selectedId,
      name: context.layerName,
      type: context.layerType,
      image: {
        source: context.image?.sourceUrl || '',
        width: context.image?.width || 0,
        height: context.image?.height || 0
      }
    } : null;

    return [
      'Задача пользователя:',
      userText,
      '',
      'Контекст выбранного image-слоя JSON:',
      JSON.stringify(layer, null, 2)
    ].join('\n');
  }

  function isImageGenerationModel(model) {
    return /image|imagen/i.test(String(model || ''));
  }

  function styleCodeAsSourceStyleBlock(styleCode) {
    const css = String(styleCode || '').trim();
    if (!css) return '';
    return '<style>\n' + css.replace(/<\/style/gi, '<\\/style') + '\n</style>';
  }

  function sourceLayoutCodeWithStyles(layoutCode, styleCode) {
    return [
      String(layoutCode || '').trim(),
      styleCodeAsSourceStyleBlock(styleCode)
    ].filter(Boolean).join('\n\n');
  }

  function stripCodeFence(value) {
    return String(value || '')
      .trim()
      .replace(/^```[a-z0-9_-]*\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  function codePartFromObject(source, keys) {
    if (!source || typeof source !== 'object') return '';
    for (const key of keys) {
      if (typeof source[key] === 'string') return stripCodeFence(source[key]);
    }
    return '';
  }

  function cssCodeForTab(value) {
    const source = stripCodeFence(value);
    if (!source) return '';
    const parts = [];
    const withoutStyleTags = source.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, body) => {
      const css = String(body || '').trim();
      if (css) parts.push(css);
      return '';
    }).trim();
    if (withoutStyleTags) parts.push(withoutStyleTags);
    return parts.filter(Boolean).join('\n\n').trim();
  }

  function scriptCodeForTab(value) {
    const source = stripCodeFence(value);
    if (!source) return '';
    const parts = [];
    const withoutScriptTags = source.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, body) => {
      const attrText = String(attrs || '');
      const inline = String(body || '').trim();
      if (/\bsrc\s*=/i.test(attrText)) parts.push(String(match || '').trim());
      else if (inline) parts.push(inline);
      return '';
    }).trim();
    if (withoutScriptTags) parts.push(withoutScriptTags);
    return parts.filter(Boolean).join('\n\n').trim();
  }

  function splitHtmlCodeForTabs(htmlCode, cssCode = '', jsCode = '') {
    let html = stripCodeFence(htmlCode);
    const cssParts = [];
    const jsParts = [];

    html = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, body) => {
      const css = String(body || '').trim();
      if (css) cssParts.push(css);
      return '';
    });
    html = html.replace(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi, (match) => {
      jsParts.push(String(match || '').trim());
      return '';
    });
    html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, body) => {
      const attrText = String(attrs || '');
      const inline = String(body || '').trim();
      if (/\bsrc\s*=/i.test(attrText)) jsParts.push(String(match || '').trim());
      else if (inline) jsParts.push(inline);
      return '';
    });

    const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      html = bodyMatch[1];
    } else {
      html = html
        .replace(/<!doctype[^>]*>/gi, '')
        .replace(/<head\b[\s\S]*?<\/head>/gi, '')
        .replace(/<\/?html\b[^>]*>/gi, '')
        .replace(/<\/?body\b[^>]*>/gi, '');
    }

    return {
      html: html.trim(),
      css: [cssParts.join('\n\n'), cssCodeForTab(cssCode)].filter(Boolean).join('\n\n').trim(),
      js: [jsParts.join('\n\n'), scriptCodeForTab(jsCode)].filter(Boolean).join('\n\n').trim()
    };
  }

  function fencedCodeParts(text) {
    const result = { html: '', css: '', js: '' };
    const source = String(text || '');
    const re = /```([a-z0-9_-]*)\s*([\s\S]*?)```/gi;
    let match = null;
    while ((match = re.exec(source))) {
      const lang = String(match[1] || '').toLowerCase();
      const body = String(match[2] || '').trim();
      if (!body) continue;
      if (/^(html|htm|markup|xml)$/.test(lang) && !result.html) result.html = body;
      else if (/^(css|scss|sass)$/.test(lang) && !result.css) result.css = body;
      else if (/^(js|javascript|ts|typescript)$/.test(lang) && !result.js) result.js = body;
      else if (!lang && !result.html && /<[^>]+>/.test(body)) result.html = body;
    }
    return result;
  }

  function normalizeImageCodeParts(parts = {}) {
    const split = splitHtmlCodeForTabs(parts.html || '', parts.css || '', parts.js || '');
    return {
      message: String(parts.message || '').trim(),
      html: split.html,
      css: split.css,
      js: split.js
    };
  }

  function parseImageCodeResult(rawText) {
    const raw = String(rawText || '').trim();
    const parsed = parseGeminiJson(raw);
    const source = parsed?.code && typeof parsed.code === 'object'
      ? parsed.code
      : parsed?.component && typeof parsed.component === 'object'
      ? parsed.component
      : parsed;

    if (source && typeof source === 'object') {
      const parts = normalizeImageCodeParts({
        message: parsed?.message || source.message,
        html: codePartFromObject(source, ['html', 'markup', 'layout', 'template']),
        css: codePartFromObject(source, ['css', 'style', 'styles']),
        js: codePartFromObject(source, ['js', 'javascript', 'script', 'scripts'])
      });
      if (parts.html || parts.css || parts.js) return parts;
    }

    const fenced = normalizeImageCodeParts(fencedCodeParts(raw));
    if (fenced.html || fenced.css || fenced.js) return fenced;
    if (/<[a-z][\s\S]*>/i.test(raw)) return normalizeImageCodeParts({ html: raw });
    return null;
  }

  function applyImageCodeDraft(parts, panel = state.panel) {
    if (!panel || !parts) return;
    const html = String(parts.html || '').trim();
    const css = String(parts.css || '').trim();
    const js = String(parts.js || '').trim();

    const codeInput = codeInputElement(panel);
    const styleInput = styleInputElement(panel);
    const scriptInput = scriptInputElement(panel);
    setCodeFieldValue(codeInput, html);
    setCodeFieldValue(styleInput, css);
    setCodeFieldValue(scriptInput, js);
    writeCodeDraft(html);
    writeStyleDraft(css);
    writeScriptDraft(js);
    updateCodeStatus(panel);

    const box = panel.querySelector('[data-role="code-box"]');
    if (box) box.open = true;
    setCodeTab('source', panel);
    scheduleCodeEditorsInit(panel);
    scheduleCodeBoxResize(panel);
  }

  function addImageCodeDraftMessage(parts, rawText = '', options = {}) {
    const root = messagesRoot();
    if (!root) return;
    hideEmptyState();

    const replaceElement = options.replaceElement instanceof HTMLElement ? options.replaceElement : null;
    const item = replaceElement || document.createElement('div');
    item.className = 'tt-enhancer-ai-message tt-enhancer-ai-message--assistant';
    item.removeAttribute('aria-live');
    item.innerHTML = '';

    const total = String(parts?.html || '').length + String(parts?.css || '').length + String(parts?.js || '').length;
    const body = document.createElement('div');
    body.className = 'tt-enhancer-ai-message__body';
    body.textContent = String(parts?.message || '').trim()
      || `Код по картинке разложен ��о вкладкам (${total} симв.).`;
    if (!total && rawText) body.textContent = String(rawText || '').trim();
    item.appendChild(body);

    if (!item.isConnected) root.appendChild(item);
    scrollMessagesToBottom();
  }

  function modelForContext(provider, model, context) {
    const activeProvider = normalizeProvider(provider);
    const mode = context?.mode === MODEL_MODES.image ? MODEL_MODES.image : MODEL_MODES.text;
    const normalized = normalizeModelForMode(activeProvider, model, mode);
    if (activeProvider === 'gemini' && context?.mode === 'image' && !isImageGenerationModel(normalized)) return DEFAULT_IMAGE_MODEL;
    if (activeProvider === 'puter' && context?.mode === 'image' && !isImageGenerationModel(normalized)) return DEFAULT_PUTER_IMAGE_MODEL;
    return normalized;
  }

  async function getInlineImageData(sourceUrl) {
    const source = normalizeImageSourceUrl(sourceUrl);
    const parsed = parseDataImageUrl(source);
    if (parsed) return parsed;
    return requestBridge('fetchImageData', { url: source }, { retry: true, timeout: 30000 });
  }

  function measureImage(dataUrl) {
    return new Promise((resolve) => {
      if (!dataUrl) {
        resolve({ width: 0, height: 0 });
        return;
      }
      const image = new Image();
      image.onload = () => resolve({
        width: image.naturalWidth || image.width || 0,
        height: image.naturalHeight || image.height || 0
      });
      image.onerror = () => resolve({ width: 0, height: 0 });
      image.src = dataUrl;
    });
  }

  function loadImageElement(dataUrl) {
    return new Promise((resolve, reject) => {
      if (!dataUrl) {
        reject(new Error('Пустое изображение'));
        return;
      }
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Не удалось прочитать изображение Gemini'));
      image.src = dataUrl;
    });
  }

  function dataUrlMimeType(dataUrl, fallback = 'image/png') {
    return parseDataImageUrl(dataUrl)?.mimeType || imageMimeFromSource(dataUrl, fallback);
  }

  function canvasToDataUrl(canvas, mimeType, quality) {
    try {
      const dataUrl = canvas.toDataURL(mimeType, quality);
      if (/^data:image\//i.test(dataUrl)) return dataUrl;
    } catch {}
    return '';
  }

  async function optimizeGeneratedImage(imagePart) {
    const sourceDataUrl = String(imagePart?.dataUrl || '');
    const sourceMimeType = imagePart?.mimeType || dataUrlMimeType(sourceDataUrl);
    const image = await loadImageElement(sourceDataUrl);
    const sourceWidth = image.naturalWidth || image.width || 0;
    const sourceHeight = image.naturalHeight || image.height || 0;
    const sourcePixels = Math.max(1, sourceWidth * sourceHeight);
    const scale = Math.min(
      1,
      GENERATED_IMAGE_MAX_EDGE / Math.max(1, sourceWidth),
      GENERATED_IMAGE_MAX_EDGE / Math.max(1, sourceHeight),
      Math.sqrt(GENERATED_IMAGE_MAX_PIXELS / sourcePixels)
    );
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));
    const shouldOptimize = (
      scale < 1
      || sourceDataUrl.length > GENERATED_IMAGE_MAX_DATA_URL_CHARS
      || sourceMimeType !== 'image/webp'
    );

    if (!shouldOptimize) {
      return {
        dataUrl: sourceDataUrl,
        mimeType: sourceMimeType,
        width: sourceWidth,
        height: sourceHeight
      };
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) {
      return {
        dataUrl: sourceDataUrl,
        mimeType: sourceMimeType,
        width: sourceWidth,
        height: sourceHeight
      };
    }

    context.clearRect(0, 0, targetWidth, targetHeight);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const webpDataUrl = canvasToDataUrl(canvas, 'image/webp', GENERATED_IMAGE_WEBP_QUALITY);
    const pngDataUrl = canvasToDataUrl(canvas, 'image/png');
    const candidates = [webpDataUrl, pngDataUrl]
      .filter(Boolean)
      .map((dataUrl) => ({
        dataUrl,
        mimeType: dataUrlMimeType(dataUrl, sourceMimeType)
      }))
      .sort((a, b) => a.dataUrl.length - b.dataUrl.length);
    const best = candidates[0];

    if (!best || (scale === 1 && best.dataUrl.length >= sourceDataUrl.length)) {
      return {
        dataUrl: sourceDataUrl,
        mimeType: sourceMimeType,
        width: sourceWidth,
        height: sourceHeight
      };
    }

    return {
      dataUrl: best.dataUrl,
      mimeType: best.mimeType,
      width: targetWidth,
      height: targetHeight
    };
  }

  function sendCodePrompt(actionText = 'Сверстай по коду') {
    if (state.isLoading) return;
    const layoutCode = codeDraftValue();
    const styleCode = styleDraftValue();
    const embedCode = scriptDraftValue();
    const sourceLayoutCode = sourceLayoutCodeWithStyles(layoutCode, styleCode);
    const totalLength = layoutCode.length + styleCode.length + embedCode.length;
    if (!layoutCode && !styleCode && !embedCode) {
      focusCodeInput();
      addErrorMessage('Вставьте верстку, стили или скрипт в блок кода');
      return;
    }

    if (!state.isBuilderMode) setBuilderMode(true);

    const note = String(state.panel?.querySelector('[data-role="prompt"]')?.value || '').trim();
    const task = note || actionText || 'Сверстай по коду';
    const prompt = buildCodeLayoutPrompt(task, layoutCode, styleCode, embedCode, currentBuilderRules());
    closeCodeBox();
    sendPrompt(prompt, {
      displayText: `${actionText || 'Сверстай по коду'} (${totalLength} симв.)`,
      builderRulesIncluded: true,
      layoutCode: sourceLayoutCode,
      sourceLayoutCode,
      styleCode,
      embedCode
    });
  }

  async function sendImageCodePrompt() {
    if (state.isLoading) return;
    const panel = state.panel;
    const image = state.builderImage;
    const inlineImage = builderImageInlineData();
    if (!image || !inlineImage) {
      addErrorMessage('Загрузите изображение для верстки');
      panel?.querySelector?.('[data-action="upload-builder-image"]')?.focus();
      return;
    }

    const provider = normalizeProvider(state.settings.provider);
    if (!providerHasRequiredConfig(provider)) {
      openSettingsView();
      setSettingsNote(providerMissingConfigMessage(provider), 'error');
      state.panel?.querySelector(provider === 'openai-compatible' ? '[data-role="base-url"]' : '[data-role="api-key"]')?.focus();
      return;
    }

    if (!state.isBuilderMode) setBuilderMode(true);

    const textarea = panel?.querySelector?.('[data-role="prompt"]');
    const note = String(textarea?.value || '').trim();
    const displayText = note
      ? `Сверстай по картинке: ${note}`
      : `Сверстай по картинке: ${image.name || 'изображение'}`;
    const rulesSnapshot = currentBuilderRules();
    addUserMessage(displayText, null);
    setLoading(true);
    const thinkingStartedAt = Date.now();
    const thinkingMessage = addAssistantThinkingMessage();

    try {
      const selectedModel = selectedModelValue(panel?.querySelector('.tt-enhancer-ai-panel__model')) || state.settings.model;
      const model = normalizeModelForMode(provider, selectedModel, MODEL_MODES.text);
      const generationPayload = {
        provider,
        model,
        systemInstruction: imageCodeSystemInstruction(),
        generationConfig: provider === 'gemini'
          ? { responseMimeType: 'application/json', maxOutputTokens: 32768 }
          : undefined,
        maxTokens: 32768,
        timeoutMs: 120000,
        contents: [{
          role: 'user',
          parts: [
            { text: buildImageCodePrompt(note, image, rulesSnapshot) },
            { inlineData: inlineImage }
          ]
        }]
      };
      const result = provider === 'puter'
        ? await sendPuterGenerationRequest(generationPayload)
        : await requestBridge('generate', generationPayload, { timeout: 130000 });
      const thinkingLeft = THINKING_MIN_MS - (Date.now() - thinkingStartedAt);
      if (thinkingLeft > 0) await wait(thinkingLeft);

      const rawText = String(result?.text || '').trim().replace(/\[(https?:\/\/[^\]\s\)]+)\]\(\1\)/g, '$1');
      const parts = parseImageCodeResult(rawText);
      if (!parts || (!parts.html && !parts.css && !parts.js)) {
        throw new Error('AI не вернул код по картинке. Попробуйте уточнить запрос или сменить модель.');
      }
      applyImageCodeDraft(parts, panel);
      addImageCodeDraftMessage(parts, rawText, { replaceElement: thinkingMessage });
    } catch (error) {
      thinkingMessage?.remove();
      addErrorMessage(error?.message || providerLabel(provider) + ' не сверстал по картинке');
    } finally {
      setLoading(false);
      textarea?.focus();
    }
  }

  async function sendPrompt(forcedPrompt = '', options = {}) {
    if (state.isLoading) return;

    const textarea = state.panel?.querySelector('[data-role="prompt"]');
    const prompt = String(forcedPrompt || textarea?.value || '').trim();
    if (!prompt) return;
    const displayText = String(options.displayText || prompt).trim();

    const provider = normalizeProvider(state.settings.provider);

    if (!providerHasRequiredConfig(provider)) {
      openSettingsView();
      setSettingsNote(providerMissingConfigMessage(provider), 'error');
      state.panel?.querySelector(provider === 'openai-compatible' ? '[data-role="base-url"]' : '[data-role="api-key"]')?.focus();
      return;
    }

    const isBuilderMode = !!state.isBuilderMode;
    let context = refreshSelectedContextSafe({ force: true });
    if (!isBuilderMode && context?.mode !== 'image' && !context?.refs.length) {
      scheduleSelectionWarmup();
      context = await waitForTextContext();
    }
    if (!isBuilderMode && context?.mode !== 'image' && !context?.refs.length && forcedPrompt) {
      addErrorMessage('В выбранном слое не найден текст');
      return;
    }
    const builderRulesSnapshot = isBuilderMode ? currentBuilderRules() : null;
    const builderCodeMode = isBuilderMode
      && !options.builderRulesIncluded
      && !options.layoutCode
      && !options.sourceLayoutCode
      && !options.styleCode
      && !options.embedCode;
    addUserMessage(displayText, context);
    setLoading(true);
    const thinkingStartedAt = Date.now();
    const thinkingMessage = addAssistantThinkingMessage();

    try {
      const selectedModel = selectedModelValue(state.panel?.querySelector('.tt-enhancer-ai-panel__model')) || state.settings.model;
      const model = modelForContext(provider, selectedModel, isBuilderMode ? null : context);
      const generationPayload = {
        provider,
        model,
        systemInstruction: systemInstruction(isBuilderMode, { builderCodeMode }),
        generationConfig: isBuilderMode && provider === 'gemini'
          ? { responseMimeType: 'application/json', maxOutputTokens: 32768 }
          : undefined,
        maxTokens: isBuilderMode ? 32768 : undefined,
        contents: [{
          role: 'user',
          parts: [{
            text: buildUserPrompt(prompt, context, {
              builderMode: isBuilderMode,
              builderCodeMode,
              builderRules: builderRulesSnapshot,
              builderRulesAlreadyIncluded: !!options.builderRulesIncluded
            })
          }]
        }]
      };
      const result = !isBuilderMode && context?.mode === 'image'
        ? await sendImageGenerationRequest(prompt, context, model, provider)
        : provider === 'puter'
          ? await sendPuterGenerationRequest(generationPayload)
          : await requestBridge('generate', generationPayload, { timeout: 70000 });
      const thinkingLeft = THINKING_MIN_MS - (Date.now() - thinkingStartedAt);
      if (thinkingLeft > 0) await wait(thinkingLeft);
      const rawText = String(result?.text || '').trim().replace(/\[(https?:\/\/[^\]\s\)]+)\]\(\1\)/g, '$1');
      if (!isBuilderMode && context?.mode === 'image') {
        const image = result?.images?.[0] || null;
        if (!image?.dataUrl) {
          addAssistantMessage(rawText || providerLabel(provider) + ' не вернул изображение', null, context, { replaceElement: thinkingMessage });
        } else {
          const optimizedImage = await optimizeGeneratedImage(image);
          addAssistantImageMessage(rawText, {
            beforeUrl: context.image?.sourceUrl || '',
            dataUrl: optimizedImage.dataUrl,
            mimeType: optimizedImage.mimeType || image.mimeType || imageMimeFromSource(optimizedImage.dataUrl),
            width: optimizedImage.width || context.image?.width || 0,
            height: optimizedImage.height || context.image?.height || 0
          }, context, { replaceElement: thinkingMessage });
        }
      } else {
        const parsed = parseGeminiJson(rawText);
        addAssistantMessage(rawText, parsed, context, {
          replaceElement: thinkingMessage,
          builderMode: isBuilderMode,
          builderCodeMode,
          builderRules: builderRulesSnapshot,
          layoutCode: options.layoutCode,
          sourceLayoutCode: options.sourceLayoutCode,
          styleCode: options.styleCode,
          embedCode: options.embedCode,
          userPrompt: prompt
        });
      }
      if (!forcedPrompt && textarea) {
        textarea.value = '';
        writeDraft('');
      }
    } catch (error) {
      thinkingMessage?.remove();
      addErrorMessage(error?.message || providerLabel(provider) + ' не ответил');
    } finally {
      setLoading(false);
      textarea?.focus();
    }
  }

  async function sendImageGenerationRequest(prompt, context, model, provider = state.settings.provider) {
    const activeProvider = normalizeProvider(provider);
    if (activeProvider === 'openai-compatible') {
      throw new Error('OpenAI-compatible провайдер сейчас поддерживает текст и разбор изображений, но не генерацию нового изображения для image-слоя.');
    }
    const inlineImage = await getInlineImageData(context?.image?.sourceUrl || '');
    if (!inlineImage?.mimeType || !inlineImage?.data) {
      throw new Error('Не удалось подготовить изображение для ' + providerLabel(activeProvider));
    }

    const textPrompt = [
      imageSystemInstruction(),
      '',
      buildImageUserPrompt(prompt, context)
    ].join('\n');

    const payload = {
      provider: activeProvider,
      model,
      modalities: activeProvider === 'openrouter' ? ['image', 'text'] : undefined,
      timeoutMs: 120000,
      contents: [{
        role: 'user',
        parts: [
          { text: textPrompt },
          {
            inlineData: {
              mimeType: inlineImage.mimeType,
              data: inlineImage.data
            }
          }
        ]
      }]
    };

    if (activeProvider === 'puter') {
      payload.modalities = ['image', 'text'];
      return sendPuterGenerationRequest(payload);
    }

    return requestBridge('generate', payload, { timeout: 130000 });
  }

  function parseGeminiJson(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim() || '';
    const unfenced = (fenced || raw)
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const candidates = [unfenced];
    const first = unfenced.indexOf('{');
    const last = unfenced.lastIndexOf('}');
    if (first >= 0 && last > first) candidates.push(unfenced.slice(first, last + 1));

    for (const candidate of candidates) {
      const parsed = parseJsonCandidate(candidate);
      if (parsed) return parsed;
    }
    return null;
  }

  function parseJsonCandidate(candidate, depth = 0) {
    const source = String(candidate || '').trim();
    if (!source || depth > 2) return null;

    const attempts = [
      source,
      escapeJsonStringControlChars(source)
    ].filter((item, index, list) => item && list.indexOf(item) === index);

    for (const attempt of attempts) {
      try {
        const parsed = JSON.parse(attempt);
        if (typeof parsed === 'string') return parseJsonCandidate(parsed, depth + 1);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {}
    }
    return null;
  }

  function escapeJsonStringControlChars(value) {
    let result = '';
    let inString = false;
    let escaped = false;
    String(value || '').split('').forEach((char) => {
      if (!inString) {
        result += char;
        if (char === '"') inString = true;
        return;
      }
      if (escaped) {
        result += char;
        escaped = false;
        return;
      }
      if (char === '\\') {
        result += char;
        escaped = true;
        return;
      }
      if (char === '"') {
        result += char;
        inString = false;
        return;
      }
      if (char === '\n') {
        result += '\\n';
        return;
      }
      if (char === '\r') {
        result += '\\r';
        return;
      }
      if (char === '\t') {
        result += '\\t';
        return;
      }
      result += char;
    });
    return result;
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function hasOwnKey(obj, key) {
    return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
  }

  function readOwnKey(obj, key) {
    return hasOwnKey(obj, key) ? obj[key] : undefined;
  }

  function asArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }

  function isLayerClipboard(data) {
    return !!(data && data.copiedLayout && data.action && data.tagID);
  }

  function normalizeLayerClipboardPayload(value) {
    if (value?.type === LAYER_EXPORT_TYPE && isLayerClipboard(value.clipboardData)) return deepCloneJson(value.clipboardData);
    if (isLayerClipboard(value)) return deepCloneJson(value);
    return null;
  }

  function sanitizeTaptopName(value, fallback = 'AI component') {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.slice(0, 80) || fallback;
  }

  function sanitizeConstructorClassName(value) {
    const raw = String(value || '').trim().replace(/^\./, '');
    if (!raw) return '';
    const name = raw
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 72);
    if (!name) return '';
    return /^[a-zA-Z_-]/.test(name) ? name : `c-${name}`;
  }

  function sanitizeConstructorClassPrefix(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/^-+/, '')
      .slice(0, 32);
  }

  function splitBuilderRuleValues(value) {
    return String(value || '')
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function splitBuilderRuleLines(value) {
    return String(value || '')
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function splitBuilderRuleRows(value) {
    const text = String(value || '');
    if (!text) return [];
    return text.split(/\r?\n/).map((item) => item.trim());
  }

  function constructorSingleClassSelector(value) {
    const text = String(value || '').trim();
    const dotted = text.match(/^\.([_a-zA-Z-][_a-zA-Z0-9-]*)$/);
    if (dotted) return sanitizeConstructorClassName(dotted[1]);
    if (/^[_a-zA-Z-][_a-zA-Z0-9-]*$/.test(text) && !normalizeConstructorSourceTag(text)) {
      return sanitizeConstructorClassName(text);
    }
    return '';
  }

  function builderReplaceRules(value) {
    const source = normalizeBuilderRules(value || {});
    const fromLines = splitBuilderRuleRows(source.replaceFrom);
    const toLines = splitBuilderRuleRows(source.replaceTo);
    const result = [];
    const count = Math.max(fromLines.length, toLines.length);

    for (let index = 0; index < count; index += 1) {
      const from = fromLines[index];
      const to = toLines[index];
      if (!from || !to) continue;
      const sourceTag = from.startsWith('.') ? '' : normalizeConstructorSourceTag(from);
      const sourceClass = constructorSingleClassSelector(from);
      const targetClass = constructorSingleClassSelector(to);
      result.push({
        from,
        to,
        sourceTag,
        sourceClass,
        targetClass
      });
    }

    return result;
  }

  function builderPreservedClassNames(value) {
    const source = normalizeBuilderRules(value || {});
    return new Set(splitBuilderRuleValues(source.keepClasses).map(sanitizeConstructorClassName).filter(Boolean));
  }

  function activeBuilderReplaceRules(value) {
    const preservedClassNames = builderPreservedClassNames(value);
    const seenClassNames = new Set();
    return builderReplaceRules(value).filter((rule) => {
      if (rule.sourceClass && preservedClassNames.has(sanitizeConstructorClassName(rule.sourceClass))) return false;
      const classNames = [rule.sourceClass, rule.targetClass]
        .map(sanitizeConstructorClassName)
        .filter(Boolean);
      if (classNames.some((className) => seenClassNames.has(className.toLowerCase()))) return false;
      classNames.forEach((className) => seenClassNames.add(className.toLowerCase()));
      return true;
    });
  }

  function builderReplaceTargetClasses(value) {
    return activeBuilderReplaceRules(value)
      .map((rule) => rule.targetClass)
      .filter(Boolean);
  }

  function splitClassNames(value) {
    const result = [];
    asArray(value).forEach((item) => {
      String(item || '').split(/\s+/).forEach((token) => {
        const className = sanitizeConstructorClassName(token);
        if (className && !result.includes(className)) result.push(className);
      });
    });
    return result;
  }

  function makeTaptopObjectId(used, prefix = 'i') {
    let id = '';
    do {
      id = prefix + Math.random().toString(36).slice(2, 11).padEnd(9, '0').slice(0, 9);
    } while (used.has(id));
    used.add(id);
    return id;
  }

  function normalizeConstructorLayerType(value) {
    const type = String(value || '').trim().toLowerCase();
    if (/^(text|p|span|h[1-6]|heading|paragraph|label)$/.test(type)) return 'text';
    if (/^(section|header|footer|main|article|aside|nav)$/.test(type)) return 'section';
    if (/^(a|link|link block|link-block|button|cta)$/.test(type)) return 'link';
    if (/^(img|image|picture)$/.test(type)) return 'image';
    if (/^(svg|svg icon|svg-icon|icon)$/.test(type)) return 'svg';
    if (/^(embed|script|style|code|custom code|custom-code)$/.test(type)) return 'embed';
    return 'div';
  }

  function constructorBaseClass(type) {
    if (type === 'text') return 'text';
    if (type === 'section') return 'section';
    if (type === 'link') return 'link-block';
    if (type === 'image') return 'image';
    if (type === 'svg') return 'svg-icon';
    if (type === 'embed') return 'embed';
    return 'div';
  }

  function constructorAlias(type) {
    if (type === 'section') return 'Section';
    if (type === 'link') return 'Link Block';
    if (type === 'image') return 'Image';
    if (type === 'svg') return 'svg icon';
    if (type === 'embed') return 'Embed';
    return 'div';
  }

  const CONSTRUCTOR_SYSTEM_CLASS_NAMES = new Set([
    'div',
    'embed',
    'embed__stub',
    'embed__hint',
    'embed__icon',
    'embed__hint-text',
    'embed__hint-title',
    'embed__hint-empty-note',
    'embed__hint-note',
    'helper--d-none',
    'image',
    'image__img',
    'link-block',
    'section',
    'svg-icon',
    'text'
  ]);

  const CONSTRUCTOR_TEXT_TAG_NAMES = new Set([
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'span',
    'small',
    'strong',
    'em',
    'b',
    'i',
    'label'
  ]);

  const CONSTRUCTOR_CONTAINER_TAG_NAMES = new Set([
    'address',
    'article',
    'aside',
    'div',
    'figure',
    'footer',
    'header',
    'main',
    'nav',
    'section'
  ]);

  const CONSTRUCTOR_SYSTEM_CLASS_STYLES = {
    div: {
      width: '100%',
      position: 'relative'
    },
    section: {
      display: 'block',
      width: '100%',
      position: 'relative'
    },
    text: {
      display: 'inline-flex',
      'vertical-align': 'top',
      position: 'relative',
      margin: '0'
    },
    'link-block': {
      display: 'inline-flex',
      cursor: 'pointer',
      'text-decoration-line': 'none'
    },
    image: {
      position: 'relative',
      display: 'inline-flex',
      'vertical-align': 'top',
      'overflow-x': 'hidden',
      'overflow-y': 'hidden',
      width: '100px',
      height: '100px'
    },
    'image__img': {
      'object-fit': 'cover',
      width: '100%',
      height: '100%'
    },
    'svg-icon': {
      position: 'relative',
      display: 'inline-flex',
      'justify-content': 'center',
      'align-items': 'center',
      height: '32px',
      width: '32px',
      'overflow-x': 'hidden',
      'overflow-y': 'hidden'
    },
    embed: {
      'min-height': '100px',
      position: 'relative'
    }
  };

  const CONSTRUCTOR_LENGTH_STYLE_PROPERTIES = new Set([
    'width',
    'height',
    'min-width',
    'max-width',
    'min-height',
    'max-height',
    'top',
    'right',
    'bottom',
    'left',
    'margin',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'gap',
    'grid-gap',
    'grid-row-gap',
    'grid-column-gap',
    'row-gap',
    'column-gap',
    'font-size',
    'line-height',
    'letter-spacing',
    'border-width',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-radius',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-bottom-right-radius',
    'border-bottom-left-radius'
  ]);

  const CONSTRUCTOR_ZERO_SIZE_GUARD_PROPERTIES = new Set([
    'height',
    'min-height',
    'min-width'
  ]);

  const CONSTRUCTOR_BORDER_SIDES = ['top', 'right', 'bottom', 'left'];
  const CONSTRUCTOR_BORDER_STYLES = new Set([
    'none',
    'hidden',
    'dotted',
    'dashed',
    'solid',
    'double',
    'groove',
    'ridge',
    'inset',
    'outset'
  ]);
  const CONSTRUCTOR_BORDER_WIDTH_KEYWORDS = new Set(['thin', 'medium', 'thick']);

  function normalizeCssPropertyName(value) {
    const name = String(value || '')
      .trim()
      .replace(/[A-Z]/g, (char) => '-' + char.toLowerCase())
      .replace(/^--+/, '--')
      .toLowerCase();
    if (name === 'grid-row-gap') return 'row-gap';
    if (name === 'grid-column-gap') return 'column-gap';
    if (name === 'grid-gap') return 'gap';
    return name;
  }

  // Дефект 2.11: убираем суффикс !important, чтобы значение прошло нормализацию.
  function stripConstructorImportant(value) {
    return String(value == null ? '' : value).replace(/\s*!\s*important\s*$/i, '').trim();
  }

  // Дефект 2.3: делим декларации по ';' верхнего уровня, не ломая url()/data-URI,
  // calc(), кавычки и экранированные символы.
  function splitTopLevelDeclarations(value) {
    const parts = [];
    let current = '';
    let depth = 0;
    let quote = '';
    let escaped = false;
    const text = String(value || '');
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (escaped) { current += char; escaped = false; continue; }
      if (char === '\\') { current += char; escaped = true; continue; }
      if (quote) { current += char; if (char === quote) quote = ''; continue; }
      if (char === '"' || char === "'") { current += char; quote = char; continue; }
      if (char === '(') { depth += 1; current += char; continue; }
      if (char === ')') { if (depth > 0) depth -= 1; current += char; continue; }
      if (char === ';' && depth === 0) { if (current.trim()) parts.push(current); current = ''; continue; }
      current += char;
    }
    if (current.trim()) parts.push(current);
    return parts;
  }

  // Дефект 2.3: имя/значение делим по первому ':' верхнего уровня, чтобы ':' внутри
  // url(data:...) или кавычек не считался разделителем.
  function splitDeclarationNameValue(declaration) {
    const text = String(declaration || '');
    let depth = 0;
    let quote = '';
    let escaped = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (quote) { if (char === quote) quote = ''; continue; }
      if (char === '"' || char === "'") { quote = char; continue; }
      if (char === '(') { depth += 1; continue; }
      if (char === ')') { if (depth > 0) depth -= 1; continue; }
      if (char === ':' && depth === 0) {
        return { name: text.slice(0, i), value: text.slice(i + 1) };
      }
    }
    return null;
  }

  function parseStyleDeclarations(value) {
    const result = {};
    splitTopLevelDeclarations(value).forEach((part) => {
      const split = splitDeclarationNameValue(part);
      if (!split) return;
      const name = normalizeCssPropertyName(split.name);
      const cssValue = stripConstructorImportant(split.value);
      if (!name || !cssValue) return;
      Object.entries(normalizeConstructorStyleDeclaration(name, cssValue)).forEach(([nextName, nextValue]) => {
        if (shouldDropConstructorStyleValue(nextName, nextValue)) return;
        result[nextName] = nextValue;
      });
    });
    return expandConstructorGapStyles(result);
  }

  function normalizeConstructorUnitlessLineHeight(value) {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return '';
      return `${Math.round(value * 10000) / 100}%`;
    }
    const text = String(value || '').trim();
    if (/^-?\d+(?:\.\d+)?$/.test(text)) {
      const number = Number(text);
      if (Number.isFinite(number)) return `${Math.round(number * 10000) / 100}%`;
    }
    return text;
  }

  function normalizeConstructorLengthValue(name, value) {
    if (name === 'line-height') return normalizeConstructorUnitlessLineHeight(value);
    if (!CONSTRUCTOR_LENGTH_STYLE_PROPERTIES.has(name)) return value;
    if (typeof value === 'number') return Number.isFinite(value) && value !== 0 ? `${value}px` : String(value);
    const text = String(value || '').trim();
    if (/^-?\d+(?:\.\d+)?$/.test(text) && text !== '0') return `${text}px`;
    return text;
  }

  function isConstructorZeroCssValue(value) {
    const text = String(value ?? '').trim().toLowerCase();
    return /^0(?:\.0+)?(?:px|rem|em|vh|vw|vmin|vmax|%)?$/.test(text);
  }

  function shouldDropConstructorStyleValue(name, value) {
    if (name === 'height' && String(value || '').trim().toLowerCase() === 'auto') return true;
    if (!CONSTRUCTOR_ZERO_SIZE_GUARD_PROPERTIES.has(name)) return false;
    return isConstructorZeroCssValue(value);
  }

  function splitCssSpaceList(value) {
    return String(value || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function expandConstructorGapStyles(styles) {
    const result = Object.assign({}, styles || {});
    const gap = result.gap ?? result['grid-gap'];
    if (gap !== undefined && gap !== null && gap !== '') {
      const parts = splitCssSpaceList(gap);
      const row = parts[0] || '';
      const column = parts[1] || row;
      if (row && result['row-gap'] === undefined) result['row-gap'] = row;
      if (column && result['column-gap'] === undefined) result['column-gap'] = column;
      delete result.gap;
      delete result['grid-gap'];
    }
    return result;
  }

  function splitCssFunctionAwareList(value) {
    const tokens = [];
    let current = '';
    let depth = 0;
    let quote = '';
    let escaped = false;
    String(value || '').trim().split('').forEach((char) => {
      if (escaped) {
        current += char;
        escaped = false;
        return;
      }
      if (char === '\\') {
        current += char;
        escaped = true;
        return;
      }
      if (quote) {
        current += char;
        if (char === quote) quote = '';
        return;
      }
      if (char === '"' || char === "'") {
        current += char;
        quote = char;
        return;
      }
      if (char === '(') depth += 1;
      else if (char === ')' && depth > 0) depth -= 1;
      if (/\s/.test(char) && depth === 0) {
        if (current.trim()) tokens.push(current.trim());
        current = '';
        return;
      }
      current += char;
    });
    if (current.trim()) tokens.push(current.trim());
    return tokens;
  }

  function expandConstructorBoxShorthand(name, value) {
    if (name !== 'margin' && name !== 'padding') return null;
    const parts = splitCssFunctionAwareList(value).slice(0, 4);
    if (!parts.length) return null;
    const [top, right = top, bottom = top, left = right] = parts;
    return {
      [`${name}-top`]: top,
      [`${name}-right`]: right,
      [`${name}-bottom`]: bottom,
      [`${name}-left`]: left
    };
  }

  function expandConstructorBorderRadius(value) {
    const firstPart = String(value || '').split('/')[0] || '';
    const parts = splitCssFunctionAwareList(firstPart).slice(0, 4);
    if (!parts.length) return null;
    const [topLeft, topRight = topLeft, bottomRight = topLeft, bottomLeft = topRight] = parts;
    return {
      'border-top-left-radius': topLeft,
      'border-top-right-radius': topRight,
      'border-bottom-right-radius': bottomRight,
      'border-bottom-left-radius': bottomLeft
    };
  }

  function looksLikeConstructorBorderWidth(value) {
    const text = String(value || '').trim().toLowerCase();
    return CONSTRUCTOR_BORDER_WIDTH_KEYWORDS.has(text)
      || /^0(?:\.0+)?(?:px|rem|em|vh|vw|vmin|vmax|%)?$/.test(text)
      || /^-?\d+(?:\.\d+)?(?:px|rem|em|vh|vw|vmin|vmax|%)$/i.test(text);
  }

  function parseConstructorBorderShorthand(value) {
    const tokens = splitCssFunctionAwareList(value);
    if (!tokens.length) return null;
    const result = {};
    const colorParts = [];
    tokens.forEach((token) => {
      const lower = token.toLowerCase();
      if (!result.style && CONSTRUCTOR_BORDER_STYLES.has(lower)) {
        result.style = lower;
        return;
      }
      if (!result.width && looksLikeConstructorBorderWidth(token)) {
        result.width = normalizeConstructorLengthValue('border-width', token);
        return;
      }
      colorParts.push(token);
    });
    const lowerValue = String(value || '').trim().toLowerCase();
    if (lowerValue === 'none' || lowerValue === '0') {
      result.width = '0';
      result.style = 'none';
    }
    if (colorParts.length) result.color = colorParts.join(' ');
    return result.width || result.style || result.color ? result : null;
  }

  function expandConstructorBorderShorthand(name, value) {
    if (!/^border(?:-(top|right|bottom|left))?$/.test(name)) return null;
    const parsed = parseConstructorBorderShorthand(value);
    if (!parsed) return null;
    const sideMatch = name.match(/^border-(top|right|bottom|left)$/);
    const sides = sideMatch ? [sideMatch[1]] : CONSTRUCTOR_BORDER_SIDES;
    const result = {};
    sides.forEach((side) => {
      if (parsed.width) result[`border-${side}-width`] = parsed.width;
      if (parsed.style) result[`border-${side}-style`] = parsed.style;
      if (parsed.color) result[`border-${side}-color`] = parsed.color;
    });
    return result;
  }

  function expandConstructorBorderPartShorthand(name, value) {
    const match = name.match(/^border-(width|style|color)$/);
    if (!match) return null;
    const part = match[1];
    const values = splitCssFunctionAwareList(value).slice(0, 4);
    if (!values.length) return null;
    const [top, right = top, bottom = top, left = right] = values;
    return {
      [`border-top-${part}`]: top,
      [`border-right-${part}`]: right,
      [`border-bottom-${part}`]: bottom,
      [`border-left-${part}`]: left
    };
  }

  // ===== Дефект 2.4: дополнительные шорткаты (inset/overflow/flex/flex-flow/place-*/font/background) =====
  const CONSTRUCTOR_FLEX_DIRECTIONS = new Set(['row', 'row-reverse', 'column', 'column-reverse']);
  const CONSTRUCTOR_FLEX_WRAPS = new Set(['nowrap', 'wrap', 'wrap-reverse']);

  function expandConstructorInsetShorthand(value) {
    const parts = splitCssFunctionAwareList(value).slice(0, 4);
    if (!parts.length) return null;
    const [top, right = top, bottom = top, left = right] = parts;
    return { top, right, bottom, left };
  }

  function expandConstructorOverflowShorthand(value) {
    const parts = splitCssFunctionAwareList(value).slice(0, 2);
    if (!parts.length || parts.length > 2) return null;
    const [x, y = x] = parts;
    return { 'overflow-x': x, 'overflow-y': y };
  }

  function expandConstructorFlexFlowShorthand(value) {
    const parts = splitCssFunctionAwareList(value);
    if (!parts.length) return null;
    const result = {};
    parts.forEach((part) => {
      const low = part.toLowerCase();
      if (CONSTRUCTOR_FLEX_DIRECTIONS.has(low)) result['flex-direction'] = low;
      else if (CONSTRUCTOR_FLEX_WRAPS.has(low)) result['flex-wrap'] = low;
    });
    return Object.keys(result).length ? result : null;
  }

  function expandConstructorFlexShorthand(value) {
    const text = String(value || '').trim();
    if (!text) return null;
    const low = text.toLowerCase();
    if (low === 'none') return { 'flex-grow': '0', 'flex-shrink': '0', 'flex-basis': 'auto' };
    if (low === 'auto') return { 'flex-grow': '1', 'flex-shrink': '1', 'flex-basis': 'auto' };
    if (low === 'initial') return { 'flex-grow': '0', 'flex-shrink': '1', 'flex-basis': 'auto' };
    const parts = splitCssFunctionAwareList(value);
    const isNum = (part) => /^\d+(?:\.\d+)?$/.test(part);
    const nums = parts.filter(isNum);
    const basisTokens = parts.filter((part) => !isNum(part));
    const result = {};
    if (nums.length === 1 && basisTokens.length === 0) {
      result['flex-grow'] = nums[0];
      result['flex-shrink'] = '1';
      result['flex-basis'] = '0%';
    } else {
      result['flex-grow'] = nums[0] !== undefined ? nums[0] : '1';
      result['flex-shrink'] = nums[1] !== undefined ? nums[1] : '1';
      result['flex-basis'] = basisTokens[0] !== undefined ? basisTokens[0] : '0%';
    }
    return result;
  }

  function expandConstructorPlaceShorthand(name, value) {
    const map = {
      'place-items': ['align-items', 'justify-items'],
      'place-content': ['align-content', 'justify-content'],
      'place-self': ['align-self', 'justify-self']
    };
    const keys = map[name];
    if (!keys) return null;
    const parts = splitCssFunctionAwareList(value).slice(0, 2);
    if (!parts.length) return null;
    const [first, second = first] = parts;
    return { [keys[0]]: first, [keys[1]]: second };
  }

  function expandConstructorFontShorthand(value) {
    const text = String(value || '').trim();
    if (!text) return null;
    if (/^(caption|icon|menu|message-box|small-caption|status-bar|inherit|initial|unset)$/i.test(text)) return null;
    const tokens = splitCssFunctionAwareList(value);
    const STYLE = new Set(['italic', 'oblique', 'normal']);
    const VARIANT = new Set(['small-caps']);
    const WEIGHT = new Set(['bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900']);
    const STRETCH = new Set(['ultra-condensed', 'extra-condensed', 'condensed', 'semi-condensed', 'semi-expanded', 'expanded', 'extra-expanded', 'ultra-expanded']);
    const SIZE_KW = new Set(['xx-small', 'x-small', 'small', 'medium', 'large', 'x-large', 'xx-large', 'smaller', 'larger']);
    const out = {};
    const isSizeToken = (token) => {
      const low = token.toLowerCase();
      if (SIZE_KW.has(low)) return true;
      if (token.indexOf('/') !== -1) return true;
      return /^[0-9.]+(px|em|rem|%|vw|vh|vmin|vmax|pt|pc|cm|mm|in|ex|ch)$/i.test(token);
    };
    let i = 0;
    for (; i < tokens.length; i += 1) {
      if (isSizeToken(tokens[i])) break;
      const low = tokens[i].toLowerCase();
      if (STYLE.has(low)) { if (low !== 'normal') out['font-style'] = low; continue; }
      if (STRETCH.has(low)) { out['font-stretch'] = low; continue; }
      if (WEIGHT.has(low)) { out['font-weight'] = low; continue; }
      if (VARIANT.has(low)) { out['font-variant'] = low; continue; }
    }
    if (i >= tokens.length) return Object.keys(out).length ? out : null;
    const sizeToken = tokens[i];
    i += 1;
    if (sizeToken.indexOf('/') !== -1) {
      const [size, lineHeight] = sizeToken.split('/');
      if (size) out['font-size'] = size;
      if (lineHeight) out['line-height'] = lineHeight;
    } else {
      out['font-size'] = sizeToken;
    }
    const family = tokens.slice(i).join(' ').replace(/^\/\s*/, '').trim();
    if (family) out['font-family'] = family;
    return Object.keys(out).length ? out : null;
  }

  function expandConstructorBackgroundShorthand(value) {
    const text = String(value || '').trim();
    if (!text || /^(inherit|initial|unset|none)$/i.test(text)) return null;
    const tokens = splitCssFunctionAwareList(text);
    const imageTokens = [];
    let color = null;
    tokens.forEach((token) => {
      if (/^url\(/i.test(token) || /gradient\(/i.test(token)) { imageTokens.push(token); return; }
      if (color === null && constructorIsColorValue(token)) { color = token; }
    });
    const result = {};
    if (color) result['background-color'] = color;
    if (imageTokens.length) result['background-image'] = imageTokens.join(' ');
    return Object.keys(result).length ? result : null;
  }

  function expandConstructorExtraShorthand(name, value) {
    if (name === 'inset') return expandConstructorInsetShorthand(value);
    if (name === 'overflow') return expandConstructorOverflowShorthand(value);
    if (name === 'flex') return expandConstructorFlexShorthand(value);
    if (name === 'flex-flow') return expandConstructorFlexFlowShorthand(value);
    if (name === 'place-items' || name === 'place-content' || name === 'place-self') return expandConstructorPlaceShorthand(name, value);
    if (name === 'font') return expandConstructorFontShorthand(value);
    if (name === 'background') return expandConstructorBackgroundShorthand(value);
    return null;
  }

  // ===== Дефект 2.13: приведение цветовых значений к rgb()/rgba() =====
  const CONSTRUCTOR_COLOR_PROPERTIES = new Set([
    'color',
    'background-color',
    'border-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'text-decoration-color',
    'column-rule-color',
    'caret-color',
    '-webkit-text-stroke-color'
  ]);
  const CONSTRUCTOR_NAMED_COLORS = {
    black: '0,0,0', white: '255,255,255', red: '255,0,0', green: '0,128,0', blue: '0,0,255',
    yellow: '255,255,0', cyan: '0,255,255', aqua: '0,255,255', magenta: '255,0,255', fuchsia: '255,0,255',
    gray: '128,128,128', grey: '128,128,128', silver: '192,192,192', maroon: '128,0,0', olive: '128,128,0',
    lime: '0,255,0', teal: '0,128,128', navy: '0,0,128', purple: '128,0,128', orange: '255,165,0',
    pink: '255,192,203', brown: '165,42,42', gold: '255,215,0', violet: '238,130,238', indigo: '75,0,130',
    coral: '255,127,80', salmon: '250,128,114', khaki: '240,230,140', crimson: '220,20,60', tomato: '255,99,71',
    orchid: '218,112,214', turquoise: '64,224,208', beige: '245,245,220', ivory: '255,255,240', lavender: '230,230,250',
    plum: '221,160,221', tan: '210,180,140', wheat: '245,222,179', azure: '240,255,255', chocolate: '210,105,30',
    darkblue: '0,0,139', darkgray: '169,169,169', darkgrey: '169,169,169', darkgreen: '0,100,0', darkred: '139,0,0',
    lightblue: '173,216,230', lightgray: '211,211,211', lightgrey: '211,211,211', lightgreen: '144,238,144',
    steelblue: '70,130,180', skyblue: '135,206,235', royalblue: '65,105,225', midnightblue: '25,25,112',
    slategray: '112,128,144', slategrey: '112,128,144', dimgray: '105,105,105', dimgrey: '105,105,105',
    gainsboro: '220,220,220', whitesmoke: '245,245,245', snow: '255,250,250', rebeccapurple: '102,51,153'
  };

  function constructorClampByte(num) {
    const rounded = Math.round(num);
    if (rounded < 0) return 0;
    if (rounded > 255) return 255;
    return rounded;
  }

  function constructorRoundAlpha(alpha) {
    return Math.round(alpha * 1000) / 1000;
  }

  function constructorHexToRgb(hex) {
    let h = String(hex || '').replace('#', '').trim();
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    if (h.length === 8) {
      const a = parseInt(h.slice(6, 8), 16) / 255;
      return `rgba(${r}, ${g}, ${b}, ${constructorRoundAlpha(a)})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  }

  function constructorRgbNormalize(value) {
    const match = String(value || '').match(/^rgba?\(\s*([^)]+)\)$/i);
    if (!match) return null;
    const parts = match[1].split(/[,\/\s]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const toByte = (part) => (/%$/.test(part) ? constructorClampByte((parseFloat(part) / 100) * 255) : constructorClampByte(parseFloat(part)));
    const r = toByte(parts[0]);
    const g = toByte(parts[1]);
    const b = toByte(parts[2]);
    if ([r, g, b].some(Number.isNaN)) return null;
    if (parts[3] !== undefined) {
      let a = /%$/.test(parts[3]) ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
      if (Number.isNaN(a)) a = 1;
      if (a !== 1) return `rgba(${r}, ${g}, ${b}, ${constructorRoundAlpha(a)})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  }

  function constructorHslToRgb(value) {
    const match = String(value || '').match(/^hsla?\(\s*([^)]+)\)$/i);
    if (!match) return null;
    const parts = match[1].split(/[,\/\s]+/).filter(Boolean);
    if (parts.length < 3) return null;
    let h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    if ([h, s, l].some(Number.isNaN)) return null;
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    r = constructorClampByte((r + m) * 255);
    g = constructorClampByte((g + m) * 255);
    b = constructorClampByte((b + m) * 255);
    if (parts[3] !== undefined) {
      let a = /%$/.test(parts[3]) ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
      if (Number.isNaN(a)) a = 1;
      if (a !== 1) return `rgba(${r}, ${g}, ${b}, ${constructorRoundAlpha(a)})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  }

  function constructorToRgb(value) {
    const text = String(value || '').trim();
    if (!text) return null;
    const low = text.toLowerCase();
    if (/^#[0-9a-f]{3,8}$/i.test(text)) return constructorHexToRgb(text);
    if (/^rgba?\(/i.test(low)) return constructorRgbNormalize(text);
    if (/^hsla?\(/i.test(low)) return constructorHslToRgb(text);
    if (Object.prototype.hasOwnProperty.call(CONSTRUCTOR_NAMED_COLORS, low)) {
      return `rgb(${CONSTRUCTOR_NAMED_COLORS[low].split(',').join(', ')})`;
    }
    return null;
  }

  function constructorIsColorValue(value) {
    const low = String(value || '').trim().toLowerCase();
    if (!low) return false;
    if (low === 'transparent' || low === 'currentcolor') return true;
    return constructorToRgb(value) !== null;
  }

  function normalizeConstructorColorValue(name, value) {
    if (!CONSTRUCTOR_COLOR_PROPERTIES.has(name)) return value;
    const text = String(value == null ? '' : value).trim();
    const low = text.toLowerCase();
    if (!text || low === 'transparent' || low === 'currentcolor' || low === 'inherit' || low === 'initial' || low === 'unset' || low === 'none') return value;
    if (/^var\(/i.test(low) || /gradient\(/i.test(low)) return value;
    return constructorToRgb(text) || value;
  }

  function normalizeConstructorStyleDeclaration(name, value) {
    const shorthand = expandConstructorBoxShorthand(name, value)
      || (name === 'border-radius' ? expandConstructorBorderRadius(value) : null)
      || expandConstructorBorderPartShorthand(name, value)
      || expandConstructorBorderShorthand(name, value)
      || expandConstructorExtraShorthand(name, value);
    const source = shorthand || { [name]: value };
    const result = {};
    Object.entries(source).forEach(([rawName, rawValue]) => {
      const nextName = normalizeCssPropertyName(rawName);
      if (!nextName || rawValue === undefined || rawValue === null || rawValue === '') return;
      let nextValue = normalizeConstructorLengthValue(nextName, rawValue);
      nextValue = normalizeConstructorColorValue(nextName, nextValue);
      if (shouldDropConstructorStyleValue(nextName, nextValue)) return;
      result[nextName] = nextValue;
    });
    return result;
  }

  function normalizeStyleObject(value) {
    if (typeof value === 'string') return parseStyleDeclarations(value);
    if (!isPlainObject(value)) return {};
    const result = {};
    Object.entries(value).forEach(([key, rawValue]) => {
      const name = normalizeCssPropertyName(key);
      if (!name || rawValue === undefined || rawValue === null || rawValue === '') return;
      if (isPlainObject(rawValue) || Array.isArray(rawValue)) return;
      Object.entries(normalizeConstructorStyleDeclaration(name, rawValue)).forEach(([nextName, nextValue]) => {
        if (shouldDropConstructorStyleValue(nextName, nextValue)) return;
        result[nextName] = nextValue;
      });
    });
    return expandConstructorGapStyles(result);
  }

  function mergeStyleInputs(...values) {
    return expandConstructorGapStyles(Object.assign({}, ...values.map(normalizeStyleObject)));
  }

  // Дефект 2.7: значения вида calc()/var()/clamp()/min()/max()/env() и грид-функции
  // нельзя задать нативным свойством слоя — их нужно помечать как custom.
  const CONSTRUCTOR_CUSTOM_VALUE_RE = /(?:calc|var|clamp|env|min|max|minmax|repeat|fit-content)\(/i;

  function constructorValueIsCustom(name, value) {
    if (typeof name === 'string' && name.startsWith('--')) return true;
    const text = String(value == null ? '' : value);
    return CONSTRUCTOR_CUSTOM_VALUE_RE.test(text);
  }

  function makeCssRule(name, value) {
    const cssValue = typeof value === 'number' ? value : String(value).trim();
    const rule = {
      name,
      value: cssValue,
      isCustom: typeof cssValue === 'string' && constructorValueIsCustom(name, cssValue),
      serializeValue: cssValue
    };
    if (typeof cssValue === 'string') {
      if (CONSTRUCTOR_LENGTH_STYLE_PROPERTIES.has(name) && cssValue === '0') {
        rule.number = 0;
        rule.unit = 'px';
      }
      if (CONSTRUCTOR_LENGTH_STYLE_PROPERTIES.has(name) && cssValue.toLowerCase() === 'auto') {
        rule.number = 0;
        rule.unit = 'auto';
      }
      const match = cssValue.match(/^(-?\d+(?:\.\d+)?)(px|%|rem|em|vh|vw|vmin|vmax|ms|s|deg)$/i);
      if (match) {
        rule.number = Number(match[1]);
        rule.unit = match[2];
      }
    }
    return rule;
  }

  function makeCssRules(styles) {
    const rules = {};
    Object.entries(normalizeStyleObject(styles)).forEach(([name, value]) => {
      rules[name] = makeCssRule(name, value);
    });
    return rules;
  }

  function normalizeConstructorMedia(value) {
    const media = String(value || '').trim();
    const lower = media.toLowerCase();
    if (!media || lower === 'screen' || lower === 'desktop' || lower === 'computer' || lower === 'base') return 'screen';
    if (lower === 'mobile' || lower === 'phone' || lower === 'portrait' || lower === 'mobile-portrait' || lower === 'phone-portrait') return '(max-width: 479px)';
    if (lower === 'mobile-landscape' || lower === 'phone-landscape' || lower === 'landscape') return '(max-width: 767px)';
    if (lower === 'tablet' || lower === 'tablet-portrait') return '(max-width: 991px)';
    if (lower === 'wide') return '(min-width: 1200px)';
    const maxWidth = lower.match(/max-width\s*:\s*(\d+(?:\.\d+)?)px?/i)
      || lower.match(/^<=?\s*(\d+(?:\.\d+)?)px?$/)
      || lower.match(/^(\d+(?:\.\d+)?)px?$/);
    if (maxWidth) {
      const width = Number(maxWidth[1]);
      if (Number.isFinite(width)) {
        if (width <= 480) return '(max-width: 479px)';
        if (width <= 768) return '(max-width: 767px)';
        if (width <= 992) return '(max-width: 991px)';
      }
    }
    return media;
  }

  // Может ли TapTop выразить этот media-запрос тремя max-width брейкпоинтами (479/767/991).
  // Если нет (min-width, диапазон, orientation и т.п.) — такой блок уйдёт в Embed (дефект 2.6).
  function constructorMediaSupported(media) {
    const raw = String(media || '').trim();
    if (!raw) return true;
    const query = raw.replace(/^@media\s*/i, '').trim();
    const lower = query.toLowerCase();
    if (!lower) return true;
    const supportedKeywords = new Set([
      'screen', 'desktop', 'computer', 'base', 'all',
      'mobile', 'phone', 'portrait', 'mobile-portrait', 'phone-portrait',
      'mobile-landscape', 'phone-landscape', 'landscape',
      'tablet', 'tablet-portrait'
    ]);
    if (supportedKeywords.has(lower)) return true;
    if (/min-width|min-height|max-height|orientation|aspect-ratio|resolution|prefers-|hover|pointer|min-device|max-device|\bdpi\b|\bdppx\b/.test(lower)) {
      return false;
    }
    const maxWidth = lower.match(/max-width\s*:\s*(\d+(?:\.\d+)?)\s*px/);
    if (maxWidth) {
      const width = Number(maxWidth[1]);
      return Number.isFinite(width) && width <= 992;
    }
    const numericOnly = lower.match(/^<=?\s*(\d+(?:\.\d+)?)px?$/) || lower.match(/^(\d+(?:\.\d+)?)px?$/);
    if (numericOnly) {
      const width = Number(numericOnly[1]);
      return Number.isFinite(width) && width <= 992;
    }
    return false;
  }

  function addConstructorSelector(map, media, selectorText, styles) {
    const rules = makeCssRules(styles);
    if (!Object.keys(rules).length) return;
    const normalizedMedia = normalizeConstructorMedia(media);
    const key = `${normalizedMedia}/${selectorText}`;
    if (map[key]) {
      map[key].rules = Object.assign({}, map[key].rules || {}, rules);
      return;
    }
    map[key] = { media: normalizedMedia, selectorText, rules };
  }

  function addConstructorSystemClassStyle(ctx, className) {
    const normalizedClassName = sanitizeConstructorClassName(className);
    const styles = CONSTRUCTOR_SYSTEM_CLASS_STYLES[normalizedClassName];
    if (!styles) return;
    addConstructorSelector(ctx.mainSelectors, 'screen', `.${normalizedClassName}`, styles);
  }

  function normalizeConstructorDataKey(key) {
    const name = String(key || '').trim();
    if (!name) return '';
    if (name.startsWith('custom-data-')) return name;
    if (name.startsWith('data-')) return 'custom-' + name;
    return name;
  }

  function makeConstructorDataValue(value, type = 'STRING') {
    if (isPlainObject(value) && value.type && Object.prototype.hasOwnProperty.call(value, 'value')) {
      return deepCloneJson(value);
    }
    return {
      type,
      value: String(value ?? '')
    };
  }

  function constructorTextValue(node) {
    return String(node?.text ?? node?.html ?? node?.content ?? node?.value ?? '');
  }

  function decodeConstructorSvgDataUrl(value) {
    const source = stripCssUrl(value);
    if (!/^data:image\/svg\+xml/i.test(source)) return '';
    const commaIndex = source.indexOf(',');
    if (commaIndex < 0) return '';
    const meta = source.slice(0, commaIndex);
    const body = source.slice(commaIndex + 1);
    try {
      return /;base64/i.test(meta) ? atob(body) : decodeURIComponent(body);
    } catch {
      return '';
    }
  }

  function constructorSvgValue(node) {
    const inlineSvg = String(node?.svg ?? node?.svgBody ?? node?.svg_body ?? node?.html ?? node?.text ?? node?.content ?? '');
    if (inlineSvg.trim()) return inlineSvg;
    return decodeConstructorSvgDataUrl(node?.src ?? node?.url ?? node?.attrs?.src ?? node?.attributes?.src ?? '');
  }

  function isConstructorSvgIconPaintColor(value) {
    const text = String(value ?? '').trim();
    if (!text) return false;
    const lower = text.toLowerCase();
    if (lower === 'none' || lower === 'transparent' || lower === 'currentcolor') return false;
    if (lower === 'inherit' || lower === 'initial' || lower === 'unset') return false;
    if (/^url\s*\(/i.test(text)) return false;
    return true;
  }

  function findConstructorSvgElement(value) {
    let source = String(value || '').trim();
    if (!source) return null;
    if (!/<svg[\s>]/i.test(source)) {
      source = `<svg viewBox="0 0 24 24">${source}</svg>`;
    }

    try {
      const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
      if (!doc.querySelector?.('parsererror')) {
        const root = doc.documentElement;
        return String(root?.tagName || '').toLowerCase() === 'svg'
          ? root
          : doc.querySelector?.('svg');
      }
    } catch {}
    try {
      const template = document.createElement('template');
      template.innerHTML = source;
      return template.content.querySelector('svg');
    } catch {}
    return null;
  }

  function constructorSvgStyleProperty(element, name) {
    try {
      const styleValue = element?.style?.getPropertyValue?.(name);
      if (styleValue) return styleValue;
    } catch {}
    const style = String(element?.getAttribute?.('style') || '');
    const match = style.match(new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'i'));
    return match ? match[1].trim() : '';
  }

  function constructorSvgElementPaintValue(element, name) {
    const styleValue = constructorSvgStyleProperty(element, name);
    if (isConstructorSvgIconPaintColor(styleValue)) return styleValue;
    const attrValue = element?.getAttribute?.(name) || '';
    return isConstructorSvgIconPaintColor(attrValue) ? attrValue : '';
  }

  function extractConstructorSvgIconColor(value) {
    const svg = findConstructorSvgElement(value);
    if (!svg) return '';
    const elements = [svg].concat(Array.from(svg.querySelectorAll?.('*') || []));
    for (const element of elements) {
      const stroke = constructorSvgElementPaintValue(element, 'stroke');
      if (stroke) return stroke;
    }
    for (const element of elements) {
      const fill = constructorSvgElementPaintValue(element, 'fill');
      if (fill) return fill;
    }
    return '';
  }

  function setConstructorSvgStyleProperty(element, name, value) {
    try {
      element?.style?.setProperty?.(name, value);
      return;
    } catch {}
    const style = String(element?.getAttribute?.('style') || '');
    if (!style) {
      element?.setAttribute?.('style', `${name}: ${value};`);
      return;
    }
    const re = new RegExp(`(^|;)\\s*${name}\\s*:\\s*[^;]+`, 'i');
    const next = re.test(style)
      ? style.replace(re, `$1 ${name}: ${value}`)
      : `${style.replace(/\s*;?\s*$/, ';')} ${name}: ${value};`;
    element?.setAttribute?.('style', next.trim());
  }

  function normalizeConstructorSvgPaintColor(element, name) {
    const styleValue = constructorSvgStyleProperty(element, name);
    if (isConstructorSvgIconPaintColor(styleValue)) {
      setConstructorSvgStyleProperty(element, name, 'currentColor');
    }
    const attrValue = element?.getAttribute?.(name) || '';
    if (isConstructorSvgIconPaintColor(attrValue)) element.setAttribute(name, 'currentColor');
  }

  function normalizeConstructorSvgIconStyles(styles, fallbackColor = '') {
    const result = Object.assign({}, styles || {});
    const color = [result.color, result.stroke, result.fill, fallbackColor]
      .find(isConstructorSvgIconPaintColor);
    if (color) result.color = color;
    delete result.stroke;
    delete result.fill;
    return result;
  }

  function isConstructorSvgIconTag(tag) {
    const type = String(readObjectValue(tag, 'type') || '').toLowerCase();
    const widgetName = String(readObjectValue(tag, 'widgetName') || '').toLowerCase();
    const className = String(readObjectValue(tag, 'className') || '').toLowerCase();
    return type === 'tt_svg_icon' || widgetName === 'tt_svg_icon' || className === 'svg-icon';
  }

  function constructorStylesForTag(tag, styles, fallbackColor = '') {
    return isConstructorSvgIconTag(tag)
      ? normalizeConstructorSvgIconStyles(styles, fallbackColor)
      : styles;
  }

  function normalizeConstructorSvgMarkup(value) {
    let source = String(value || '').trim();
    if (!source) return '';
    if (!/<svg[\s>]/i.test(source)) {
      source = `<svg viewBox="0 0 24 24">${source}</svg>`;
    }

    const svg = findConstructorSvgElement(source);
    if (!svg) return source;

    const normalized = svg.cloneNode(true);
    if (!normalized.getAttribute('xmlns')) normalized.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    if (!normalized.getAttribute('viewBox')) {
      const width = Number(String(normalized.getAttribute('width') || '').replace(/[^\d.]/g, ''));
      const height = Number(String(normalized.getAttribute('height') || '').replace(/[^\d.]/g, ''));
      normalized.setAttribute('viewBox', `0 0 ${width || 24} ${height || 24}`);
    }

    const children = Array.from(normalized.querySelectorAll('*'));
    const hasFill = normalized.hasAttribute('fill')
      || /(?:^|;)\s*fill\s*:/i.test(normalized.getAttribute('style') || '')
      || children.some((child) => child.hasAttribute('fill') || /(?:^|;)\s*fill\s*:/i.test(child.getAttribute('style') || ''));
    const hasStroke = normalized.hasAttribute('stroke')
      || /(?:^|;)\s*stroke\s*:/i.test(normalized.getAttribute('style') || '')
      || children.some((child) => child.hasAttribute('stroke') || /(?:^|;)\s*stroke\s*:/i.test(child.getAttribute('style') || ''));
    const hasLineShape = children.some((child) => {
      const tagName = String(child.tagName || '').toLowerCase();
      if (tagName === 'line' || tagName === 'polyline') return true;
      if (tagName !== 'path') return false;
      return !/[zZ]/.test(child.getAttribute('d') || '');
    });
    if (hasLineShape) {
      if (!hasFill) normalized.setAttribute('fill', 'none');
      if (!hasStroke) {
        normalized.setAttribute('stroke', 'currentColor');
        normalized.setAttribute('stroke-width', '2');
        normalized.setAttribute('stroke-linecap', 'round');
        normalized.setAttribute('stroke-linejoin', 'round');
      }
    } else if (!hasFill && !hasStroke) {
      normalized.setAttribute('fill', 'currentColor');
    }
    if (hasStroke && !normalized.getAttribute('stroke-linecap') && !children.some((child) => child.hasAttribute('stroke-linecap'))) {
      normalized.setAttribute('stroke-linecap', 'round');
    }
    if (hasStroke && !normalized.getAttribute('stroke-linejoin') && !children.some((child) => child.hasAttribute('stroke-linejoin'))) {
      normalized.setAttribute('stroke-linejoin', 'round');
    }
    if (hasStroke && !normalized.getAttribute('stroke-width') && !children.some((child) => child.hasAttribute('stroke-width'))) {
      normalized.setAttribute('stroke-width', '2');
    }
    // Дефект 2.12: если в иконке несколько разных явных цветов (мультиколор),
    // не схлопываем их в currentColor — иначе потеряем оригинальную палитру.
    const paintElements = [normalized].concat(children);
    const distinctPaintColors = new Set();
    paintElements.forEach((element) => {
      ['stroke', 'fill'].forEach((paintName) => {
        const styleValue = constructorSvgStyleProperty(element, paintName);
        if (isConstructorSvgIconPaintColor(styleValue)) distinctPaintColors.add(String(styleValue).trim().toLowerCase());
        const attrValue = element?.getAttribute?.(paintName) || '';
        if (isConstructorSvgIconPaintColor(attrValue)) distinctPaintColors.add(String(attrValue).trim().toLowerCase());
      });
    });
    if (distinctPaintColors.size <= 1) {
      paintElements.forEach((element) => {
        normalizeConstructorSvgPaintColor(element, 'stroke');
        normalizeConstructorSvgPaintColor(element, 'fill');
      });
    }
    return normalized.outerHTML.trim();
  }

  function isConstructorSvgMarkupCandidate(value) {
    const text = String(value || '').trim();
    return /<svg[\s>]/i.test(text) || /<(path|circle|rect|line|polyline|polygon|ellipse|g|use)\b/i.test(text);
  }

  function constructorDataPayloadValue(value) {
    if (!value || typeof value !== 'object') return value;
    if (Object.prototype.hasOwnProperty.call(value, 'value')) return value.value;
    return value.ru || value.en || value.html || value.text || value.svg || value;
  }

  function constructorTagNestedValue(tag, containerKey, valueKey) {
    const container = readObjectValue(tag, containerKey);
    if (!container || typeof container !== 'object') return '';
    return constructorDataPayloadValue(readObjectValue(container, valueKey));
  }

  function constructorSvgMarkupFromTag(tag) {
    const candidates = [
      constructorTagNestedValue(tag, 'data', 'text'),
      constructorTagNestedValue(tag, 'attr', 'text'),
      constructorTagNestedValue(tag, 'attrs', 'text'),
      readObjectValue(tag, 'svg'),
      readObjectValue(tag, 'svgBody'),
      readObjectValue(tag, 'svg_body'),
      readObjectValue(tag, 'html'),
      readObjectValue(tag, 'innerHTML'),
      readObjectValue(tag, 'text'),
      decodeConstructorSvgDataUrl(constructorTagNestedValue(tag, 'data', 'src')),
      decodeConstructorSvgDataUrl(constructorTagNestedValue(tag, 'attr', 'src')),
      decodeConstructorSvgDataUrl(readObjectValue(tag, 'src'))
    ];

    for (const candidate of candidates) {
      const text = String(candidate || '').trim();
      if (!isConstructorSvgMarkupCandidate(text)) continue;
      const svg = normalizeConstructorSvgMarkup(text);
      if (svg) return svg;
    }
    return '';
  }

  function setConstructorSvgTagData(tag, svgMarkup) {
    const value = normalizeConstructorSvgMarkup(svgMarkup);
    if (!tag || !value) return false;
    const payload = { type: 'HTML', value };
    let applied = false;
    try {
      if (typeof tag.setData === 'function') {
        tag.setData('text', payload);
        applied = true;
      }
    } catch {}

    if (!applied) {
      const data = readObjectValue(tag, 'data');
      if (data && typeof data === 'object') {
        try {
          if (typeof data.set === 'function') {
            data.set('text', payload);
            applied = true;
          }
        } catch {}
      }
      if (!applied) {
        tag.data = Object.assign({}, data && typeof data === 'object' ? data : {}, { text: payload });
        applied = true;
      }
    }
    if (!readObjectValue(tag, 'dataSource')) tag.dataSource = 'from_parent';
    return applied;
  }

  function constructorClipboardTagById(tags, id) {
    if (!tags || !id) return null;
    const key = String(id);
    return tags[key] || tags[key.replace(/_\d+$/, '')] || null;
  }

  function collectConstructorClipboardSvgMarkups(data) {
    const tags = data?.copiedLayout?.tree?.tags || {};
    const rootId = data?.copiedLayout?.tree?.root || getClipboardRootId(data);
    const result = [];
    const seen = new Set();

    const visit = (id) => {
      const tag = constructorClipboardTagById(tags, id);
      const tagId = String(readObjectValue(tag, 'id') || id || '');
      if (!tag || !tagId || seen.has(tagId)) return;
      seen.add(tagId);
      if (isConstructorSvgIconTag(tag)) {
        const svg = constructorSvgMarkupFromTag(tag);
        if (svg && setConstructorSvgTagData(tag, svg)) result.push(svg);
      }
      getChildIds(tag).forEach(visit);
    };

    visit(rootId);
    Object.entries(tags).forEach(([id, tag]) => {
      const tagId = String(readObjectValue(tag, 'id') || id || '');
      if (!seen.has(tagId)) visit(tagId);
    });

    return result;
  }

  function unwrapConstructorTextHtml(value) {
    const text = String(value || '').trim();
    if (!/^<\s*[a-z][\s\S]*>\s*$/i.test(text)) return { value: text, tagName: '' };
    let container = null;
    try {
      container = new DOMParser().parseFromString(text, 'text/html')?.body || null;
    } catch {}
    if (!container) {
      try {
        const template = document.createElement('template');
        template.innerHTML = text;
        container = template.content;
      } catch {}
    }
    const childNodes = Array.from(container?.childNodes || [])
      .filter((child) => child.nodeType !== 3 || String(child.textContent || '').trim());
    if (childNodes.length !== 1 || childNodes[0].nodeType !== 1) return { value: text, tagName: '' };
    const element = childNodes[0];
    const tagName = normalizeConstructorSourceTag(element.tagName);
    if (!CONSTRUCTOR_TEXT_TAG_NAMES.has(tagName)) return { value: text, tagName: '' };
    return {
      value: String(element.innerHTML || element.textContent || '').trim(),
      tagName
    };
  }

  function constructorHrefValue(node) {
    return String(node?.href ?? node?.url ?? node?.attrs?.href ?? node?.attributes?.href ?? '#');
  }

  function constructorNodeClasses(node) {
    return splitClassNames([
      node?.classes,
      node?.class,
      node?.className
    ].flat());
  }

  function normalizeConstructorSourceTag(value) {
    const tag = String(value || '').trim().toLowerCase();
    if (!/^[a-z][a-z0-9-]*$/.test(tag)) return '';
    if (CONSTRUCTOR_TEXT_TAG_NAMES.has(tag) || CONSTRUCTOR_CONTAINER_TAG_NAMES.has(tag) || tag === 'a' || tag === 'button' || tag === 'img' || tag === 'svg') return tag;
    return '';
  }

  function constructorNodeSourceTag(node) {
    const explicitTag = normalizeConstructorSourceTag(
      node?.sourceTag || node?.sourceTagName || node?.tagName || node?.htmlTag || node?.tag || node?.element
    );
    if (explicitTag) return explicitTag;
    const rawType = String(node?.type || '').trim().toLowerCase();
    return CONSTRUCTOR_TEXT_TAG_NAMES.has(rawType) ? rawType : '';
  }

  function constructorSelectorClassTokens(value) {
    const source = String(value || '').trim();
    const tokens = [];
    source.replace(/\.([_a-zA-Z-][_a-zA-Z0-9-]*)/g, (_, className) => {
      const normalized = sanitizeConstructorClassName(className);
      if (normalized && !tokens.includes(normalized)) tokens.push(normalized);
      return '';
    });
    if (!tokens.length && /^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(source) && !normalizeConstructorSourceTag(source)) {
      const normalized = sanitizeConstructorClassName(source);
      if (normalized) tokens.push(normalized);
    }
    return tokens;
  }

  function constructorSelectorTargetTag(value) {
    const parts = String(value || '')
      .replace(/#[^#.\s>+~:,[\]()]+/g, ' ')
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/:[_a-zA-Z-][_a-zA-Z0-9-]*(?:\([^)]*\))?/g, ' ')
      .split(/[\s>+~]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    const targetPart = parts[parts.length - 1] || '';
    const tag = targetPart
      .replace(/\.[_a-zA-Z-][_a-zA-Z0-9-]*/g, ' ')
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean)[0] || '';
    return normalizeConstructorSourceTag(tag);
  }

  function normalizeConstructorClassStyleSelector(value) {
    const source = String(value || '').trim();
    const sourceClasses = constructorSelectorClassTokens(source);
    const targetTag = constructorSelectorTargetTag(source);
    if (!sourceClasses.length && !targetTag) return null;
    if (!targetTag && sourceClasses.length === 1 && /[\s>+~]/.test(source.replace(/\.[_a-zA-Z-][_a-zA-Z0-9-]*/g, ''))) {
      return null;
    }
    const classParts = sourceClasses.length
      ? sourceClasses.concat(targetTag ? [targetTag] : [])
      : [targetTag];
    const className = classParts.length > 1
      ? classParts[0] + '__' + classParts.slice(1).join('__')
      : classParts[0];
    return {
      className: sanitizeConstructorClassName(className),
      sourceClasses,
      targetTag
    };
  }

  function classStyleValue(raw) {
    if (isPlainObject(raw) && (isPlainObject(raw.styles) || raw.styles !== undefined || raw.style !== undefined || raw.css !== undefined || raw.declarations !== undefined)) {
      return mergeStyleInputs(raw.styles, raw.style, raw.css, raw.declarations);
    }
    if (isPlainObject(raw)) {
      const cleaned = Object.assign({}, raw);
      delete cleaned.className;
      delete cleaned.class;
      delete cleaned.name;
      delete cleaned.selector;
      return normalizeStyleObject(cleaned);
    }
    return normalizeStyleObject(raw);
  }

  function classStyleEntries(value) {
    const result = [];
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (!isPlainObject(item)) return;
        const selector = normalizeConstructorClassStyleSelector(item.className || item.class || item.name || item.selector);
        const styles = classStyleValue(item);
        if (selector?.className && Object.keys(styles).length) result.push(Object.assign({}, selector, { styles }));
      });
      return result;
    }
    if (!isPlainObject(value)) return result;
    Object.entries(value).forEach(([key, raw]) => {
      const selector = normalizeConstructorClassStyleSelector(key);
      const styles = classStyleValue(raw);
      if (selector?.className && Object.keys(styles).length) result.push(Object.assign({}, selector, { styles }));
    });
    return result;
  }

  function addConstructorClassStyles(ctx, media, value) {
    classStyleEntries(value).forEach(({ className, sourceClasses, targetTag, styles }) => {
      const normalizedSourceClasses = (sourceClasses || []).map(ctx.stripClassPrefix).filter(Boolean);
      const normalizedTargetTag = normalizeConstructorSourceTag(targetTag);
      const targetTags = constructorSourceSelectorTargetTags(ctx, {
        sourceClasses: normalizedSourceClasses,
        targetTag: normalizedTargetTag
      });
      const nextStyles = normalizedTargetTag === 'svg' || targetTags.some(isConstructorSvgIconTag)
        ? normalizeConstructorSvgIconStyles(styles)
        : styles;
      const sourceClassParts = normalizedTargetTag
        ? normalizedSourceClasses.concat(normalizedTargetTag)
        : normalizedSourceClasses;
      const sourceClassName = sourceClassParts.length > 1
        ? sourceClassParts[0] + '__' + sourceClassParts.slice(1).join('__')
        : sourceClassParts[0] || ctx.stripClassPrefix(className);
      const finalClassName = ctx.classNameFor(sourceClassName);
      ctx.ensureClass(finalClassName);
      addConstructorSelector(ctx.mainSelectors, media, `.${finalClassName}`, nextStyles);
      if (normalizedSourceClasses.length > 1 || normalizedTargetTag) {
        ctx.compoundClassEntries.push({
          className: finalClassName,
          sourceClasses: normalizedSourceClasses,
          targetTag: normalizedTargetTag
        });
      }
    });
  }

  function addConstructorMediaClassStyles(ctx, value) {
    if (!isPlainObject(value)) return;
    Object.entries(value).forEach(([media, classStyles]) => {
      addConstructorClassStyles(ctx, media, classStyles);
    });
  }

  function stripConstructorCssComments(value) {
    return String(value || '').replace(/\/\*[\s\S]*?\*\//g, '');
  }

  function extractConstructorStyleBlocks(value) {
    const text = String(value || '');
    const blocks = [];
    text.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
      if (String(css || '').trim()) blocks.push(css);
      return '';
    });
    if (blocks.length) return blocks;
    return /(?:^|[\s}])\.[_a-zA-Z-][_a-zA-Z0-9-][^{]*\{/.test(text) ? [text] : [];
  }

  function findConstructorCssBlockEnd(source, openIndex) {
    let depth = 0;
    let quote = '';
    let escaped = false;
    for (let index = openIndex; index < source.length; index += 1) {
      const char = source[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (quote) {
        if (char === quote) quote = '';
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }
      if (char === '{') depth += 1;
      else if (char === '}') {
        depth -= 1;
        if (depth === 0) return index;
      }
    }
    return -1;
  }

  function splitConstructorCssSelectors(value) {
    const selectors = [];
    let current = '';
    let parenDepth = 0;
    String(value || '').split('').forEach((char) => {
      if (char === '(') parenDepth += 1;
      else if (char === ')' && parenDepth > 0) parenDepth -= 1;
      if (char === ',' && parenDepth === 0) {
        const selector = current.trim();
        if (selector) selectors.push(selector);
        current = '';
        return;
      }
      current += char;
    });
    const last = current.trim();
    if (last) selectors.push(last);
    return selectors;
  }

  function replaceConstructorCssTypeSelector(selectorText, tagName, replacement) {
    const tag = normalizeConstructorSourceTag(tagName);
    const to = String(replacement || '').trim();
    if (!tag || !to) return selectorText;
    const re = new RegExp(`(^|[\\s>+~,(])${escapeRegExp(tag)}(?=$|[\\s>+~.#:\\[\\]),])`, 'gi');
    return String(selectorText || '').replace(re, `$1${to}`);
  }

  function replaceConstructorCssClassSelector(selectorText, className, replacement) {
    const sourceClass = sanitizeConstructorClassName(className);
    const to = String(replacement || '').trim();
    if (!sourceClass || !to) return selectorText;
    return String(selectorText || '').replace(
      new RegExp(`\\.${escapeRegExp(sourceClass)}(?![-_a-zA-Z0-9])`, 'g'),
      to
    );
  }

  function replaceConstructorCssSelectorByRules(selectorText, replaceRules) {
    let next = String(selectorText || '').trim();
    if (!next || !replaceRules?.length) return next;

    replaceRules.forEach((rule) => {
      if (!rule?.from || !rule?.to) return;
      if (normalizeConstructorCssSelectorText(next) === normalizeConstructorCssSelectorText(rule.from)) {
        next = rule.to;
        return;
      }
      if (rule.sourceTag) {
        next = replaceConstructorCssTypeSelector(next, rule.sourceTag, rule.to);
        return;
      }
      if (rule.sourceClass) {
        next = replaceConstructorCssClassSelector(next, rule.sourceClass, rule.to);
      }
    });

    return next.trim();
  }

  function parseConstructorCssRules(cssText, media = 'screen', result = [], options = {}) {
    const source = stripConstructorCssComments(cssText);
    const replaceRules = options.replaceRules || activeBuilderReplaceRules(options);
    let index = 0;
    while (index < source.length) {
      const openIndex = source.indexOf('{', index);
      if (openIndex < 0) break;
      const selector = source.slice(index, openIndex).trim();
      const closeIndex = findConstructorCssBlockEnd(source, openIndex);
      if (closeIndex < 0) break;
      const body = source.slice(openIndex + 1, closeIndex).trim();
      const lowerSelector = selector.toLowerCase();

      if (lowerSelector.startsWith('@media')) {
        if (constructorMediaSupported(selector)) {
          parseConstructorCssRules(body, selector, result, Object.assign({}, options, { replaceRules }));
        } else if (Array.isArray(options.embedCss)) {
          // Дефект 2.6: media с min-width/диапазонами сохраняем целиком в Embed.
          options.embedCss.push(`${selector} {\n${body}\n}`);
        }
      } else if (selector && selector.startsWith('@')) {
        // Дефект 2.1: @keyframes/@font-face/@supports и прочие at-правила — в Embed.
        if (Array.isArray(options.embedCss) && body && !selector.includes(';')) {
          options.embedCss.push(`${selector} {\n${body}\n}`);
        }
      } else if (selector && !body.includes('{')) {
        const styles = parseStyleDeclarations(body);
        if (Object.keys(styles).length) {
          splitConstructorCssSelectors(selector).forEach((item) => {
            const selectorText = replaceConstructorCssSelectorByRules(item.trim(), replaceRules);
            const isRootPseudo = selectorText.toLowerCase() === ':root';
            if (!isRootPseudo && (selectorText.includes(':') || selectorText.includes('::'))) {
              // Дефект 2.1: псевдоклассы/псевдоэлементы (:hover, ::before...) слоями не выразить —
              // переносим правило в Embed с сохранением исходных деклараций, а не удаляем.
              if (Array.isArray(options.embedCss)) {
                const mediaText = (typeof media === 'string' && /^@media/i.test(media.trim())) ? media.trim() : '';
                const ruleText = `${selectorText} {\n${body}\n}`;
                options.embedCss.push(mediaText ? `${mediaText} {\n${ruleText}\n}` : ruleText);
              }
              return;
            }
            result.push({ media, selector: selectorText, styles });
          });
        }
      }

      index = closeIndex + 1;
    }
    return result;
  }

  function normalizeConstructorCssSelectorText(value) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\s*([>+~])\s*/g, '$1');
  }

  function constructorSourceCssRootMatcher(ctx, options = {}) {
    const rootSelectors = new Set(
      splitBuilderRuleValues(options.rootSelectors)
        .map(normalizeConstructorCssSelectorText)
        .filter(Boolean)
    );
    const rootClasses = new Set();
    splitBuilderRuleValues(options.rootClassStyles).forEach((item) => {
      const selector = normalizeConstructorClassStyleSelector(item);
      const className = ctx.stripClassPrefix(selector?.className);
      if (className) rootClasses.add(className);
    });

    return (selectorText) => {
      const normalizedSelector = normalizeConstructorCssSelectorText(selectorText);
      if (rootSelectors.has(normalizedSelector)) return true;
      const classSelector = normalizeConstructorClassStyleSelector(normalizedSelector);
      const className = ctx.stripClassPrefix(classSelector?.className);
      return !!className && rootClasses.has(className);
    };
  }

  function constructorHasSourceClass(ctx, className) {
    const sourceClassName = ctx.stripClassPrefix(className);
    if (!sourceClassName) return false;
    return Object.values(ctx.tags || {}).some((tag) => (
      tag?.id && tagHasSourceClass(ctx, tag.id, sourceClassName)
    ));
  }

  function constructorHasCompoundSourceTarget(ctx, sourceClasses) {
    const normalizedSourceClasses = (sourceClasses || []).map(ctx.stripClassPrefix).filter(Boolean);
    const targetClass = normalizedSourceClasses[normalizedSourceClasses.length - 1] || '';
    if (!targetClass) return false;
    if (normalizedSourceClasses.length < 2) return constructorHasSourceClass(ctx, targetClass);
    return Object.values(ctx.tags || {}).some((tag) => (
      tag?.id
      && tagHasSourceClass(ctx, tag.id, targetClass)
      && tagHasAncestorClassSequence(ctx, tag.id, normalizedSourceClasses)
    ));
  }

  function tagHasSourceTag(ctx, tagId, tagName) {
    const normalizedTag = normalizeConstructorSourceTag(tagName);
    return !!normalizedTag && ctx.tagSourceTags.get(tagId) === normalizedTag;
  }

  function tagHasAncestorClasses(ctx, tagId, sourceClasses) {
    const normalizedSourceClasses = (sourceClasses || []).map(ctx.stripClassPrefix).filter(Boolean);
    if (!normalizedSourceClasses.length) return true;
    let index = normalizedSourceClasses.length - 1;
    let parentId = ctx.tags[tagId]?.parent || '';
    while (parentId && index >= 0) {
      if (tagHasSourceClass(ctx, parentId, normalizedSourceClasses[index])) index -= 1;
      parentId = ctx.tags[parentId]?.parent || '';
    }
    return index < 0;
  }

  function constructorHasTaggedSourceTarget(ctx, sourceClasses, targetTag) {
    const normalizedTargetTag = normalizeConstructorSourceTag(targetTag);
    if (!normalizedTargetTag) return false;
    return Object.values(ctx.tags || {}).some((tag) => (
      tag?.id
      && tagHasSourceTag(ctx, tag.id, normalizedTargetTag)
      && tagHasAncestorClasses(ctx, tag.id, sourceClasses)
    ));
  }

  function shouldAddConstructorSourceCssRule(ctx, selectorText) {
    const selector = normalizeConstructorClassStyleSelector(selectorText);
    if (!selector) return false;
    if (selector.targetTag) return constructorHasTaggedSourceTarget(ctx, selector.sourceClasses, selector.targetTag);
    if (!selector.sourceClasses?.length) return false;
    if (selector.sourceClasses.length > 1) return constructorHasCompoundSourceTarget(ctx, selector.sourceClasses);
    return constructorHasSourceClass(ctx, selector.sourceClasses[0]);
  }

  function addConstructorRootStyles(ctx, media, styles) {
    const rootTag = ctx.tags[ctx.rootTagId || ''];
    if (!rootTag) return false;
    addConstructorSelector(ctx.designSelectors, media, constructorUniqueSelector(rootTag), styles);
    return true;
  }

  function constructorSourceSelectorTargetTags(ctx, selector) {
    if (!selector) return [];
    if (selector.targetTag) {
      return Object.values(ctx.tags || {}).filter((tag) => (
        tag?.id
        && tagHasSourceTag(ctx, tag.id, selector.targetTag)
        && tagHasAncestorClasses(ctx, tag.id, selector.sourceClasses)
      ));
    }

    const sourceClasses = selector.sourceClasses || [];
    const targetClass = sourceClasses[sourceClasses.length - 1] || '';
    if (!targetClass) return [];
    return Object.values(ctx.tags || {}).filter((tag) => (
      tag?.id
      && tagHasSourceClass(ctx, tag.id, targetClass)
      && (sourceClasses.length < 2 || tagHasAncestorClassSequence(ctx, tag.id, sourceClasses))
    ));
  }

  function addConstructorSourceCssRuleStyles(ctx, rule) {
    const selector = normalizeConstructorClassStyleSelector(rule.selector);
    if (!selector) return false;

    if (selector.targetTag) {
      const targets = constructorSourceSelectorTargetTags(ctx, selector);
      targets.forEach((tag) => {
        addConstructorSelector(ctx.designSelectors, rule.media, constructorUniqueSelector(tag), constructorStylesForTag(tag, rule.styles));
      });
      return !!targets.length;
    }

    if (!selector.sourceClasses?.length) return false;
    const targetClass = ctx.stripClassPrefix(selector.sourceClasses[selector.sourceClasses.length - 1] || '');
    if (!targetClass || !constructorHasSourceClass(ctx, targetClass)) return false;
    const finalClassName = ctx.classNameFor(targetClass);
    const targetTags = constructorSourceSelectorTargetTags(ctx, selector);
    const styles = targetTags.some(isConstructorSvgIconTag)
      ? normalizeConstructorSvgIconStyles(rule.styles)
      : rule.styles;
    ctx.ensureClass(finalClassName);
    addConstructorSelector(ctx.mainSelectors, rule.media, `.${finalClassName}`, styles);
    return true;
  }

  function addConstructorSourceCssClassStyles(ctx, cssSource, options = {}) {
    const isRootSelector = constructorSourceCssRootMatcher(ctx, options);
    const replaceRules = activeBuilderReplaceRules(options);
    extractConstructorStyleBlocks(cssSource).forEach((block) => {
      parseConstructorCssRules(block, 'screen', [], { replaceRules, embedCss: ctx.embedCssRules }).forEach((rule) => {
        if (isRootSelector(rule.selector) && addConstructorRootStyles(ctx, rule.media, rule.styles)) return;
        addConstructorSourceCssRuleStyles(ctx, rule);
      });
    });
  }

  function addConstructorTagClass(ctx, tag, className) {
    if (!tag || !className) return false;
    const id = ctx.ensureClass(className);
    if (!id) return false;
    const current = Array.isArray(tag.classNameIds) ? tag.classNameIds : [];
    if (current.includes(id)) return false;
    tag.classNameIds = current.concat(id);
    return true;
  }

  function addConstructorReplacementClasses(ctx, tag, sourceTag = '') {
    if (!ctx?.replaceRules?.length || !tag?.id) return;
    const normalizedSourceTag = normalizeConstructorSourceTag(sourceTag);
    const sourceClasses = ctx.tagSourceClasses.get(tag.id) || new Set();
    let changed = false;

    ctx.replaceRules.forEach((rule) => {
      if (!rule?.targetClass) return;
      const matchesTag = rule.sourceTag && normalizedSourceTag === rule.sourceTag;
      const matchesClass = rule.sourceClass && sourceClasses.has(ctx.stripClassPrefix(rule.sourceClass));
      if (!matchesTag && !matchesClass) return;
      changed = addConstructorTagClass(ctx, tag, rule.targetClass) || changed;
      sourceClasses.add(ctx.stripClassPrefix(rule.targetClass));
    });

    if (changed || sourceClasses.size) ctx.tagSourceClasses.set(tag.id, sourceClasses);
  }

  function tagHasSourceClass(ctx, tagId, className) {
    return !!ctx.tagSourceClasses.get(tagId)?.has?.(className);
  }

  function tagHasAncestorClassSequence(ctx, tagId, sourceClasses) {
    let index = sourceClasses.length - 2;
    let parentId = ctx.tags[tagId]?.parent || '';
    while (parentId && index >= 0) {
      if (tagHasSourceClass(ctx, parentId, sourceClasses[index])) index -= 1;
      parentId = ctx.tags[parentId]?.parent || '';
    }
    return index < 0;
  }

  function applyConstructorCompoundClasses(ctx) {
    if (!ctx?.compoundClassEntries?.length) return;
    ctx.compoundClassEntries.forEach((entry) => {
      const sourceClasses = entry?.sourceClasses || [];
      const targetTag = normalizeConstructorSourceTag(entry?.targetTag);
      if (entry?.className && targetTag) {
        Object.values(ctx.tags).forEach((tag) => {
          if (!tag?.id || !tagHasSourceTag(ctx, tag.id, targetTag)) return;
          if (!tagHasAncestorClasses(ctx, tag.id, sourceClasses)) return;
          addConstructorTagClass(ctx, tag, entry.className);
        });
        return;
      }
      const targetClass = sourceClasses[sourceClasses.length - 1] || '';
      if (!entry?.className || !targetClass) return;

      let matched = false;
      Object.values(ctx.tags).forEach((tag) => {
        if (!tag?.id || !tagHasSourceClass(ctx, tag.id, targetClass)) return;
        if (!tagHasAncestorClassSequence(ctx, tag.id, sourceClasses)) return;
        matched = addConstructorTagClass(ctx, tag, entry.className) || matched;
      });

      if (matched) return;
      Object.values(ctx.tags).forEach((tag) => {
        if (tag?.id && tagHasSourceClass(ctx, tag.id, targetClass)) {
          addConstructorTagClass(ctx, tag, entry.className);
        }
      });
    });
  }

  function constructorSelectorRuleValueKey(rule) {
    const value = selectorCssValue(rule);
    return value === '' ? '' : value.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  // Дефект 2.8: убираем из per-layer (design) селекторов свойства, которые уже заданы
  // классами этого тега с тем же значением, чтобы не дублировать стили. Консервативно:
  // удаляем только при однозначном совпадении (нет конфликта между классами).
  function dedupeConstructorLayerStyles(ctx) {
    if (!ctx || !ctx.designSelectors) return;
    const idToClassName = new Map();
    [].concat(ctx.mainClassItems || [], ctx.designClassItems || []).forEach((item) => {
      if (item && item.id) idToClassName.set(item.id, item.value);
    });
    Object.values(ctx.tags || {}).forEach((tag) => {
      if (!tag || !tag.id) return;
      const classNames = (Array.isArray(tag.classNameIds) ? tag.classNameIds : [])
        .map((id) => idToClassName.get(id))
        .filter(Boolean);
      if (!classNames.length) return;
      const uniqueSelector = constructorUniqueSelector(tag);
      Object.keys(ctx.designSelectors).forEach((key) => {
        const sepIndex = key.indexOf('/');
        if (sepIndex < 0) return;
        const media = key.slice(0, sepIndex);
        const selectorText = key.slice(sepIndex + 1);
        if (selectorText !== uniqueSelector) return;
        const designEntry = ctx.designSelectors[key];
        if (!designEntry || !designEntry.rules) return;
        const classValues = new Map();
        classNames.forEach((className) => {
          const classEntry = ctx.mainSelectors[`${media}/.${className}`];
          if (!classEntry || !classEntry.rules) return;
          Object.entries(classEntry.rules).forEach(([name, rule]) => {
            if (!classValues.has(name)) classValues.set(name, new Set());
            classValues.get(name).add(constructorSelectorRuleValueKey(rule));
          });
        });
        Object.keys(designEntry.rules).forEach((name) => {
          const values = classValues.get(name);
          if (!values || values.size !== 1) return;
          const designValue = constructorSelectorRuleValueKey(designEntry.rules[name]);
          if (designValue !== '' && values.has(designValue)) delete designEntry.rules[name];
        });
        if (!Object.keys(designEntry.rules).length) delete ctx.designSelectors[key];
      });
    });
  }

  function createConstructorBuildContext(options = {}) {
    const usedIds = new Set();
    const usedClassIds = new Set();
    const mainClassItems = [];
    const designClassItems = [];
    const classItems = mainClassItems;
    const mainClassByName = new Map();
    const designClassByName = new Map();
    const classByName = new Map();
    const replaceRules = activeBuilderReplaceRules(options);
    const preservedClassNames = new Set([
      ...splitBuilderRuleValues(options.keepClasses).map(sanitizeConstructorClassName),
      ...builderReplaceTargetClasses(options)
    ].filter(Boolean));
    const classRenameMap = new Map();
    const tagSourceClasses = new Map();
    const tagSourceTags = new Map();
    const compoundClassEntries = [];

    const stripClassPrefix = (value) => {
      return sanitizeConstructorClassName(value);
    };

    const replacementClassNameFor = (value) => {
      const className = stripClassPrefix(value);
      if (!className) return '';
      const rule = replaceRules.find((item) => (
        item?.sourceClass
        && item?.targetClass
        && stripClassPrefix(item.sourceClass) === className
      ));
      return sanitizeConstructorClassName(rule?.targetClass || '');
    };

    const classNameFor = (value, classOptions = {}) => {
      const rawClassName = sanitizeConstructorClassName(value);
      const replacementClassName = classOptions.system ? '' : replacementClassNameFor(rawClassName);
      const className = replacementClassName || rawClassName;
      if (!className) return '';
      if (!classOptions.system && classRenameMap.has(rawClassName)) return classRenameMap.get(rawClassName);
      if (classRenameMap.has(className)) return classRenameMap.get(className);
      if (classOptions.system || CONSTRUCTOR_SYSTEM_CLASS_NAMES.has(className) || preservedClassNames.has(className)) return className;
      const availableClassName = className;
      classRenameMap.set(rawClassName, availableClassName);
      classRenameMap.set(className, availableClassName);
      classRenameMap.set(availableClassName, availableClassName);
      return availableClassName;
    };

    const ensureClass = (value, classOptions = {}) => {
      const className = classNameFor(value, classOptions);
      if (!className) return '';
      const targetItems = classOptions.collection === 'design' ? designClassItems : mainClassItems;
      const targetClassByName = classOptions.collection === 'design' ? designClassByName : mainClassByName;
      if (targetClassByName.has(className)) return targetClassByName.get(className).id;
      const id = makeTaptopObjectId(usedClassIds, 'class_i');
      const item = { id, value: className };
      targetClassByName.set(className, item);
      if (!classByName.has(className)) classByName.set(className, item);
      targetItems.push(item);
      return id;
    };

    return {
      usedIds,
      tags: {},
      classItems,
      mainClassItems,
      designClassItems,
      classByName,
      mainClassByName,
      designClassByName,
      classNameFor,
      stripClassPrefix,
      replacementClassNameFor,
      ensureClass,
      tagSourceClasses,
      tagSourceTags,
      replaceRules,
      compoundClassEntries,
      mainSelectors: {},
      designSelectors: {},
      embedCssRules: [],
      layerCount: 0,
      embedCount: 0
    };
  }

  function classNameCollectionFromItems(items) {
    const map = {};
    const countMap = {};
    const sortMap = {};
    items.forEach((item, index) => {
      map[item.id] = item;
      countMap[item.value] = Math.max(countMap[item.value] || 0, 1);
      sortMap[item.id] = items[index + 1]?.id || '';
    });
    return {
      map,
      countMap,
      sortMap,
      head: items[0] || undefined
    };
  }

  function constructorUniqueClassName(tag) {
    return `${tag.className}--u-${tag.id}`;
  }

  function constructorUniqueSelector(tag) {
    return `.${constructorUniqueClassName(tag)}`;
  }

  function addConstructorLayerStyles(ctx, tag, node) {
    const rawSvgColor = isConstructorSvgIconTag(tag) ? extractConstructorSvgIconColor(constructorSvgValue(node)) : '';
    const styles = constructorStylesForTag(
      tag,
      mergeStyleInputs(node?.styles, node?.style, node?.css),
      rawSvgColor
    );
    addConstructorSelector(ctx.designSelectors, 'screen', constructorUniqueSelector(tag), styles);

    const mediaStyles = isPlainObject(node?.mediaStyles)
      ? node.mediaStyles
      : isPlainObject(node?.responsive)
        ? node.responsive
        : isPlainObject(node?.breakpoints)
          ? node.breakpoints
          : null;
    if (mediaStyles) {
      Object.entries(mediaStyles).forEach(([media, mediaStyle]) => {
        addConstructorSelector(ctx.designSelectors, media, constructorUniqueSelector(tag), constructorStylesForTag(tag, normalizeStyleObject(mediaStyle)));
      });
    }

    addConstructorClassStyles(ctx, 'screen',
      node?.classStyles || node?.classStyle || node?.stylesByClass || node?.cssByClass
    );
    addConstructorMediaClassStyles(ctx,
      node?.mediaClassStyles || node?.classMediaStyles || node?.responsiveClassStyles || node?.classBreakpoints
    );
  }

  function applyConstructorData(tag, node, reservedKeys = new Set()) {
    const sources = [
      isPlainObject(node?.attrs) ? node.attrs : null,
      isPlainObject(node?.attributes) ? node.attributes : null,
      isPlainObject(node?.data) ? node.data : null
    ].filter(Boolean);
    const data = {};
    sources.forEach((source) => {
      Object.entries(source).forEach(([key, value]) => {
        if (reservedKeys.has(key) || value === undefined || value === null) return;
        const dataKey = normalizeConstructorDataKey(key);
        if (!dataKey) return;
        data[dataKey] = makeConstructorDataValue(value);
      });
    });
    if (Object.keys(data).length) {
      tag.data = Object.assign({}, tag.data || {}, data);
      tag.dataSource = tag.dataSource || 'from_parent';
    }
  }

  function makeConstructorTagBase(ctx, node, type, parentId) {
    const id = makeTaptopObjectId(ctx.usedIds, 'i');
    const baseClass = constructorBaseClass(type);
    const sourceTag = constructorNodeSourceTag(node);
    addConstructorSystemClassStyle(ctx, baseClass);
    const uniqueClassId = ctx.ensureClass(`${baseClass}--u-${id}`, { system: true, collection: 'design' });
    const classNameIds = [
      ctx.ensureClass(baseClass, { system: true }),
      uniqueClassId
    ];
    const nodeClasses = constructorNodeClasses(node);
    nodeClasses.forEach((className) => {
      const idValue = ctx.ensureClass(className);
      if (idValue && !classNameIds.includes(idValue)) classNameIds.push(idValue);
    });
    if (nodeClasses.includes('helper--d-none')) {
      addConstructorSelector(ctx.mainSelectors, 'screen', '.helper--d-none', { display: 'none' });
    }
    const tag = {
      id,
      className: baseClass,
      classNameIds: classNameIds.filter(Boolean),
      dataAccess: 7
    };
    ctx.tagSourceClasses.set(id, new Set(
      nodeClasses
        .map((className) => ctx.stripClassPrefix(ctx.classNameFor(className)))
        .filter(Boolean)
    ));
    if (sourceTag) ctx.tagSourceTags.set(id, sourceTag);
    addConstructorReplacementClasses(ctx, tag, sourceTag);
    if (parentId) tag.parent = parentId;
    const layerName = type === 'embed' && nodeClasses.includes('helper--d-none')
      ? 'script'
      : nodeClasses[0] || sourceTag || baseClass;
    tag.name = sanitizeTaptopName(layerName, baseClass);
    return tag;
  }

  function imageValueFromConstructorSource(src, ctx) {
    const source = String(src || '/d/fgs16_image-placeholder2.png').trim() || '/d/fgs16_image-placeholder2.png';
    const isExternalSource = /^https?:\/\//i.test(source) || /^\/\//.test(source) || /^data:image\//i.test(source);
    const ext = parseDataImageUrl(source)?.mimeType
      ? imageExtFromMime(parseDataImageUrl(source).mimeType)
      : (source.match(/\.([a-z0-9]+)(?:[?#]|$)/i)?.[1] || 'png').toLowerCase();
    const filename = isExternalSource ? '' : source.split('/').pop()?.split('?')[0] || `ai-${Date.now()}.${ext}`;
    return {
      ext,
      filename,
      image_height: Number(ctx?.height || 0) || 0,
      image_id: 0,
      image_width: Number(ctx?.width || 0) || 0,
      name: filename,
      size: source.startsWith('data:') ? Math.round(source.length * 0.75) : 0,
      src: source,
      ver_id: Number(currentTaptopVersionInfo().verId || 0) || 0
    };
  }

  function buildConstructorImageLayer(ctx, node, parentId) {
    const tag = makeConstructorTagBase(ctx, node, 'image', parentId);
    tag.widgetName = 'tt_image';
    tag.widgetSettings = {
      screen: {
        lockRatio: true,
        objectFit: String(node?.objectFit || node?.fit || 'cover')
      }
    };
    tag.type = 'tt_image';
    tag.alias = 'Image';
    tag.can = ['SELECT', 'SET_ATTR_SRC', 'SET_ATTR_ALT', 'SET_ATTR_TITLE'];
    ctx.tags[tag.id] = tag;
    ctx.layerCount += 1;
    applyConstructorData(tag, node, new Set(['src', 'alt', 'title']));
    addConstructorLayerStyles(ctx, tag, node);

    const imageId = makeTaptopObjectId(ctx.usedIds, 'i');
    const src = node?.src ?? node?.image ?? node?.url ?? node?.attrs?.src ?? '';
    const alt = String(node?.alt ?? node?.attrs?.alt ?? '');
    const title = String(node?.title ?? node?.attrs?.title ?? '');
    const imageValue = imageValueFromConstructorSource(src, node);
    tag.data = Object.assign({}, tag.data || {}, {
      alt: makeConstructorDataValue(alt),
      image: {
        type: 'IMAGE2',
        value: imageValue
      },
      title: makeConstructorDataValue(title)
    });
    tag.dataSource = tag.dataSource || 'from_parent';
    const imageTag = {
      id: imageId,
      widgetName: 'image__img',
      widgetExportSettings: {
        image_params: {
          width: String(node?.width || 0),
          height: String(node?.height || 0),
          method: 'resize'
        }
      },
      parent: tag.id,
      tagName: 'img',
      className: 'image__img',
      classNameIds: [ctx.ensureClass('image__img', { system: true })].filter(Boolean),
      attr: {
        alt,
        src: imageValue.src,
        title
      },
      data: {
        alt: makeConstructorDataValue(alt),
        src: {
          type: 'IMAGE2',
          value: imageValue
        },
        title: makeConstructorDataValue(title)
      },
      dataSource: 'from_parent',
      dataAccess: 7
    };
    addConstructorSystemClassStyle(ctx, 'image__img');
    tag.children = [imageId];
    ctx.tags[imageId] = imageTag;
    return tag.id;
  }

  function buildConstructorEmbedStub(ctx, parentId) {
    const stubId = makeTaptopObjectId(ctx.usedIds, 'i');
    const hintId = makeTaptopObjectId(ctx.usedIds, 'i');
    const iconId = makeTaptopObjectId(ctx.usedIds, 'i');
    const textWrapId = makeTaptopObjectId(ctx.usedIds, 'i');
    const titleId = makeTaptopObjectId(ctx.usedIds, 'i');
    const emptyId = makeTaptopObjectId(ctx.usedIds, 'i');
    const noteId = makeTaptopObjectId(ctx.usedIds, 'i');

    ctx.tags[stubId] = {
      id: stubId,
      parent: parentId,
      className: 'embed__stub',
      classNameIds: [ctx.ensureClass('embed__stub', { system: true })].filter(Boolean),
      children: [hintId],
      dataAccess: 7
    };
    ctx.tags[hintId] = {
      id: hintId,
      parent: stubId,
      className: 'embed__hint',
      classNameIds: [ctx.ensureClass('embed__hint', { system: true })].filter(Boolean),
      children: [iconId, textWrapId],
      dataAccess: 7
    };
    ctx.tags[iconId] = {
      id: iconId,
      parent: hintId,
      className: 'embed__icon',
      classNameIds: [ctx.ensureClass('embed__icon', { system: true })].filter(Boolean),
      dataAccess: 7
    };
    ctx.tags[textWrapId] = {
      id: textWrapId,
      parent: hintId,
      className: 'embed__hint-text',
      classNameIds: [ctx.ensureClass('embed__hint-text', { system: true })].filter(Boolean),
      children: [titleId, emptyId, noteId],
      dataAccess: 7
    };
    ctx.tags[titleId] = {
      id: titleId,
      parent: textWrapId,
      className: 'embed__hint-title',
      classNameIds: [ctx.ensureClass('embed__hint-title', { system: true })].filter(Boolean),
      data: { text: { type: 'HTML', value: 'Пользовательский код' } },
      dataSource: 'from_parent',
      dataAccess: 7
    };
    ctx.tags[emptyId] = {
      id: emptyId,
      parent: textWrapId,
      className: 'embed__hint-empty-note',
      classNameIds: [ctx.ensureClass('embed__hint-empty-note', { system: true })].filter(Boolean),
      data: { text: { type: 'HTML', value: 'Дважды щелкните, чтобы встроить пользовательский код' } },
      dataSource: 'from_parent',
      dataAccess: 7
    };
    ctx.tags[noteId] = {
      id: noteId,
      parent: textWrapId,
      className: 'embed__hint-note',
      classNameIds: [ctx.ensureClass('embed__hint-note', { system: true })].filter(Boolean),
      data: { text: { type: 'HTML', value: 'Этот код будет работать только на опубликованн��м/��кспортированном проекте' } },
      dataSource: 'from_parent',
      dataAccess: 7
    };
    return stubId;
  }

  function buildConstructorLayer(ctx, rawNode, parentId = '') {
    const node = typeof rawNode === 'string' ? { type: 'text', text: rawNode } : (rawNode || {});
    const type = normalizeConstructorLayerType(node.type || node.tag || node.element || node.widget);
    if (type === 'image') return buildConstructorImageLayer(ctx, node, parentId);

    const tag = makeConstructorTagBase(ctx, node, type, parentId);
    if (type === 'text') {
      const rawTextValue = constructorTextValue(node);
      const unwrappedText = unwrapConstructorTextHtml(rawTextValue);
      const textTagName = constructorNodeSourceTag(node) || unwrappedText.tagName;
      tag.widgetName = 'text';
      tag.type = 'text';
      if (CONSTRUCTOR_TEXT_TAG_NAMES.has(textTagName)) {
        tag.tagName = textTagName;
        ctx.tagSourceTags.set(tag.id, textTagName);
        addConstructorReplacementClasses(ctx, tag, textTagName);
      }
      tag.can = ['SELECT', 'SET_TEXT'];
      tag.data = {
        text: {
          type: 'HTML',
          value: unwrappedText.value
        }
      };
      tag.dataSource = 'from_parent';
    } else if (type === 'link') {
      tag.widgetName = 'tt_link_universal';
      tag.widgetSettings = {
        screen: {
          type: 'link',
          eventName: 'click',
          eventElement: 'self',
          eventAction: '',
          displayType: '',
          selectedTag: '',
          linkType: 'link',
          blank: !!node.blank
        }
      };
      tag.type = 'tt_link_block';
      tag.tagName = 'a';
      tag.alias = 'Link Block';
      tag.can = ['SELECT', 'INSERT', 'SET_LINK_UNIVERSAL'];
      tag.data = {
        href: makeConstructorDataValue(constructorHrefValue(node)),
        'data-action-element': makeConstructorDataValue('')
      };
      tag.dataSource = 'from_parent';
    } else if (type === 'svg') {
      tag.widgetName = 'tt_svg_icon';
      tag.type = 'tt_svg_icon';
      tag.tagName = 'span';
      tag.alias = 'svg icon';
      tag.can = ['SELECT', 'SET_ATTR_SRC_SVG'];
      tag.data = {
        text: {
          type: 'HTML',
          value: normalizeConstructorSvgMarkup(constructorSvgValue(node))
        }
      };
      tag.dataSource = 'from_parent';
    } else if (type === 'embed') {
      tag.widgetName = 'tt_embed';
      tag.type = 'tt_embed';
      tag.can = ['SELECT', 'SET_EMBED_CODE'];
      tag.embedCode = wrapRawJsInCode(String(node.embedCode || node.code || node.html || node.text || ''));
      tag.children = [buildConstructorEmbedStub(ctx, tag.id)];
      ctx.embedCount += 1;
    } else if (type === 'section') {
      tag.widgetName = 'section';
      tag.type = 'section';
      tag.tagName = constructorNodeSourceTag(node) || 'section';
      tag.alias = 'Section';
      tag.can = ['SELECT', 'INSERT'];
    } else {
      tag.widgetName = 'div';
      tag.type = 'div';
      const sourceTag = constructorNodeSourceTag(node);
      if (sourceTag && sourceTag !== 'div') tag.tagName = sourceTag;
      tag.alias = constructorAlias(type);
      tag.can = ['SELECT', 'INSERT'];
    }

    ctx.tags[tag.id] = tag;
    ctx.layerCount += 1;
    applyConstructorData(tag, node, new Set(['href', 'src', 'text', 'html', 'svg', 'svgBody', 'svg_body']));
    addConstructorLayerStyles(ctx, tag, node);

    if (type !== 'text' && type !== 'embed') {
      const childIds = asArray(node.children || node.layers || node.items)
        .map((child) => buildConstructorLayer(ctx, child, tag.id))
        .filter(Boolean);
      if (childIds.length) tag.children = childIds;
    }

    return tag.id;
  }

  function normalizeConstructorRoot(spec) {
    if (!spec || typeof spec !== 'object') return null;
    if (spec.root) return spec.root;
    if (spec.layer) return spec.layer;
    if (Array.isArray(spec.layers)) {
      return {
        type: 'div',
        classes: spec.classes || ['component'],
        styles: spec.styles || spec.style || {},
        children: spec.layers
      };
    }
    if (spec.type || spec.children || spec.text || spec.html) return spec;
    return null;
  }

  function wrapRawJsInCode(code) {
    const text = String(code || '').trim();
    if (!text) return '';

    const tagRegex = /(<script\b[^>]*>[\s\S]*?<\/script>|<link\b[^>]*>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->)/i;
    const parts = text.split(tagRegex);

    const newParts = parts.map((part, index) => {
      if (!part) return '';
      if (index % 2 === 1) return part.trim();
      
      const content = part.trim();
      if (!content) return '';

      if (/^<[a-z!]/i.test(content)) {
        return content;
      }

      return `<script>\n${content}\n</script>`;
    });

    return newParts.filter(Boolean).join('\n\n');
  }


  function wrapConstructorCodePart(value, tagName) {
    const text = String(value || '').trim();
    if (!text) return '';
    const re = new RegExp(`<${tagName}[\\s>]`, 'i');
    return re.test(text) ? text : `<${tagName}>\n${text}\n</${tagName}>`;
  }

  function constructorEmbedCodeFromSpec(spec) {
    const code = wrapRawJsInCode(String(spec?.embedCode || spec?.embed_code || spec?.embed || '').trim());
    const css = wrapConstructorCodePart(spec?.css || spec?.globalCss || spec?.styleCode, 'style');
    const js = wrapConstructorCodePart(spec?.js || spec?.javascript || spec?.script, 'script');
    return [code, css, js].filter(Boolean).join('\n\n');
  }

  function localConstructorLayerName(element, fallback = 'Layer') {
    if (!element) return fallback;
    const className = String(element.getAttribute?.('class') || '').trim().split(/\s+/).filter(Boolean)[0] || '';
    const tag = String(element.tagName || '').toLowerCase();
    return sanitizeTaptopName(className || tag || fallback, fallback);
  }

  function localConstructorAttributes(element, skip = new Set()) {
    const attrs = {};
    Array.from(element?.attributes || []).forEach((attr) => {
      const name = String(attr?.name || '').trim();
      if (!name || skip.has(name) || /^on/i.test(name)) return;
      if (name === 'class' || name === 'style') return;
      attrs[name] = attr.value;
    });
    return attrs;
  }

  function localConstructorBaseNode(element, type, skipAttrs = new Set()) {
    const sourceTag = normalizeConstructorSourceTag(element?.tagName || '');
    const node = {
      type,
      name: localConstructorLayerName(element, constructorAlias(type))
    };
    if (sourceTag) node.sourceTag = sourceTag;
    const classes = splitClassNames(element?.getAttribute?.('class') || '');
    const style = parseStyleDeclarations(element?.getAttribute?.('style') || '');
    const attrs = localConstructorAttributes(element, skipAttrs);
    if (classes.length) node.classes = classes;
    if (Object.keys(style).length) node.styles = style;
    if (Object.keys(attrs).length) node.attrs = attrs;
    return node;
  }

  function localConstructorTextNode(value) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text ? { type: 'text', name: 'Text', text } : null;
  }

  function localConstructorDirectSvgChild(element) {
    const elementChildren = Array.from(element?.children || []);
    const svg = elementChildren.find((child) => String(child?.tagName || '').toLowerCase() === 'svg') || null;
    if (!svg) return null;
    const hasOnlySvgContent = Array.from(element?.childNodes || []).every((child) => {
      if (child === svg) return true;
      return child.nodeType === 3 && !String(child.textContent || '').trim();
    });
    return hasOnlySvgContent ? svg : null;
  }

  function localConstructorChildren(element) {
    const children = [];
    Array.from(element?.childNodes || []).forEach((child) => {
      if (child.nodeType === 3) {
        const textNode = localConstructorTextNode(child.textContent || '');
        if (textNode) children.push(textNode);
        return;
      }
      if (child.nodeType !== 1) return;
      const node = localConstructorNodeFromElement(child);
      if (node) children.push(node);
    });
    return children;
  }

  function localConstructorNodeFromElement(element) {
    const tag = String(element?.tagName || '').toLowerCase();
    if (!tag || /^(style|script|link|meta|title|noscript)$/i.test(tag)) return null;

    const className = String(element?.getAttribute?.('class') || '');
    const wrappedSvg = tag === 'svg' ? element : localConstructorDirectSvgChild(element);
    const isSvgIconWrapper = /\bsvg-icon\b/.test(className) && wrappedSvg;
    if (tag === 'svg' || isSvgIconWrapper) {
      const node = localConstructorBaseNode(element, 'svg');
      node.html = wrappedSvg?.outerHTML || element.outerHTML || '';
      return node;
    }

    if (tag === 'img' || tag === 'picture') {
      const node = localConstructorBaseNode(element, 'image', new Set(['src', 'srcset', 'alt', 'title', 'width', 'height']));
      const image = tag === 'picture' ? element.querySelector?.('img') : element;
      node.src = image?.getAttribute?.('src') || image?.getAttribute?.('data-src') || '';
      node.alt = image?.getAttribute?.('alt') || '';
      node.title = image?.getAttribute?.('title') || '';
      node.width = image?.getAttribute?.('width') || '';
      node.height = image?.getAttribute?.('height') || '';
      return node;
    }

    if (/^(h[1-6]|p|span|small|strong|em|b|i|label)$/i.test(tag)) {
      const node = localConstructorBaseNode(element, 'text');
      node.html = String(element.innerHTML || element.textContent || '').trim();
      return node.html ? node : null;
    }

    if (tag === 'a' || tag === 'button') {
      const node = localConstructorBaseNode(element, 'link', new Set(['href', 'target']));
      node.href = element.getAttribute?.('href') || '#';
      node.blank = element.getAttribute?.('target') === '_blank';
      const children = localConstructorChildren(element);
      if (children.length) node.children = children;
      else {
        const textNode = localConstructorTextNode(element.textContent || '');
        if (textNode) node.children = [textNode];
      }
      return node;
    }

    if (tag === 'br') return null;

    const nodeType = /^(section|header|footer|main|article|aside|nav)$/i.test(tag) ? 'section' : 'div';
    const node = localConstructorBaseNode(element, nodeType);
    const children = localConstructorChildren(element);
    if (children.length) node.children = children;
    return node;
  }

  function localConstructorHtmlNodes(layoutCode) {
    const html = String(layoutCode || '').trim();
    if (!html) return [];
    let container = null;
    try {
      container = new DOMParser().parseFromString(html, 'text/html')?.body || null;
    } catch {}
    if (!container) {
      try {
        const template = document.createElement('template');
        template.innerHTML = html;
        container = template.content;
      } catch {}
    }
    const nodes = [];
    Array.from(container?.childNodes || []).forEach((child) => {
      if (child.nodeType === 3) {
        const textNode = localConstructorTextNode(child.textContent || '');
        if (textNode) nodes.push(textNode);
        return;
      }
      if (child.nodeType !== 1) return;
      const node = localConstructorNodeFromElement(child);
      if (node) nodes.push(node);
    });
    return nodes;
  }

  function localConstructorEmbedCodeFromCode(layoutCode, embedCode) {
    const source = String(layoutCode || '');
    const parts = [];
    source.replace(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi, (match) => {
      parts.push(match);
      return match;
    });
    source.replace(/<script\b[\s\S]*?<\/script>/gi, (match) => {
      parts.push(match);
      return match;
    });
    const extra = String(embedCode || '').trim();
    if (extra) parts.push(extra);
    const combined = parts
      .map((part) => String(part || '').trim())
      .filter((part, index, list) => part && list.indexOf(part) === index)
      .join('\n\n');
    return wrapRawJsInCode(combined);
  }

  function localConstructorParsedFromCode(options = {}) {
    try {
      const layoutCode = String(options.layoutCode || options.sourceLayoutCode || '').trim();
      const embedCode = String(options.embedCode || '').trim();
      if (!layoutCode && !embedCode) return null;

      const nodes = localConstructorHtmlNodes(layoutCode);
      const shouldWrap = nodes.length !== 1 || (embedCode && nodes[0]?.type === 'text');
      const root = shouldWrap
        ? {
          type: 'div',
          name: 'code layout',
          classes: ['code-layout'],
          children: nodes
        }
        : nodes[0];
      if (!nodes.length && embedCode) {
        root.children = [];
      }

      return {
        message: 'Слой собран локально из вкладок конструктора.',
        constructor: {
          name: root.name || 'code layout',
          root,
          embedCode: localConstructorEmbedCodeFromCode(layoutCode, embedCode)
        }
      };
    } catch {
      return null;
    }
  }

  function looksLikeConstructorSpecPayload(value) {
    if (!isPlainObject(value)) return false;
    return !!(
      value.root
      || value.layer
      || Array.isArray(value.layers)
      || value.mode === 'constructor'
      || value.type
      || value.children
      || value.text
      || value.src
      || value.href
      || value.svg
      || value.embedCode
      || value.embed_code
    );
  }

  function builderResponseHasConstructorPayload(parsed) {
    if (!isPlainObject(parsed)) return false;
    const nested = [
      readOwnKey(parsed, 'constructor'),
      readOwnKey(parsed, 'builder'),
      readOwnKey(parsed, 'tapTop'),
      readOwnKey(parsed, 'taptop'),
      readOwnKey(parsed, 'component')
    ];
    return !!(
      isLayerClipboard(parsed)
      || isLayerClipboard(parsed.layerClipboard)
      || isLayerClipboard(parsed.clipboardData)
      || isLayerClipboard(parsed.clipboard)
      || isLayerClipboard(readOwnKey(parsed, 'constructor')?.clipboardData)
      || isLayerClipboard(readOwnKey(parsed, 'builder')?.clipboardData)
      || looksLikeConstructorSpecPayload(parsed)
      || nested.some(looksLikeConstructorSpecPayload)
    );
  }

  function builderCodePartsFromResponse(rawText, parsed) {
    const readFromObject = (source) => {
      if (!isPlainObject(source)) return null;
      const parts = normalizeImageCodeParts({
        message: source.message,
        html: codePartFromObject(source, ['html', 'markup', 'layout', 'template']),
        css: codePartFromObject(source, ['css', 'style', 'styles']),
        js: codePartFromObject(source, ['js', 'javascript', 'script', 'scripts'])
      });
      return parts.html || parts.css || parts.js ? parts : null;
    };

    const nested = isPlainObject(parsed?.code) ? parsed.code
      : isPlainObject(parsed?.component) && !builderResponseHasConstructorPayload(parsed) ? parsed.component
        : null;
    const fromParsed = readFromObject(nested) || readFromObject(parsed);
    if (fromParsed) return fromParsed;

    return parseImageCodeResult(rawText);
  }

  function localConstructorParsedFromCodeParts(parts) {
    const html = String(parts?.html || '').trim();
    const css = String(parts?.css || '').trim();
    const js = String(parts?.js || '').trim();
    if (!html) return null;

    const layoutCode = sourceLayoutCodeWithStyles(html, css);
    const parsed = localConstructorParsedFromCode({
      layoutCode,
      sourceLayoutCode: layoutCode,
      embedCode: js
    });
    if (!parsed) return null;
    return {
      parsed,
      options: {
        layoutCode,
        sourceLayoutCode: layoutCode,
        styleCode: css,
        embedCode: js
      }
    };
  }

  function cssDeclarationTextFromBuilderResponse(rawText, parsed) {
    const candidates = [];
    if (isPlainObject(parsed)) {
      ['message', 'answer', 'css', 'style'].forEach((key) => {
        if (typeof parsed[key] === 'string') candidates.push(parsed[key]);
      });
    }
    if (typeof rawText === 'string') candidates.push(rawText);

    for (const candidate of candidates) {
      const text = stripCodeFence(candidate)
        .replace(/^\s*(css|styles?)\s*:\s*/i, '')
        .trim();
      if (!text || /<\s*[a-z!/]/i.test(text)) continue;
      if (/^\{[\s\S]*\}$/.test(text) && parseGeminiJson(text)) continue;
      if (/\b[-_a-z][-_a-z0-9]*\s*:\s*[^;{}\n]+;?/i.test(text)) return text;
    }
    return '';
  }

  function localConstructorParsedFromPrompt(rawText, parsed, options = {}) {
    const cssText = cssDeclarationTextFromBuilderResponse(rawText, parsed);
    const cssStyles = normalizeStyleObject(cssText);
    if (!Object.keys(cssStyles).length) return null;

    const root = {
      type: 'div',
      name: 'AI component',
      classes: ['ai-component'],
      styles: cssStyles
    };

    return {
      message: 'Слой собран локально из запроса AI.',
      constructor: {
        name: root.name,
        root
      }
    };
  }

  function normalizeBuilderConstructorResponse(rawText, parsed, options = {}) {
    if (!options.builderMode) return { parsed, options };
    if (builderResponseHasConstructorPayload(parsed)) return { parsed, options };

    const codeParts = builderCodePartsFromResponse(rawText, parsed);
    const codeResult = localConstructorParsedFromCodeParts(codeParts);
    if (codeResult?.parsed) {
      return {
        parsed: codeResult.parsed,
        options: Object.assign({}, options, codeResult.options),
        source: 'ai-code'
      };
    }

    const promptParsed = localConstructorParsedFromPrompt(rawText, parsed, options);
    if (promptParsed) {
      return {
        parsed: promptParsed,
        options,
        source: 'ai-prompt'
      };
    }

    return { parsed, options };
  }

  function currentTaptopVersionInfo() {
    const api = getTaptopApi();
    return {
      verId: api?.runtime?.verId || api?.layout?.verId || 0,
      designId: api?.runtime?.designId || api?.layout?.designId || 0,
      treeVersion: api?.layout?.tree?.version || '3.1.0'
    };
  }

  function buildConstructorClipboardData(spec, options = {}) {
    const source = isPlainObject(spec) ? spec : {};
    const rootNode = normalizeConstructorRoot(source);
    if (!rootNode) throw new Error('AI не вернул constructor.root');

    const rules = normalizeBuilderRules(options.builderRules || {});
    const ctx = createConstructorBuildContext({
      keepClasses: rules.keepClasses,
      replaceFrom: rules.replaceFrom,
      replaceTo: rules.replaceTo
    });
    const rootId = buildConstructorLayer(ctx, rootNode, '');
    ctx.rootTagId = rootId;
    addConstructorClassStyles(ctx, 'screen',
      source.classStyles || source.classStyle || source.stylesByClass || source.cssByClass
    );
    addConstructorMediaClassStyles(ctx,
      source.mediaClassStyles || source.classMediaStyles || source.responsiveClassStyles || source.classBreakpoints
    );
    addConstructorSourceCssClassStyles(ctx, options.layoutCode || options.sourceLayoutCode || '', rules);
    applyConstructorCompoundClasses(ctx);
    dedupeConstructorLayerStyles(ctx);

    const specEmbedCode = constructorEmbedCodeFromSpec(source);
    const collectedEmbedCss = (ctx.embedCssRules || []).filter(Boolean);
    const embedCssBlock = collectedEmbedCss.length
      ? `<style>\n${collectedEmbedCss.join('\n\n')}\n</style>`
      : '';
    const embedCode = [specEmbedCode, embedCssBlock].filter(Boolean).join('\n\n');
    if (embedCode && ctx.tags[rootId]?.type !== 'tt_embed') {
      const embedId = buildConstructorLayer(ctx, {
        type: 'embed',
        name: `${sanitizeTaptopName(source.name || source.layerName || 'AI')} embed`,
        classes: ['helper--d-none'],
        embedCode
      }, rootId);
      const rootTag = ctx.tags[rootId];
      rootTag.children = (rootTag.children || []).concat(embedId);
      addConstructorSelector(ctx.mainSelectors, 'screen', '.helper--d-none', { display: 'none' });
    }

    const version = currentTaptopVersionInfo();
    const mainClassCollection = classNameCollectionFromItems(ctx.mainClassItems || ctx.classItems);
    const designClassCollection = classNameCollectionFromItems(ctx.designClassItems || []);
    return {
      verId: Number(version.verId || 0) || 0,
      designId: Number(version.designId || 0) || 0,
      copiedLayout: {
        tree: {
          version: version.treeVersion || '3.1.0',
          tags: ctx.tags,
          forms: {},
          root: rootId,
          dataCollection: { map: {} }
        },
        mainSelectorCollection: { map: ctx.mainSelectors },
        designSelectorCollection: { map: ctx.designSelectors },
        cmSelectorCollection: { map: {} },
        animationSelectorCollection: { map: {} },
        mainClassNameCollection: mainClassCollection,
        designClassNameCollection: designClassCollection
      },
      action: 'copy',
      tagID: `${rootId}_0`,
      isElementInCollection: false
    };
  }

  function constructorSpecFromParsed(parsed) {
    if (!isPlainObject(parsed)) return null;
    if (hasOwnKey(parsed, 'constructor')) return readOwnKey(parsed, 'constructor');
    if (hasOwnKey(parsed, 'builder')) return readOwnKey(parsed, 'builder');
    if (hasOwnKey(parsed, 'component')) return readOwnKey(parsed, 'component');
    if (hasOwnKey(parsed, 'tapTop') || hasOwnKey(parsed, 'taptop')) return readOwnKey(parsed, 'tapTop') || readOwnKey(parsed, 'taptop');
    if (parsed.mode === 'constructor' || parsed.root || parsed.layers) return parsed;
    return null;
  }

  function constructorClipboardClassCount(clipboardData) {
    const layout = clipboardData?.copiedLayout || {};
    return Object.keys(layout.mainClassNameCollection?.map || {}).length
      + Object.keys(layout.designClassNameCollection?.map || {}).length;
  }

  function constructorSelectorClassNames(value) {
    const names = new Set();
    String(value || '').replace(/\.([_a-zA-Z-][_a-zA-Z0-9-]*)/g, (_, className) => {
      if (className) names.add(className);
      return '';
    });
    return names;
  }

  function collectConstructorClassValues(collection) {
    const values = new Set();
    const addValue = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return;
      if (raw.includes('.')) constructorSelectorClassNames(raw).forEach((name) => values.add(name));
      if (/[.#:>+~,[\]()]/.test(raw)) return;
      raw.split(/\s+/).forEach((token) => {
        const normalized = sanitizeConstructorClassName(token);
        if (normalized) values.add(normalized);
      });
    };
    const add = (item, fallbackValue) => {
      if (!item) return;
      if (typeof item === 'string') addValue(item);
      addValue(item?.value);
      addValue(item?.name);
      addValue(item?.className);
      constructorSelectorClassNames(item?.selectorText || fallbackValue).forEach(addValue);
    };

    if (!collection) return values;
    if (Array.isArray(collection.list)) collection.list.forEach(add);
    if (collection.map instanceof Map) collection.map.forEach((item, key) => add(item, key));
    if (collection.map && typeof collection.map.get === 'function' && typeof collection.map.forEach === 'function') {
      try {
        collection.map.forEach((item, key) => add(item, key));
      } catch {}
    }
    if (collection.map && typeof collection.map === 'object') {
      Object.entries(collection.map).forEach(([key, item]) => add(item, key));
    }
    if (typeof collection.forEach === 'function') {
      try {
        collection.forEach((item, key) => add(item, key));
      } catch {}
    }
    if (typeof collection.values === 'function') {
      try {
        Array.from(collection.values()).forEach(add);
      } catch {}
    }
    if (typeof collection.toArray === 'function') {
      try {
        collection.toArray().forEach(add);
      } catch {}
    }
    if (typeof collection.serialize === 'function') {
      try {
        const serialized = collection.serialize();
        if (Array.isArray(serialized?.list)) serialized.list.forEach(add);
        if (serialized?.map) Object.entries(serialized.map).forEach(([key, item]) => add(item, key));
      } catch {}
    }

    return values;
  }

  function collectConstructorClassIds(collection) {
    const ids = new Set();
    const add = (item, fallbackId) => {
      const id = item?.id || fallbackId;
      if (id) ids.add(String(id));
    };

    if (!collection) return ids;
    if (Array.isArray(collection.list)) collection.list.forEach(add);
    if (collection.map instanceof Map) collection.map.forEach((item, id) => add(item, id));
    if (collection.map && typeof collection.map.get === 'function' && typeof collection.map.forEach === 'function') {
      try {
        collection.map.forEach((item, id) => add(item, id));
      } catch {}
    }
    if (collection.map && typeof collection.map === 'object') {
      Object.entries(collection.map).forEach(([id, item]) => add(item, id));
    }
    if (typeof collection.forEach === 'function') {
      try {
        collection.forEach((item, id) => add(item, id));
      } catch {}
    }
    if (typeof collection.values === 'function') {
      try {
        Array.from(collection.values()).forEach(add);
      } catch {}
    }
    if (typeof collection.toArray === 'function') {
      try {
        collection.toArray().forEach(add);
      } catch {}
    }
    if (typeof collection.serialize === 'function') {
      try {
        const serialized = collection.serialize();
        if (Array.isArray(serialized?.list)) serialized.list.forEach(add);
        if (serialized?.map) Object.entries(serialized.map).forEach(([id, item]) => add(item, id));
      } catch {}
    }

    return ids;
  }

  function isConstructorSystemClassName(value) {
    const className = String(value || '');
    const api = getTaptopApi();
    return CONSTRUCTOR_UNIQUE_CLASS_RE.test(className)
      || CONSTRUCTOR_SYSTEM_CLASS_NAMES.has(className)
      || !!api?.systemClassNames?.has?.(className);
  }

  function collectConstructorUserClassValues(collection) {
    const values = new Set();
    collectConstructorClassValues(collection).forEach((className) => {
      if (!className) return;
      if (CONSTRUCTOR_IGNORED_CLASS_CONFLICT_NAMES.has(className)) return;
      if (isConstructorSystemClassName(className)) return;
      values.add(className);
    });
    return values;
  }

  function currentConstructorUserClassNames() {
    const api = getTaptopApi();
    const values = new Set();
    [
      api?.layout?.classNameManager,
      api?.layout?.mainClassNameCollection,
      api?.layout?.designClassNameCollection
    ].forEach((collection) => {
      collectConstructorUserClassValues(collection).forEach((className) => values.add(className));
    });
    return values;
  }

  function importedConstructorUserClassNames(data) {
    const layout = data?.copiedLayout || {};
    const values = new Set();
    [
      layout.classNameManager,
      layout.mainClassNameCollection,
      layout.designClassNameCollection,
      layout.mainSelectorCollection,
      layout.designSelectorCollection,
      layout.cmSelectorCollection,
      layout.animationSelectorCollection
    ].forEach((collection) => {
      collectConstructorUserClassValues(collection).forEach((className) => values.add(className));
    });
    return values;
  }

  function constructorUsedClassIds(data) {
    const api = getTaptopApi();
    const values = new Set();
    [
      api?.layout?.mainClassNameCollection,
      api?.layout?.designClassNameCollection,
      api?.layout?.classNameManager,
      data?.copiedLayout?.mainClassNameCollection,
      data?.copiedLayout?.designClassNameCollection,
      data?.copiedLayout?.classNameManager
    ].forEach((collection) => {
      collectConstructorClassIds(collection).forEach((id) => values.add(id));
    });
    return values;
  }

  function constructorClassConflicts(data) {
    const current = currentConstructorUserClassNames();
    return Array.from(importedConstructorUserClassNames(data))
      .filter((className) => current.has(className))
      .sort();
  }

  function nextConstructorClassName(base, used) {
    let index = 1;
    let next = `${base}-${index}`;
    while (used.has(next)) {
      index += 1;
      next = `${base}-${index}`;
    }
    used.add(next);
    return next;
  }

  function nextConstructorClassId(used) {
    let id = '';
    do {
      id = `class_i${Math.random().toString(36).slice(2, 10).padEnd(8, '0')}`;
    } while (used.has(id));
    used.add(id);
    return id;
  }

  function renameConstructorClassCollection(collection, renameMap, usedIds) {
    const idMap = new Map();
    if (!collection?.map) return idMap;

    const nextMap = {};
    Object.entries(collection.map).forEach(([id, rawItem]) => {
      const item = rawItem || {};
      if (!item.value || !renameMap.has(item.value)) {
        nextMap[id] = rawItem;
        return;
      }

      const nextId = nextConstructorClassId(usedIds);
      idMap.set(item.id || id, nextId);
      item.id = nextId;
      item.value = renameMap.get(item.value);
      nextMap[nextId] = item;
    });
    collection.map = nextMap;

    if (Array.isArray(collection.list)) {
      collection.list.forEach((item) => {
        if (item?.id && idMap.has(item.id)) item.id = idMap.get(item.id);
        if (item?.value && renameMap.has(item.value)) item.value = renameMap.get(item.value);
      });
    }

    if (collection.countMap) {
      const nextCountMap = {};
      Object.values(collection.map).forEach((item) => {
        if (!item?.value) return;
        nextCountMap[item.value] = Math.max(nextCountMap[item.value] || 0, 1);
      });
      collection.countMap = nextCountMap;
    }

    return idMap;
  }

  function remapConstructorTreeClassNameIds(tree, idMap) {
    if (!tree?.tags || !idMap.size) return;
    Object.values(tree.tags).forEach((tag) => {
      if (!Array.isArray(tag?.classNameIds)) return;
      tag.classNameIds = tag.classNameIds.map((id) => idMap.get(id) || id);
    });
  }

  function replaceConstructorClassSelectors(text, renameMap) {
    let next = String(text || '');
    renameMap.forEach((to, from) => {
      next = next.replace(new RegExp(`\\.${escapeRegExp(from)}(?![-_a-zA-Z0-9])`, 'g'), `.${to}`);
    });
    return next;
  }

  function renameConstructorSelectorCollection(collection, renameMap) {
    if (!collection?.map) return;
    const nextMap = {};
    Object.entries(collection.map).forEach(([key, selector]) => {
      const nextKey = replaceConstructorClassSelectors(key, renameMap);
      if (selector?.selectorText) selector.selectorText = replaceConstructorClassSelectors(selector.selectorText, renameMap);
      nextMap[nextKey] = selector;
    });
    collection.map = nextMap;
  }

  function createConstructorClassCopies(data, conflicts) {
    const next = deepCloneJson(data);
    const used = new Set([
      ...currentConstructorUserClassNames(),
      ...importedConstructorUserClassNames(next)
    ]);
    const usedIds = constructorUsedClassIds(next);
    const renameMap = new Map(conflicts.map((className) => [className, nextConstructorClassName(className, used)]));
    const layout = next.copiedLayout || {};

    const mainIdMap = renameConstructorClassCollection(layout.mainClassNameCollection, renameMap, usedIds);
    const designIdMap = renameConstructorClassCollection(layout.designClassNameCollection, renameMap, usedIds);
    const idMap = new Map([...mainIdMap, ...designIdMap]);
    remapConstructorTreeClassNameIds(layout.tree, idMap);
    renameConstructorSelectorCollection(layout.mainSelectorCollection, renameMap);
    renameConstructorSelectorCollection(layout.designSelectorCollection, renameMap);
    renameConstructorSelectorCollection(layout.cmSelectorCollection, renameMap);
    renameConstructorSelectorCollection(layout.animationSelectorCollection, renameMap);

    return next;
  }

  function ensureHtmlPreviewStyles() {
    if (document.querySelector('style[data-tt-html-preview]')) return;
    const style = document.createElement('style');
    style.dataset.ttHtmlPreview = '1';
    style.textContent = `
      .tt-html-preview-overlay { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(17, 24, 39, .45); }
      .tt-html-preview-dialog { width: min(1100px, 100%); height: min(86vh, 820px); display: flex; flex-direction: column; border-radius: 10px; background: #fff; box-shadow: 0 24px 60px rgba(15, 23, 42, .28); color: #20242c; font: 400 13px/1.5 Inter, Arial, sans-serif; overflow: hidden; }
      .tt-html-preview-head { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #eef1f6; }
      .tt-html-preview-head h3 { margin: 0; font: 600 15px/1.3 Inter, Arial, sans-serif; }
      .tt-html-preview-devices { display: inline-flex; gap: 4px; padding: 4px; border-radius: 8px; background: #f0f2f7; }
      .tt-html-preview-device { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 30px; border: none; border-radius: 6px; background: transparent; color: #596171; cursor: pointer; }
      .tt-html-preview-device svg { width: 18px; height: 18px; fill: currentColor; }
      .tt-html-preview-device:hover { color: #20242c; }
      .tt-html-preview-device.is-active { background: #fff; color: #0d7cff; box-shadow: 0 1px 3px rgba(15, 23, 42, .18); }
      .tt-html-preview-head-right { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
      .tt-html-preview-size { color: #8a94a6; font: 500 11px/1 Inter, Arial, sans-serif; }
      .tt-html-preview-close { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: none; border-radius: 6px; background: transparent; color: #596171; cursor: pointer; }
      .tt-html-preview-close:hover { background: #f0f2f7; color: #20242c; }
      .tt-html-preview-close svg { width: 18px; height: 18px; fill: currentColor; }
      .tt-html-preview-body { flex: 1; overflow: auto; padding: 18px; background: #eef1f6; display: flex; justify-content: center; align-items: flex-start; }
      .tt-html-preview-frame-wrap { background: #fff; border-radius: 8px; box-shadow: 0 6px 24px rgba(15, 23, 42, .14); overflow: hidden; transition: width .2s ease; max-width: 100%; }
      .tt-html-preview-frame { display: block; width: 100%; height: 100%; border: 0; background: #fff; }
    `;
    document.head.appendChild(style);
  }

  function openHtmlPreviewModal(changeSetId) {
    const changeSet = changeSetId ? state.changeSets.get(changeSetId) : null;
    const source = changeSet?.viewSource;
    if (!source) return;
    ensureHtmlPreviewStyles();

    document.querySelectorAll('.tt-html-preview-overlay').forEach((node) => node.remove());

    const html = String(source.html || '').trim();
    const css = String(source.css || '').trim();
    const js = String(source.js || '').trim();
    if (!html && !css && !js) return;

    const previewDoc = [
      '<!doctype html>',
      '<html lang="ru">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<style>html,body{margin:0;}body{font-family:Inter,Arial,sans-serif;}</style>',
      css ? '<style>' + css + '</style>' : '',
      '</head>',
      '<body>',
      html,
      js ? '<scr' + 'ipt>' + js.replace(/<\/script>/gi, '<\\/script>') + '</scr' + 'ipt>' : '',
      '</body>',
      '</html>'
    ].join('\n');

    const devices = [
      { key: 'desktop', icon: 'device-desktop', label: 'Компьютер', width: 0 },
      { key: 'tablet', icon: 'device-tablet', label: 'Планшет', width: 768 },
      { key: 'mobile', icon: 'device-mobile', label: 'Телефон', width: 375 }
    ];
    let activeDevice = 'desktop';

    const overlay = document.createElement('div');
    overlay.className = 'tt-html-preview-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'tt-html-preview-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.innerHTML = [
      '<div class="tt-html-preview-head">',
      '  <h3>Верстка от нейросети</h3>',
      '  <div class="tt-html-preview-devices" data-role="devices"></div>',
      '  <div class="tt-html-preview-head-right">',
      '    <span class="tt-html-preview-size" data-role="size"></span>',
      '    <button type="button" class="tt-html-preview-close" data-role="close" aria-label="Закрыть">' + iconSvg('close') + '</button>',
      '  </div>',
      '</div>',
      '<div class="tt-html-preview-body">',
      '  <div class="tt-html-preview-frame-wrap" data-role="frame-wrap">',
      '    <iframe class="tt-html-preview-frame" data-role="frame" sandbox="allow-scripts allow-same-origin" title="Превью"></iframe>',
      '  </div>',
      '</div>'
    ].join('');

    const devicesRoot = dialog.querySelector('[data-role="devices"]');
    const frameWrap = dialog.querySelector('[data-role="frame-wrap"]');
    const frame = dialog.querySelector('[data-role="frame"]');
    const sizeLabel = dialog.querySelector('[data-role="size"]');

    const applyDevice = () => {
      const device = devices.find((item) => item.key === activeDevice) || devices[0];
      if (device.width) {
        frameWrap.style.width = device.width + 'px';
        frameWrap.style.height = '100%';
        if (sizeLabel) sizeLabel.textContent = device.width + ' px';
      } else {
        frameWrap.style.width = '100%';
        frameWrap.style.height = '100%';
        if (sizeLabel) sizeLabel.textContent = 'Адаптив';
      }
      devicesRoot.querySelectorAll('.tt-html-preview-device').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.device === activeDevice);
      });
    };

    devices.forEach((device) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tt-html-preview-device';
      button.dataset.device = device.key;
      button.title = device.label;
      button.setAttribute('aria-label', device.label);
      button.innerHTML = iconSvg(device.icon);
      button.addEventListener('click', () => {
        activeDevice = device.key;
        applyDevice();
      });
      devicesRoot.appendChild(button);
    });

    const close = () => {
      overlay.remove();
      document.removeEventListener('keydown', onKeyDown);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    dialog.querySelector('[data-role="close"]')?.addEventListener('click', close);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close();
    });
    document.addEventListener('keydown', onKeyDown);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    frame.srcdoc = previewDoc;
    applyDevice();
    dialog.querySelector('[data-role="close"]')?.focus?.();
  }

  function ensureConstructorClassConflictStyles() {
    if (document.querySelector('style[data-tt-layer-class-conflict]')) return;
    const style = document.createElement('style');
    style.dataset.ttLayerClassConflict = '1';
    style.textContent = `
      .tt-layer-class-conflict-overlay { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(17, 24, 39, .38); }
      .tt-layer-class-conflict-dialog { width: min(420px, 100%); border-radius: 8px; background: #fff; box-shadow: 0 18px 50px rgba(15, 23, 42, .22); padding: 18px; color: #20242c; font: 400 13px/1.45 Inter, Arial, sans-serif; }
      .tt-layer-class-conflict-dialog h3 { margin: 0 0 8px; font: 600 15px/1.3 Inter, Arial, sans-serif; }
      .tt-layer-class-conflict-dialog p { margin: 0 0 12px; color: #596171; }
      .tt-layer-class-conflict-list { margin: 0 0 14px; padding: 8px 10px; max-height: 96px; overflow: auto; border-radius: 6px; background: #f5f7fb; color: #333; }
      .tt-layer-class-conflict-actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
      .tt-layer-class-conflict-actions button { min-height: 30px; padding: 0 12px; border: 1px solid #d8dde8; border-radius: 4px; background: #fff; color: #333; cursor: pointer; font: 500 12px/1 Inter, Arial, sans-serif; }
      .tt-layer-class-conflict-actions button[data-primary="1"] { border-color: #0d7cff; background: #0d7cff; color: #fff; }
    `;
    document.head.appendChild(style);
  }

  function chooseConstructorClassConflictMode(conflicts) {
    if (!conflicts.length) return Promise.resolve('project');
    if (constructorConflictDialog) constructorConflictDialog.remove();
    ensureConstructorClassConflictStyles();

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'tt-layer-class-conflict-overlay';
      constructorConflictDialog = overlay;

      const dialog = document.createElement('div');
      dialog.className = 'tt-layer-class-conflict-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');

      const list = conflicts.slice(0, 12).join(', ') + (conflicts.length > 12 ? ` и еще ${conflicts.length - 12}` : '');
      dialog.innerHTML = `
        <h3>Совпадение классов</h3>
        <p>В проекте уже есть классы с такими именами. Как добавить слой из AI?</p>
        <div class="tt-layer-class-conflict-list"></div>
        <div class="tt-layer-class-conflict-actions">
          <button type="button" data-action="project">Использовать классы проекта</button>
          <button type="button" data-action="copy" data-primary="1">Создать копии классов</button>
          <button type="button" data-action="cancel">Отмена</button>
        </div>
      `;
      dialog.querySelector('.tt-layer-class-conflict-list').textContent = list;

      const close = (mode) => {
        overlay.remove();
        if (constructorConflictDialog === overlay) constructorConflictDialog = null;
        resolve(mode);
      };

      dialog.addEventListener('click', (event) => {
        const action = event.target?.closest?.('button')?.dataset.action;
        if (action) close(action);
      });
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close('cancel');
      });

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      dialog.querySelector('[data-primary="1"]')?.focus?.();
    });
  }

  async function resolveConstructorClassConflicts(data) {
    const conflicts = constructorClassConflicts(data);
    if (!conflicts.length) return data;

    const mode = await chooseConstructorClassConflictMode(conflicts);
    if (mode === 'copy') return createConstructorClassCopies(data, conflicts);
    if (mode === 'project') return data;
    return null;
  }

  function normalizeConstructorResult(parsed, options = {}) {
    if (!isPlainObject(parsed)) return null;

    const directClipboard = normalizeLayerClipboardPayload(parsed.layerClipboard)
      || normalizeLayerClipboardPayload(parsed.clipboardData)
      || normalizeLayerClipboardPayload(parsed.clipboard)
      || normalizeLayerClipboardPayload(readOwnKey(parsed, 'constructor')?.clipboardData)
      || normalizeLayerClipboardPayload(readOwnKey(parsed, 'builder')?.clipboardData)
      || normalizeLayerClipboardPayload(parsed);
    if (directClipboard) {
      const tags = directClipboard?.copiedLayout?.tree?.tags || {};
      return {
        clipboardData: directClipboard,
        layerName: sanitizeTaptopName(tags[directClipboard.copiedLayout?.tree?.root]?.name || parsed.layerName || 'AI component'),
        layerCount: Object.keys(tags).length,
        classCount: constructorClipboardClassCount(directClipboard),
        embedCount: Object.values(tags).filter((tag) => tag?.type === 'tt_embed').length
      };
    }

    const spec = constructorSpecFromParsed(parsed);
    if (!spec) return null;
    try {
      const clipboardData = buildConstructorClipboardData(spec, options);
      const tags = clipboardData?.copiedLayout?.tree?.tags || {};
      const rootTag = tags[clipboardData?.copiedLayout?.tree?.root] || {};
      return {
        clipboardData,
        layerName: sanitizeTaptopName(spec.name || spec.layerName || rootTag.name || 'AI component'),
        layerCount: Object.keys(tags).length,
        classCount: constructorClipboardClassCount(clipboardData),
        embedCount: Object.values(tags).filter((tag) => tag?.type === 'tt_embed').length
      };
    } catch (error) {
      return {
        error: error?.message || 'Не удалось собрать слой констр��ктора из ответа AI'
      };
    }
  }

  function resolveModelTextRefBySource(context, refId, sourceText) {
    const api = getTaptopApi();
    const selectedTag = getSelectedTag(api);
    if (!api?.layout || !selectedTag || !context?.refsById) return null;

    const selectedIds = new Set(getSelectedIdentityValues(api, selectedTag));
    if (context.selectedId && selectedIds.size && !identitySetHas(selectedIds, context.selectedId)) {
      return null;
    }

    const selectedId = String(readObjectValue(selectedTag, 'id') || context.selectedId || '');
    const resolved = findModelTextRefByText([{ id: selectedId, tag: selectedTag }], sourceText)
      || findModelTextRefByText(selectedEntries(api), sourceText);
    if (!resolved?.ref?.container) return null;

    const nextRef = Object.assign({}, resolved, { id: refId });
    context.refsById.set(refId, nextRef);
    return nextRef;
  }

  function resolveModelTextRefForChange(change, context) {
    return resolveModelTextRefBySource(
      context,
      change.id,
      change.before || context?.refsById?.get(change.id)?.text || ''
    );
  }

  function applyModelTextChange(change, context, originals) {
    const ref = resolveModelTextRefForChange(change, context);
    if (!ref?.ref?.container) return false;

    const current = getRefValue(ref.ref);
    originals.push({
      id: change.id,
      value: current,
      refType: ref.ref.type || 'model'
    });
    setRefValue(ref.ref, change.value);
    ref.text = change.value;
    ref.promptText = textForDisplay(change.value) || change.value;
    ref.previewText = textForDisplay(change.value) || change.value;
    return true;
  }

  function restoreModelTextChange(original, context, sourceText) {
    const ref = resolveModelTextRefBySource(context, original.id, sourceText);
    if (!ref?.ref?.container) return false;

    setRefValue(ref.ref, original.value);
    ref.text = String(original.value || '');
    ref.promptText = textForDisplay(ref.text) || ref.text;
    ref.previewText = textForDisplay(ref.text) || ref.text;
    return true;
  }

  function getClipboardRootId(data) {
    return data?.tagID || data?.copiedLayout?.tree?.root || '';
  }

  function setClipboardData(api, data) {
    const raw = JSON.stringify(data);
    try {
      localStorage.setItem(CLIPBOARD_KEY, raw);
      api?.clipboardStore?.updateState?.();
    } catch {}
    try {
      api?.clipboardStore?.setClipboard?.(data);
    } catch {}
    try {
      localStorage.setItem(CLIPBOARD_KEY, raw);
      api?.clipboardStore?.updateState?.();
    } catch {}
  }

  function restoreClipboardRaw(api, raw) {
    try {
      if (raw) localStorage.setItem(CLIPBOARD_KEY, raw);
      else localStorage.removeItem(CLIPBOARD_KEY);
      api?.clipboardStore?.updateState?.();
    } catch {}
    if (!raw) {
      try {
        api?.clipboard?.clearClipboard?.();
      } catch {}
    }
  }

  function readLayerClipboardData(api, layerId) {
    const action = api?.constants?.aI?.COPY_COMPONENT || 'copy';
    api?.clipboard?.copyToClipboard?.(api.layout, action, layerId);
    try {
      const raw = localStorage.getItem(CLIPBOARD_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    try {
      return api?.clipboard?.getClipboard?.() || null;
    } catch {
      return null;
    }
  }

  function normalizeMarkerForClipboardPaste(api, marker) {
    if (!marker) return null;
    const next = Object.assign({}, marker);
    next.id = getOriginalId(api, marker.id);
    if (marker.afterChild || marker.deepAfterChild) {
      next.afterChild = marker.deepAfterChild || getOriginalId(api, marker.afterChild);
    }
    if (marker.beforeChild || marker.deepBeforeChild) {
      next.beforeChild = marker.deepBeforeChild || getOriginalId(api, marker.beforeChild);
    }
    return next;
  }

  function buildAppendMarkerPosition(api, targetTag) {
    const children = Array.isArray(targetTag?.children) ? targetTag.children : [];
    const afterChild = children[children.length - 1] || '';
    const marker = {
      id: targetTag.id,
      composedId: targetTag.id,
      targetType: targetTag.type || targetTag.widgetName || targetTag.tagName || '',
      direction: api?.constants?.Lh?.TOP || 'top',
      childType: '',
      rangeLeft: 0,
      rangeTop: 0,
      rangeRight: 0,
      rangeBottom: 0,
      markerPositions: {},
      fillType: 'half'
    };

    if (afterChild) {
      marker.afterChild = afterChild;
      marker.deepAfterChild = getOriginalId(api, afterChild);
    }

    return marker;
  }

  function collectLiveConstructorSubtreeTags(api, rootId) {
    const result = [];
    const seen = new Set();

    const visit = (idOrTag) => {
      const tag = typeof idOrTag === 'object'
        ? idOrTag
        : getOriginalTag(api, idOrTag) || getTagById(api, idOrTag);
      const tagId = String(readObjectValue(tag, 'id') || idOrTag || '');
      if (!tag || !tagId || seen.has(tagId)) return;
      seen.add(tagId);
      result.push(tag);
      getChildIds(tag).forEach(visit);
    };

    visit(rootId);
    return result;
  }

  function applyPastedConstructorSvgData(api, pastedRootId, svgMarkups) {
    const markups = Array.isArray(svgMarkups) ? svgMarkups.filter(Boolean) : [];
    if (!markups.length || !pastedRootId) return 0;

    const liveSvgTags = collectLiveConstructorSubtreeTags(api, pastedRootId)
      .filter((tag) => isConstructorSvgIconTag(tag));
    let applied = 0;
    liveSvgTags.forEach((tag, index) => {
      const svg = markups[index] || markups[markups.length - 1];
      if (svg && setConstructorSvgTagData(tag, svg)) applied += 1;
    });
    return applied;
  }

  async function pasteClipboardDataAtMarker(api, data, marker) {
    if (!api?.clipboard?.pasteFromClipboard || !data || !marker?.id) return null;
    const clipboardData = await resolveConstructorClassConflicts(data);
    if (!clipboardData) return null;
    const svgMarkups = collectConstructorClipboardSvgMarkups(clipboardData);
    setClipboardData(api, clipboardData);
    try {
      const pasted = api.clipboard.pasteFromClipboard(
        normalizeMarkerForClipboardPaste(api, marker),
        getClipboardRootId(clipboardData)
      );
      applyPastedConstructorSvgData(api, pastedLayerId(pasted), svgMarkups);
      return pasted;
    } catch {
      return null;
    }
  }

  function pastedLayerId(value) {
    if (!value) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    return String(readObjectValue(value, 'id') || readObjectValue(value, 'tagID') || readObjectValue(value, 'tagId') || '');
  }

  function selectedTagUniqueSelector(tag) {
    const id = String(readObjectValue(tag, 'id') || '').trim();
    const className = sanitizeConstructorClassName(readObjectValue(tag, 'className') || constructorBaseClass(normalizeConstructorLayerType(getTagType(tag))));
    return id && className ? `.${className}--u-${id}` : '';
  }

  function selectorCssValue(rule) {
    if (rule === undefined || rule === null) return '';
    if (typeof rule === 'string' || typeof rule === 'number') return String(rule);
    const values = [
      rule.value,
      rule.serializeValue,
      rule.cssValue,
      rule.currentValue,
      rule.rule?.value,
      rule.css?.value,
      rule.style?.value
    ];
    return values.map((value) => String(value ?? '').trim()).find(Boolean) || '';
  }

  function getSelectedStyleSelector(api, context, media = 'screen') {
    const target = getOriginalTag(api, context?.selectedId);
    const selectorText = selectedTagUniqueSelector(target);
    if (!selectorText) return null;

    const collection = api?.layout?.designSelectorCollection || api?.layout?.mainSelectorCollection;
    if (!collection?.getSelector) return null;
    try {
      return collection.getSelector(normalizeConstructorMedia(media), selectorText);
    } catch {
      return null;
    }
  }

  function readSelectorCss(selector, property) {
    if (!selector?.getCSS) return { hadValue: false, value: '' };
    try {
      const rule = selector.getCSS(property);
      const value = selectorCssValue(rule);
      return {
        hadValue: rule !== undefined && rule !== null && value !== '',
        value
      };
    } catch {
      return { hadValue: false, value: '' };
    }
  }

  function setSelectorCss(selector, property, value) {
    if (!selector?.setCSS) return false;
    try {
      selector.setCSS(property, value, false);
      return true;
    } catch {
      try {
        selector.setCSS(property, value);
        return true;
      } catch {
        return false;
      }
    }
  }

  function removeSelectorCss(selector, property) {
    if (!selector) return false;
    if (typeof selector.removeCSS === 'function') {
      try {
        selector.removeCSS(property);
        return true;
      } catch {}
    }
    return setSelectorCss(selector, property, '');
  }

  function makeGeneratedImageValue(imageChange, original = null) {
    const mimeType = imageChange?.mimeType || imageMimeFromSource(imageChange?.dataUrl || '');
    const ext = imageExtFromMime(mimeType);
    return {
      filename: `ai-${Date.now()}.${ext}`,
      image_id: 0,
      src: imageChange?.dataUrl || '',
      ver_id: 0,
      ext,
      image_width: Number(imageChange?.width || original?.image_width || original?.width || 0) || 0,
      image_height: Number(imageChange?.height || original?.image_height || original?.height || 0) || 0,
      size: Math.round(String(imageChange?.dataUrl || '').length * 0.75)
    };
  }

  function replaceImageDataNode(node, imageChange) {
    if (!node || typeof node !== 'object') return false;
    if (String(node.type || '').toLowerCase() !== 'image2') return false;

    const original = firstImageValue(node.value);
    const generated = makeGeneratedImageValue(imageChange, original && typeof original === 'object' ? original : null);
    if (node.value && typeof node.value === 'object' && !node.value.src && (node.value.ru || node.value.en)) {
      node.value = Object.assign({}, node.value, {
        ru: generated,
        en: generated
      });
    } else {
      node.value = generated;
    }
    return true;
  }

  function replaceImageSourcesInObject(obj, imageChange, seen = new WeakSet(), depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 10) return 0;
    if (seen.has(obj)) return 0;
    seen.add(obj);

    if (replaceImageDataNode(obj, imageChange)) return 1;

    let count = 0;
    Object.entries(obj).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        count += replaceImageSourcesInObject(value, imageChange, seen, depth + 1);
        return;
      }
      if (typeof value === 'string' && /(^|_)(src|image|poster)(_|$)/i.test(key) && isLikelyImageSource(value)) {
        obj[key] = imageChange?.dataUrl || value;
        count += 1;
      }
    });
    return count;
  }

  function renameClipboardRoot(data, name) {
    const rootId = getClipboardRootId(data);
    const tags = data?.copiedLayout?.tree?.tags || {};
    const rootTag = tags[rootId] || tags[data?.copiedLayout?.tree?.root];
    if (rootTag && name) rootTag.name = `${name} AI`;
  }

  function replaceImageSourcesInClipboardData(data, imageChange, context) {
    const tags = data?.copiedLayout?.tree?.tags || {};
    let count = 0;
    Object.values(tags).forEach((tag) => {
      count += replaceImageSourcesInObject(tag, imageChange);
    });
    renameClipboardRoot(data, context?.layerName || 'Image');
    return count;
  }

  function applyImageDataNodeDirect(node, imageChange, originals) {
    if (!node || typeof node !== 'object') return false;
    if (String(readObjectValue(node, 'type') || '').toLowerCase() !== 'image2') return false;

    const originalValue = readObjectValue(node, 'value');
    const originalImage = firstImageValue(originalValue);
    const generated = makeGeneratedImageValue(imageChange, originalImage && typeof originalImage === 'object' ? originalImage : null);
    const nextValue = originalValue && typeof originalValue === 'object' && !originalValue.src && (originalValue.ru || originalValue.en)
      ? Object.assign({}, originalValue, { ru: generated, en: generated })
      : generated;

    originals.push({
      container: node,
      key: 'value',
      value: originalValue
    });
    setObjectValue(node, 'value', nextValue);
    return true;
  }

  function applyImageSourcesInObjectDirect(obj, imageChange, originals, seen = new WeakSet(), depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 10) return 0;
    if (seen.has(obj)) return 0;
    seen.add(obj);

    if (applyImageDataNodeDirect(obj, imageChange, originals)) return 1;

    let count = 0;
    Object.entries(obj).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        count += applyImageSourcesInObjectDirect(value, imageChange, originals, seen, depth + 1);
        return;
      }
      if (typeof value === 'string' && /(^|_)(src|image|poster)(_|$)/i.test(key) && isLikelyImageSource(value)) {
        originals.push({
          container: obj,
          key,
          value
        });
        setObjectValue(obj, key, imageChange?.dataUrl || value);
        count += 1;
      }
    });
    return count;
  }

  function applyImageChangeToTagDirect(tag, imageChange) {
    const originals = [];
    const count = applyImageSourcesInObjectDirect(tag, imageChange, originals);
    return {
      count,
      originals
    };
  }

  function restoreDirectImageChanges(originals) {
    let restored = 0;
    (originals || []).forEach((original) => {
      if (!original?.container || original.key === undefined) return;
      setObjectValue(original.container, original.key, original.value);
      restored += 1;
    });
    return restored;
  }

  function buildPasteMarkerAfterOriginal(api, originalTag) {
    const target = getOriginalTag(api, originalTag);
    const parentId = getOriginalId(api, getParentId(target));
    const parent = getOriginalTag(api, parentId) || getRootTag(api);
    if (!parent?.id || !target?.id) return null;
    return {
      id: parent.id,
      afterChild: getOriginalId(api, target.id)
    };
  }

  function selectedLayerPosition(api, targetTag) {
    const target = getOriginalTag(api, targetTag);
    const parentId = getOriginalId(api, getParentId(target));
    const parent = getOriginalTag(api, parentId) || getRootTag(api);
    if (!target?.id || !parent?.id) return null;
    const targetId = getOriginalId(api, target.id);
    const children = getChildIds(parent).map((id) => getOriginalId(api, id));
    const index = children.findIndex((id) => id === targetId);
    return {
      parentId: getOriginalId(api, parent.id),
      afterChild: index > 0 ? children[index - 1] : '',
      beforeChild: index > -1 && index < children.length - 1 ? children[index + 1] : ''
    };
  }

  function buildRestoreLayerMarker(api, position) {
    const parent = getOriginalTag(api, position?.parentId) || getRootTag(api);
    if (!parent?.id) return null;
    const marker = { id: getOriginalId(api, parent.id) };
    if (position?.beforeChild && getOriginalTag(api, position.beforeChild)) {
      marker.beforeChild = getOriginalId(api, position.beforeChild);
      return marker;
    }
    if (position?.afterChild && getOriginalTag(api, position.afterChild)) {
      marker.afterChild = getOriginalId(api, position.afterChild);
      return marker;
    }
    return buildAppendMarkerPosition(api, parent);
  }

  function rememberRuntimeSelection(api, layerId) {
    if (!layerId) return;
    try {
      api.runtime.selected = getOriginalId(api, layerId);
    } catch {}
  }

  function ensureHiddenLayerClass(api) {
    const manager = api?.layout?.classNameManager;
    const mainCollection = api?.layout?.mainClassNameCollection;
    if (!manager || !mainCollection) return null;

    let className = manager.findByName?.(AI_HIDDEN_CLASS_NAME) || mainCollection.findByName?.(AI_HIDDEN_CLASS_NAME) || null;
    if (!className) className = mainCollection.generateByName?.(AI_HIDDEN_CLASS_NAME);
    if (!className) return null;

    if (className.value !== AI_HIDDEN_CLASS_NAME) {
      if (typeof className.set === 'function') className.set(AI_HIDDEN_CLASS_NAME);
      else className.value = AI_HIDDEN_CLASS_NAME;
    }

    try {
      if (!manager.has?.(className.id) && !mainCollection.has?.(className.id)) {
        manager.add?.(className);
      }
    } catch {}

    const selectors = api?.layout?.mainSelectorCollection;
    const constants = api?.constants || {};
    const media = constants.$U?.SCREEN || 'screen';
    const displayProp = constants.Fi?.DISPLAY || 'display';
    const noneValue = constants.nl?.NONE || 'none';
    const selector = selectors?.getSelector?.(media, `.${AI_HIDDEN_CLASS_NAME}`);
    try {
      const current = selector?.getCSS?.(displayProp);
      const currentValue = typeof current === 'string' ? current : current?.value;
      if (selector && currentValue !== noneValue) selector.setCSS?.(displayProp, noneValue);
    } catch {}

    return manager.findByName?.(AI_HIDDEN_CLASS_NAME) || mainCollection.findByName?.(AI_HIDDEN_CLASS_NAME) || className;
  }

  function hideLayerForImageChange(api, layerId) {
    const target = getOriginalTag(api, layerId);
    const hiddenClass = ensureHiddenLayerClass(api);
    if (!target || !hiddenClass?.id) return null;

    const originalClassNameIds = Array.isArray(target.classNameIds) ? target.classNameIds.slice() : [];
    if (!originalClassNameIds.includes(hiddenClass.id)) {
      target.addClassNameId?.(hiddenClass.id);
      if (!target.classNameIds?.includes?.(hiddenClass.id)) {
        target.classNameIds = originalClassNameIds.concat(hiddenClass.id);
      }
    }
    return {
      layerId: getOriginalId(api, readObjectValue(target, 'id')),
      classNameIds: originalClassNameIds
    };
  }

  function removeLayerById(api, layerId) {
    const tag = getOriginalTag(api, layerId);
    if (!tag?.id || !api?.layout?.remove) return false;
    try {
      return api.layout.remove(readObjectValue(tag, 'deepOriginID') || tag.id, !!tag.isSymbol) !== false;
    } catch {
      return false;
    }
  }

  function applyImageChangeSet(changeSetId) {
    const changeSet = state.changeSets.get(changeSetId);
    if (!changeSet?.imageChange || !changeSet?.context) {
      addErrorMessage('Набор изменений устарел. Повторите запрос.');
      return;
    }
    if (changeSet.applied) {
      updateChangeCardState(changeSetId, true);
      return;
    }

    const api = getTaptopApi();
    const originalTag = getOriginalTag(api, changeSet.context.selectedId);
    if (!api?.layout || !originalTag?.id) {
      addErrorMessage('Не удалось получить ��ыбранный image-слой');
      return;
    }

    try {
      const originalId = getOriginalId(api, originalTag.id);
      const result = applyImageChangeToTagDirect(originalTag, changeSet.imageChange);
      if (!result.count) throw new Error('В выбранном image-слое не найден источник изображения');

      changeSet.applyState = {
        type: 'direct',
        originalLayerId: originalId,
        originals: result.originals
      };
      changeSet.applied = true;
      dispatchUpdate('AI assistant image update', false, { skipResize: true });
      updateChangeCardState(changeSetId, true);
    } catch (error) {
      addErrorMessage(error?.message || 'Не удалось применить image-изменение');
      updateChangeCardState(changeSetId, false);
    }
  }

  function undoImageChangeSet(changeSetId) {
    const changeSet = state.changeSets.get(changeSetId);
    if (!changeSet) {
      addErrorMessage('Набор изменений устарел. Повторите запрос.');
      return;
    }
    if (!changeSet.applied) {
      updateChangeCardState(changeSetId, false);
      return;
    }

    const api = getTaptopApi();
    const applied = changeSet.applyState || {};
    let restored = false;

    if (applied.type === 'direct') {
      restored = restoreDirectImageChanges(applied.originals) > 0;
    } else {
      const originalTag = getOriginalTag(api, applied.originalLayerId);
      if (originalTag && Array.isArray(applied.originalClassNameIds)) {
        restored = setTagClassNameIds(originalTag, applied.originalClassNameIds) || restored;
      }

      if (applied.createdLayerId) {
        restored = removeLayerById(api, applied.createdLayerId) || restored;
      }
    }

    if (!restored) {
      updateChangeCardState(changeSetId, true);
      addErrorMessage('Не удалось отменить image-изменение');
      return;
    }

    changeSet.applied = false;
    dispatchUpdate('AI assistant image undo', false, { skipResize: true });
    updateChangeCardState(changeSetId, false);
  }

  async function applyConstructorChangeSet(changeSetId) {
    const changeSet = state.changeSets.get(changeSetId);
    if (!changeSet?.clipboardData) {
      addErrorMessage('Слой конструктора устарел. Повторите запрос.');
      return;
    }
    if (changeSet.applied) {
      updateChangeCardState(changeSetId, true);
      return;
    }

    const api = getTaptopApi();
    if (!api?.clipboardStore && !api?.clipboard) {
      addErrorMessage('Буфер TapTop еще недоступен');
      return;
    }

    if (changeSet.applyMode === 'insert') {
      const target = getOriginalTag(api, changeSet.insertTargetId || changeSet.context?.selectedId);
      if (!api?.layout || !target?.id || !api?.clipboard?.pasteFromClipboard) {
        addErrorMessage('Не удалось получить выбранный слой для вставки');
        return;
      }

      const previousRaw = currentClipboardRaw();
      const createdLayerIds = [];
      try {
        const marker = buildAppendMarkerPosition(api, target);
        const pasted = await pasteClipboardDataAtMarker(api, changeSet.clipboardData, marker);
        const id = pastedLayerId(pasted);
        if (!id) throw new Error('TapTop не вернул созданный слой');
        const createdId = getOriginalId(api, id);
        createdLayerIds.push(createdId);
        restoreClipboardRaw(api, previousRaw);
        changeSet.applyState = { previousRaw, createdLayerIds };
        changeSet.applied = true;
        rememberRuntimeSelection(api, createdId);
        dispatchUpdate('AI assistant constructor insert', true, { skipResize: true });
        updateChangeCardState(changeSetId, true);
        addSystemMessage('Слой добавлен на холст.');
      } catch (error) {
        createdLayerIds.slice().reverse().forEach((id) => removeLayerById(api, id));
        restoreClipboardRaw(api, previousRaw);
        dispatchUpdate('AI assistant constructor insert rollback', true, { skipResize: true });
        addErrorMessage(error?.message || 'Не удалось добавить слой на холст');
        updateChangeCardState(changeSetId, false);
      }
      return;
    }

    try {
      const clipboardData = await resolveConstructorClassConflicts(changeSet.clipboardData);
      if (!clipboardData) {
        updateChangeCardState(changeSetId, false);
        return;
      }
      collectConstructorClipboardSvgMarkups(clipboardData);
      const previousRaw = currentClipboardRaw();
      setClipboardData(api, clipboardData);
      changeSet.applyState = { previousRaw };
      changeSet.resolvedClipboardData = clipboardData;
      changeSet.applied = true;
      updateChangeCardState(changeSetId, true);
      addSystemMessage('Слой добавлен в буфер TapTop. Вставьте его через Cmd/Ctrl+V.');
    } catch (error) {
      addErrorMessage(error?.message || 'Не удалось импортировать слой в буфер');
      updateChangeCardState(changeSetId, false);
    }
  }

  function undoConstructorChangeSet(changeSetId) {
    const changeSet = state.changeSets.get(changeSetId);
    if (!changeSet) {
      addErrorMessage('Набор изменений устарел. Повторите запрос.');
      return;
    }
    if (!changeSet.applied) {
      updateChangeCardState(changeSetId, false);
      return;
    }

    const api = getTaptopApi();
    try {
      if (changeSet.applyMode === 'insert') {
        let removed = 0;
        (changeSet.applyState?.createdLayerIds || []).slice().reverse().forEach((id) => {
          if (removeLayerById(api, id)) removed += 1;
        });
        if (!removed) {
          updateChangeCardState(changeSetId, true);
          addErrorMessage('Не удалось отменить добавление слоя');
          return;
        }
        changeSet.applied = false;
        dispatchUpdate('AI assistant constructor insert undo', true, { skipResize: true });
        updateChangeCardState(changeSetId, false);
        return;
      }
      restoreClipboardRaw(api, changeSet.applyState?.previousRaw || '');
      changeSet.applied = false;
      updateChangeCardState(changeSetId, false);
      addSystemMessage('Буфер TapTop возвращен к предыдущему состоя��ию.');
    } catch (error) {
      addErrorMessage(error?.message || 'Не удалось вернуть буфер');
      updateChangeCardState(changeSetId, true);
    }
  }

  async function applyReplaceLayerChangeSet(changeSetId) {
    const changeSet = state.changeSets.get(changeSetId);
    if (!changeSet?.clipboardData || !changeSet?.context?.selectedId) {
      addErrorMessage('Замена слоя устарела. Повторите запрос.');
      return;
    }
    if (changeSet.applied) {
      updateChangeCardState(changeSetId, true);
      return;
    }

    const api = getTaptopApi();
    const originalTag = getOriginalTag(api, changeSet.context.selectedId);
    if (!api?.layout || !originalTag?.id || !api?.clipboard?.pasteFromClipboard) {
      addErrorMessage('Не удалось получить выбранный слой для замены');
      return;
    }

    const previousRaw = currentClipboardRaw();
    let createdLayerId = '';
    try {
      const position = selectedLayerPosition(api, originalTag);
      const originalClipboardData = readLayerClipboardDataPreservingClipboard(api, originalTag.id);
      const marker = buildPasteMarkerAfterOriginal(api, originalTag);
      if (!position?.parentId || !originalClipboardData || !marker?.id) {
        throw new Error('Не удалось снять исходный слой для замены');
      }

      const pasted = await pasteClipboardDataAtMarker(api, changeSet.clipboardData, marker);
      createdLayerId = getOriginalId(api, pastedLayerId(pasted));
      if (!createdLayerId) throw new Error('TapTop не вернул новый слой');
      if (!removeLayerById(api, originalTag.id)) throw new Error('Не удалось удалить исходный слой');

      restoreClipboardRaw(api, previousRaw);
      changeSet.applyState = {
        previousRaw,
        position,
        originalLayerId: getOriginalId(api, originalTag.id),
        originalClipboardData,
        createdLayerId
      };
      changeSet.applied = true;
      rememberRuntimeSelection(api, createdLayerId);
      dispatchUpdate('AI assistant layer replace', true, { skipResize: true });
      updateChangeCardState(changeSetId, true);
    } catch (error) {
      if (createdLayerId) removeLayerById(api, createdLayerId);
      restoreClipboardRaw(api, previousRaw);
      dispatchUpdate('AI assistant layer replace rollback', true, { skipResize: true });
      addErrorMessage(error?.message || 'Не удалось заменить выбранный слой');
      updateChangeCardState(changeSetId, false);
    }
  }

  async function undoReplaceLayerChangeSet(changeSetId) {
    const changeSet = state.changeSets.get(changeSetId);
    if (!changeSet) {
      addErrorMessage('Замена слоя устарела. П��вторите запрос.');
      return;
    }
    if (!changeSet.applied) {
      updateChangeCardState(changeSetId, false);
      return;
    }

    const api = getTaptopApi();
    const applied = changeSet.applyState || {};
    if (!applied.originalClipboardData) {
      addErrorMessage('Не найден исходный снимок слоя для отката');
      updateChangeCardState(changeSetId, true);
      return;
    }

    const previousRaw = currentClipboardRaw();
    let restoredLayerId = '';
    try {
      if (applied.createdLayerId && getOriginalTag(api, applied.createdLayerId)) {
        removeLayerById(api, applied.createdLayerId);
      }

      const marker = buildRestoreLayerMarker(api, applied.position);
      const pasted = await pasteClipboardDataAtMarker(api, applied.originalClipboardData, marker);
      restoredLayerId = getOriginalId(api, pastedLayerId(pasted));
      if (!restoredLayerId) throw new Error('TapTop не вернул восстановленный слой');

      restoreClipboardRaw(api, previousRaw);
      changeSet.applyState = Object.assign({}, applied, { restoredLayerId });
      changeSet.applied = false;
      rememberRuntimeSelection(api, restoredLayerId);
      dispatchUpdate('AI assistant layer replace undo', true, { skipResize: true });
      updateChangeCardState(changeSetId, false);
    } catch (error) {
      restoreClipboardRaw(api, previousRaw);
      dispatchUpdate('AI assistant layer replace undo failed', true, { skipResize: true });
      addErrorMessage(error?.message || 'Не удалось вернуть исходный слой');
      updateChangeCardState(changeSetId, true);
    }
  }

  async function applyInsertLayerChangeSet(changeSetId) {
    const changeSet = state.changeSets.get(changeSetId);
    if (!changeSet?.insertLayers?.entries?.length || !changeSet?.context) {
      addErrorMessage('Слои для вставки устарели. Повторите запрос.');
      return;
    }
    if (changeSet.applied) {
      updateChangeCardState(changeSetId, true);
      return;
    }

    const api = getTaptopApi();
    const target = getOriginalTag(api, changeSet.context.selectedId);
    if (!api?.layout || !target?.id || !api?.clipboard?.pasteFromClipboard) {
      addErrorMessage('Не удалось получить выбранный слой для вставки');
      return;
    }

    const createdLayerIds = [];
    const previousRaw = currentClipboardRaw();
    try {
      for (const entry of changeSet.insertLayers.entries) {
        const currentTarget = getOriginalTag(api, target.id) || target;
        const marker = buildAppendMarkerPosition(api, currentTarget);
        const pasted = await pasteClipboardDataAtMarker(api, entry.clipboardData, marker);
        const id = pastedLayerId(pasted);
        if (!id) throw new Error('TapTop не вернул созданный слой');
        createdLayerIds.push(getOriginalId(api, id));
      }
      restoreClipboardRaw(api, previousRaw);
      changeSet.applyState = { createdLayerIds, previousRaw };
      changeSet.applied = true;
      dispatchUpdate('AI assistant layer insert', true, { skipResize: true });
      updateChangeCardState(changeSetId, true);
    } catch (error) {
      createdLayerIds.slice().reverse().forEach((id) => removeLayerById(api, id));
      restoreClipboardRaw(api, previousRaw);
      dispatchUpdate('AI assistant layer insert rollback', true, { skipResize: true });
      addErrorMessage(error?.message || 'Не удалось добавить слой в выбранный слой');
      updateChangeCardState(changeSetId, false);
    }
  }

  function undoInsertLayerChangeSet(changeSetId) {
    const changeSet = state.changeSets.get(changeSetId);
    if (!changeSet) {
      addErrorMessage('Слои для вставки устарели. Повторите запрос.');
      return;
    }
    if (!changeSet.applied) {
      updateChangeCardState(changeSetId, false);
      return;
    }

    const api = getTaptopApi();
    let removed = 0;
    (changeSet.applyState?.createdLayerIds || []).slice().reverse().forEach((id) => {
      if (removeLayerById(api, id)) removed += 1;
    });

    if (!removed) {
      updateChangeCardState(changeSetId, true);
      addErrorMessage('Не удалось отменить добавление слоя');
      return;
    }

    changeSet.applied = false;
    dispatchUpdate('AI assistant layer insert undo', true, { skipResize: true });
    updateChangeCardState(changeSetId, false);
  }

  function applyStyleChangeSet(changeSetId) {
    const changeSet = state.changeSets.get(changeSetId);
    if (!changeSet?.styleChanges?.length || !changeSet?.context) {
      addErrorMessage('Набор стилей устарел. Повторите запрос.');
      return;
    }
    if (changeSet.applied) {
      updateChangeCardState(changeSetId, true);
      return;
    }

    const api = getTaptopApi();
    const originals = [];
    let applied = 0;
    changeSet.styleChanges.forEach((change) => {
      const selector = getSelectedStyleSelector(api, changeSet.context, change.media);
      if (!selector) return;
      Object.entries(change.styles || {}).forEach(([property, value]) => {
        const before = readSelectorCss(selector, property);
        if (!setSelectorCss(selector, property, value)) return;
        originals.push({
          media: change.media || 'screen',
          property,
          hadValue: before.hadValue,
          value: before.value
        });
        applied += 1;
      });
    });

    if (!applied) {
      updateChangeCardState(changeSetId, false);
      addErrorMessage('Не удалось применить стили к выбранному слою');
      return;
    }

    changeSet.originals = originals;
    changeSet.applied = true;
    dispatchUpdate('AI assistant style update', true, { skipResize: true });
    updateChangeCardState(changeSetId, true);
  }

  function undoStyleChangeSet(changeSetId) {
    const changeSet = state.changeSets.get(changeSetId);
    if (!changeSet) {
      addErrorMessage('Набор стилей устарел. Повторите запрос.');
      return;
    }
    if (!changeSet.applied) {
      updateChangeCardState(changeSetId, false);
      return;
    }

    const api = getTaptopApi();
    let restored = 0;
    (changeSet.originals || []).forEach((original) => {
      const selector = getSelectedStyleSelector(api, changeSet.context, original.media);
      if (!selector) return;
      const ok = original.hadValue
        ? setSelectorCss(selector, original.property, original.value)
        : removeSelectorCss(selector, original.property);
      if (ok) restored += 1;
    });

    if (!restored) {
      updateChangeCardState(changeSetId, true);
      addErrorMessage('Не удалось отменить стили');
      return;
    }

    changeSet.applied = false;
    dispatchUpdate('AI assistant style undo', true, { skipResize: true });
    updateChangeCardState(changeSetId, false);
  }

  function applyChangeSet(changeSetId) {
    const changeSet = state.changeSets.get(changeSetId);
    if (!changeSet) {
      addErrorMessage('Набор изменений устарел. Повторите запрос.');
      return;
    }
    if (changeSet.type === 'image') {
      applyImageChangeSet(changeSetId);
      return;
    }
    if (changeSet.type === 'constructor') {
      applyConstructorChangeSet(changeSetId);
      return;
    }
    if (changeSet.type === 'insert') {
      applyInsertLayerChangeSet(changeSetId);
      return;
    }
    if (changeSet.type === 'replace') {
      applyReplaceLayerChangeSet(changeSetId);
      return;
    }
    if (changeSet.type === 'style') {
      applyStyleChangeSet(changeSetId);
      return;
    }
    if (changeSet.applied) {
      updateChangeCardState(changeSetId, true);
      return;
    }

    const originals = [];
    let failedReason = '';
    changeSet.changes.forEach((change) => {
      const ref = changeSet.context?.refsById?.get(change.id);
      if (!ref?.ref) {
        failedReason = failedReason || 'Текст для изменения больше не найден';
        return;
      }
      if (ref.ref.type === 'right-panel-textarea') {
        const result = applyRightPanelTextValue(change.value, change.before || ref.text);
        if (!result.ok) {
          if (applyModelTextChange(change, changeSet.context, originals)) return;
          failedReason = failedReason || result.error;
          return;
        }
        originals.push({
          id: change.id,
          value: result.before,
          refType: ref.ref.type
        });
        ref.text = change.value;
        ref.promptText = change.value;
        ref.previewText = textForDisplay(change.value) || change.value;
        return;
      }
      if (ref.ref.type === 'dom-text') {
        if (applyModelTextChange(change, changeSet.context, originals)) return;
        const result = applyRightPanelTextValue(change.value, change.before || ref.text);
        if (!result.ok) {
          failedReason = failedReason || result.error;
          return;
        }
        originals.push({
          id: change.id,
          value: ref.text,
          refType: ref.ref.type
        });
        ref.text = change.value;
        ref.promptText = textForDisplay(change.value) || change.value;
        ref.previewText = textForDisplay(change.value) || change.value;
        return;
      }

      if (!ref.ref.container) {
        failedReason = failedReason || 'Текст для изменения больше не найден';
        return;
      }
      const current = getRefValue(ref.ref);
      originals.push({
        id: change.id,
        value: current,
        refType: ref.ref.type || 'model'
      });
      setRefValue(ref.ref, change.value);
      ref.text = change.value;
      ref.promptText = textForDisplay(change.value) || change.value;
      ref.previewText = textForDisplay(change.value) || change.value;
    });

    if (!originals.length) {
      updateChangeCardState(changeSetId, false);
      addErrorMessage(failedReason || 'Не удалось применить изменения');
      return;
    }
    changeSet.originals = originals;
    changeSet.applied = true;
    dispatchUpdate();
    updateChangeCardState(changeSetId, true);
  }

  function undoChangeSet(changeSetId) {
    const changeSet = state.changeSets.get(changeSetId);
    if (!changeSet) {
      addErrorMessage('Набор изменений устарел. Повторите запрос.');
      return;
    }
    if (changeSet.type === 'image') {
      undoImageChangeSet(changeSetId);
      return;
    }
    if (changeSet.type === 'constructor') {
      undoConstructorChangeSet(changeSetId);
      return;
    }
    if (changeSet.type === 'insert') {
      undoInsertLayerChangeSet(changeSetId);
      return;
    }
    if (changeSet.type === 'replace') {
      undoReplaceLayerChangeSet(changeSetId);
      return;
    }
    if (changeSet.type === 'style') {
      undoStyleChangeSet(changeSetId);
      return;
    }
    if (!changeSet.applied) {
      updateChangeCardState(changeSetId, false);
      return;
    }

    let restored = 0;
    changeSet.originals.forEach((original) => {
      const ref = changeSet.context?.refsById?.get(original.id);
      const change = changeSet.changes.find((item) => item.id === original.id);
      if (!ref?.ref) return;
      if (ref.ref.type === 'right-panel-textarea') {
        const result = applyRightPanelTextValue(original.value, change?.value || ref.text);
        if (!result.ok) {
          if (restoreModelTextChange(original, changeSet.context, change?.value || '')) restored += 1;
          return;
        }
        ref.text = String(original.value || '');
        ref.promptText = ref.text;
        ref.previewText = textForDisplay(ref.text) || ref.text;
        restored += 1;
        return;
      }
      if (ref.ref.type === 'dom-text') {
        const result = applyRightPanelTextValue(original.value, change?.value || ref.text);
        if (!result.ok) {
          if (restoreModelTextChange(original, changeSet.context, change?.value || '')) restored += 1;
          return;
        }
        ref.text = String(original.value || '');
        ref.promptText = ref.text;
        ref.previewText = textForDisplay(ref.text) || ref.text;
        restored += 1;
        return;
      }

      if (!ref.ref.container) return;
      setRefValue(ref.ref, original.value);
      ref.text = String(original.value || '');
      ref.promptText = textForDisplay(ref.text) || ref.text;
      ref.previewText = textForDisplay(ref.text) || ref.text;
      restored += 1;
    });
    if (!restored) {
      updateChangeCardState(changeSetId, true);
      addErrorMessage('Не удалось отменить изменения');
      return;
    }
    changeSet.applied = false;
    dispatchUpdate();
    updateChangeCardState(changeSetId, false);
  }

  function syncChangeCardStates() {
    state.changeSets.forEach((changeSet, changeSetId) => {
      updateChangeCardState(changeSetId, !!changeSet.applied);
    });
  }

  function updateChangeCardState(changeSetId, applied) {
    const card = state.panel?.querySelector(`.tt-enhancer-ai-change-card[data-change-set-id="${cssEscape(changeSetId)}"]`);
    if (!card) return;
    card.classList.toggle('is-applied', applied);
    const apply = card.querySelector('[data-action="apply-changes"]');
    const undo = card.querySelector('[data-action="undo-changes"]');
    if (apply) apply.disabled = applied;
    if (undo) undo.disabled = !applied;
  }

  function dispatchUpdate(label = 'AI assistant text update', includeCss = false, options = {}) {
    const api = getTaptopApi();
    try {
      api?.history?.add?.(label);
    } catch {}
    try {
      api?.layers?.setMap?.();
    } catch {}
    try {
      const events = api?.events;
      const eventNames = options.compact ? [
        events?.ON_HTML_UPDATE,
        includeCss ? events?.ON_CSS_CHANGE : null,
        events?.ON_CHANGE,
        events?.ON_UPDATE
      ] : [
        events?.ON_HTML_UPDATE,
        includeCss ? events?.ON_CSS_CHANGE : null,
        events?.ON_CHANGE,
        events?.ON_CHANGE_TAG,
        events?.ON_CHANGE_TAG_DATA,
        events?.ON_CHANGE_TAG_DISPLAY,
        events?.ON_UPDATE,
        events?.ON_DATA_CHANGE
      ];
      eventNames.forEach((eventName) => {
        if (eventName === events?.ON_CSS_CHANGE) events.emit?.(eventName, null, true);
        else if (eventName) events.emit?.(eventName);
      });
    } catch {}
    if (options.skipResize) return;
    try {
      window.dispatchEvent(new Event('resize'));
    } catch {}
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function cssEscape(value) {
    try {
      if (window.CSS?.escape) return window.CSS.escape(String(value));
    } catch {}
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function mount() {
    state.isDestroyed = false;
    clearLegacyPanelPositionState();
    state.isOpen = state.isOpen || readOpenState();
    state.floatingRect = readFloatingRect();
    bindGlobalButtonEvents();
    bindGlobalMenuEvents();
    ensureButton();
    syncOpenUi({ runSideEffects: state.isOpen && !state.selectionTimer });

    if (!state.resizeListener) {
      state.resizeListener = () => {
        if (state.panel) applyPanelMode(state.panel, { save: true });
        scheduleCodeBoxResize(state.panel);
      };
      window.addEventListener('resize', state.resizeListener);
    }

    if (state.observer?.disconnect) state.observer.disconnect();
    state.observer = new MutationObserver(() => {
      scheduleObserverSync();
    });
    state.observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  }

  function scheduleObserverSync() {
    if (state.observerTimer || state.isDestroyed) return;
    state.observerTimer = setTimeout(() => {
      state.observerTimer = 0;
      if (state.isDestroyed) return;
      ensureButton();
      syncOpenUi({ runSideEffects: false });
    }, 600);
  }

  function destroy() {
    if (state.isDestroyed) return;
    state.isDestroyed = true;
    stopSelectionSync();
    stopPanelDrag();
    stopPanelResize();
    cancelRailAnimation();
    clearTimeout(state.observerTimer);
    clearTimeout(state.menuHideTimer);
    clearTimeout(state.panelCloseTimer);
    clearTimeout(state.railAnimationTimer);
    clearTimeout(state.codeEditorInitTimer);
    if (state.codeResizeFrame) {
      cancelAnimationFrame(state.codeResizeFrame);
      state.codeResizeFrame = 0;
    }
    state.observerTimer = 0;
    state.menuHideTimer = 0;
    state.panelCloseTimer = 0;
    state.railAnimationTimer = 0;
    state.codeEditorInitTimer = 0;
    state.observer?.disconnect?.();
    if (state.resizeListener) {
      window.removeEventListener('resize', state.resizeListener);
      state.resizeListener = null;
    }
    unbindGlobalButtonEvents();
    unbindGlobalMenuEvents();
    document.getElementById(BUTTON_ID)?.remove();
    document.getElementById(RAIL_BUTTON_ID)?.remove();
    document.querySelectorAll('.tt-enhancer-ai-canvas-host').forEach((node) => {
      node.classList?.remove('tt-enhancer-ai-canvas-host');
    });
    destroyCodeEditors(document.getElementById(PANEL_ID));
    document.getElementById(PANEL_ID)?.remove();
    document.getElementById(PUTER_SANDBOX_ID)?.remove();
    state.puterSandboxFrame = null;
    removeLegacyAiPanelDom();
    state.changeSets.clear();
    if (window.ttEnhancerOpenAiPanel === state.open) delete window.ttEnhancerOpenAiPanel;
    if (window.ttEnhancerToggleAiPanel === state.toggle) delete window.ttEnhancerToggleAiPanel;
    delete window[STATE_KEY];
    delete window[LEGACY_STATE_KEY];
  }

  window.ttEnhancerOpenAiPanel = state.open;
  window.ttEnhancerToggleAiPanel = state.toggle;
  window[STATE_KEY] = state;
  window[LEGACY_STATE_KEY] = state;
  mount();
})();
