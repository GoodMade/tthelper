const featuresConfig = {
  codeEditor: {
    name: "Редактор кода",
    options: {
      enableSearch: {
        label: "Включить поиск в редакторе (cmd+f)",
        external_js: [
          "https://cdn.jsdelivr.net/npm/ace-builds@1.43.4/src-noconflict/ext-searchbox.js"
        ],
        js: [
          "features/code-editor/search.js"
        ],
        reloadRequired: true
        // deinit: "features/code-editor/search.deinit.js" // если добавишь деинициализатор
      },
      disableAiAgent: {
        label: "Отключить ии агент в редакторе кода",
        css: ["features/code-editor/disable-ai-agent.css"],
        js: ["features/code-editor/disable-ai-agent.js"],
        deinit: "features/code-editor/disable-ai-agent.deinit.js",
        reloadRequired: true
      },
      modalResize: {
        label: "Кнопка «по высоте» и resize окна",
        css: ["features/modal/resize.css"],
        js: ["features/modal/resize.js"],
        deinit: "features/modal/resize.deinit.js",
        reloadRequired: true
      },
      temporaryTabs: {
        label: "Временные вкладки в редакторе кода",
        css: ["features/code-editor/temporary-tabs.css"],
        js: ["features/code-editor/temporary-tabs.js"],
        deinit: "features/code-editor/temporary-tabs.deinit.js",
        reloadRequired: true
      }
    }
  },
  // theme: {
  //   name: "Тема",
  //   options: {
  //     dark: {
  //       label: "Темная тема",
  //       css: ["features/theme/dark.css"],
  //       reloadRequired: false
  //     }
  //   }
  // },
  topPanelInterface: {
    name: "Интерфейс верхней панели",
    options: {
      openCurrentSiteTabButton: {
        label: "Кнопка открытия сайта в новой вкладке",
        tooltip: "Добавляет в верхнюю панель кнопку, которая открывает сайт текущего редактора по домену вкладки.",
        storageKey: "miniBrowser_openCurrentSiteTabButton",
        defaultValue: false,
        applyOnChange: false,
        reloadRequired: false
      }
    }
  },
  canvasInterface: {
    name: "Интерфейс холста",
    options: {
      compactHiddenElementNotice: {
        label: "Уменьшить панель уведомления о скрытом элементе",
        css: ["features/canvas/hidden-element-notice-compact.css"],
        js: ["features/canvas/hidden-element-notice-compact.js"],
        deinit: "features/canvas/hidden-element-notice-compact.deinit.js",
        reloadRequired: false
      }
    }
  },
  uiLayers: {
    name: "Интерфейс левой панели",
    options: {
      layersSearch: {
        label: "Поиск по слоям",
        css: ["features/layers/search.css"],
        js: ["features/layers/search.js"],
        deinit: "features/layers/search.deinit.js",
        reloadRequired: true
      },
      embedContextMenuEdit: {
        label: "Кнопка Редактировать рядом с выделеным embed слоем",
        disabledOnFreePlan: true,
        js: [
          "features/layers/embed-context-menu-edit.init.js",
          "features/layers/embed-context-menu.js"
        ],
        deinit: [
          "features/layers/embed-context-menu-edit.deinit.js",
          "features/layers/embed-context-menu.js"
        ],
        reloadRequired: true
      },
      selectedLayerVisibilityToggles: {
        label: "Кнопки «Скрыть\\Показать» рядом с выделенным слоем",
        js: ["features/layers/selected-layer-visibility-toggles.js"],
        deinit: "features/layers/selected-layer-visibility-toggles.deinit.js",
        reloadRequired: true
      }
    }
  },
  widgets: {
    name: "Виджеты",
    options: {
      scriptWidget: {
        label: "Виджет Script",
        tooltip: "Embed слой с  подготовленными тегами script и style",
        disabledOnFreePlan: true,
        fallbackStorageKey: "uiLayers_embedContextMenuEdit",
        js: [
          "features/layers/script-widget.init.js",
          "features/layers/embed-context-menu.js"
        ],
        deinit: [
          "features/layers/script-widget.deinit.js",
          "features/layers/embed-context-menu.js"
        ],
        reloadRequired: true
      },
      githubWidgets: {
        type: "widgetSourcesToggle",
        label: "Дополнительные виджеты",
        tooltip: "Добавляет карточки виджетов из TapTop Helper и пользовательских публичных источников.",
        disabledOnFreePlan: true,
        storageKey: "widgets_githubWidgets",
        sourcesStorageKey: "widgets_additionalWidgetSources",
        sourcesDefaultValue: [
          {
            id: "tthelper_data",
            title: "TapTop Helper",
            type: "github",
            url: "https://github.com/GoodMade/tthelper_data/tree/main/widgets",
            readonly: true
          }
        ],
        css: ["widgets_settings/kineskope/kineskope.css"],
        js: [
          "features/widgets/github-widgets.init.js",
          "features/layers/embed-context-menu.js",
          "widgets_settings/kineskope/kineskope.js"
        ],
        isolated_js: ["features/widgets/github-widgets-bridge.js"],
        deinit: [
          "widgets_settings/kineskope/kineskope.deinit.js",
          "features/widgets/github-widgets.deinit.js",
          "features/layers/embed-context-menu.js"
        ],
        isolated_deinit: "features/widgets/github-widgets-bridge.deinit.js",
        defaultValue: false,
        paidDefaultValue: true,
        reloadRequired: true
      }
    }
  },
  features: {
    name: "Фичи",
    options: {
      aiGeminiChat: {
        label: "AI чат",
        tooltip: "Чат для правки текста и image-слоёв через Gemini, OpenRouter или Puter.js.",
        storageKey: "features_aiGeminiChat",
        dnrRulesets: ["gemini_frame_rules"],
        css: ["features/ai-panel/gemini-panel.css"],
        js: ["features/ai-panel/gemini-panel.js"],
        isolated_js: ["features/ai-panel/gemini-panel-bridge.js"],
        deinit: "features/ai-panel/gemini-panel.deinit.js",
        isolated_deinit: "features/ai-panel/gemini-panel-bridge.deinit.js",
        defaultValue: false,
        reloadRequired: false
      },
      crossProjectClipboard: {
        label: "Копирование слоёв между проектами",
        disabledOnFreePlan: true,
        storageKey: "uiLayers_crossProjectClipboard",
        js: ["features/layers/cross-project-clipboard.js"],
        isolated_js: ["features/layers/cross-project-clipboard-bridge.js"],
        deinit: "features/layers/cross-project-clipboard.deinit.js",
        isolated_deinit: "features/layers/cross-project-clipboard-bridge.deinit.js",
        reloadRequired: true
      },
      jsonTransfer: {
        label: "Экспорт/импорт слоёв JSON",
        tooltip: "Добавляет экспорт выбранного слоя в JSON и импорт JSON в буфер.",
        freePlanLabel: "Экспорт слоёв JSON",
        freePlanTooltip: "На бесплатном тарифе доступен только экспорт слоев JSON. Импорт JSON остается для платного тарифа.",
        storageKey: "uiLayers_jsonTransfer",
        css: ["features/layers/json-transfer.css"],
        js: ["features/layers/json-transfer.js"],
        deinit: "features/layers/json-transfer.deinit.js",
        reloadRequired: true
      },
      searchReplace: {
        label: "Поиск и замена текста на холсте",
        tooltip: "Добавляет меню в правую панель для поиска и замены текста, включая регулярные выражения.",
        storageKey: "rightPanelInterface_searchReplace",
        css: ["features/right-panel/search-replace.css"],
        js: ["features/right-panel/search-replace.js"],
        isolated_js: ["features/right-panel/search-replace-storage-bridge.js"],
        deinit: "features/right-panel/search-replace.deinit.js",
        isolated_deinit: "features/right-panel/search-replace-storage-bridge.deinit.js",
        defaultValue: true,
        reloadRequired: false
      },
      reuseDeletedClassNames: {
        label: "Классы проекта и слоя",
        tooltip: "Добавляет пункты «Классы проекта», «Классы слоя» и «Удалить классы» для очистки классов слоя и вложенных слоёв без резерва имён.",
        storageKey: "fixes_reuseDeletedClassNames",
        js: ["features/fixes/reuse-deleted-class-names.js"],
        deinit: "features/fixes/reuse-deleted-class-names.deinit.js",
        defaultValue: true,
        reloadRequired: false
      }
    }
  },
  fixes: {
    name: "Патчи",
    options: {
      safeMode: {
        label: "Безопасный режим расширения",
        tooltip: "Не внедряет фичи в страницу конструктора. Используйте, если TapTop зависает при загрузке.",
        storageKey: "ttEnhancer_safeModeManual",
        defaultValue: false,
        reloadRequired: false
      },
      disableHiddenLayerAutoclose: {
        label: "Отключить автозакрытие скрытых слоев",
        tooltip: "Оставляет слой раскрытым в левой панели, если он скрыт через display:none или настройку видимости.",
        js: ["features/fixes/disable-hidden-layer-autoclose.js"],
        deinit: "features/fixes/disable-hidden-layer-autoclose.deinit.js",
        defaultValue: false,
        reloadRequired: false
      }
    }
  },
  rightPanelInterface: {
    name: "Интерфейс правой панели",
    options: {
      disableTooltips: {
        label: "Отключить подсказки",
        tooltip: "Подсказки можно увидеть если при наведении зажать клавишу CTRL.",
        css: ["features/right-panel/disable-tooltips.css"],
        js: ["features/right-panel/disable-tooltips.js"],
        reloadRequired: false
      },
      colorPaletteTooltips: {
        label: "Подсказки в палитре цветов",
        tooltip: "Показывает имя сохранённого цвета при наведении и добавляет подробный список сохранённых цветов в палитре.",
        css: ["features/right-panel/color-palette-tooltips.css"],
        js: ["features/right-panel/color-palette-tooltips.js"],
        deinit: "features/right-panel/color-palette-tooltips.deinit.js",
        defaultValue: false,
        reloadRequired: false
      },
      freeHorizontalMove: {
        label: "Свободное горизонтальное перемещение панели",
        tooltip: "Позволяет тянуть правую панель конструктора по горизонтали за верхнюю область. Двойной клик по зоне перетаскивания возвращает панель на место.",
        css: ["features/right-panel/free-horizontal-move.css"],
        js: ["features/right-panel/free-horizontal-move.js"],
        deinit: "features/right-panel/free-horizontal-move.deinit.js",
        defaultValue: false,
        reloadRequired: false
      },
      dvhHeight: {
        label: "Расширить список единиц измерения",
        tooltip: "Добавляет: dvh, svh, lvh, vmin, vmax, ch",
        helpPopup: {
          title: "Шпаргалка единиц измерения",
          link: {
            label: "Подробнее",
            url: "https://doka.guide/css/vw-vh/"
          },
          items: [
            { term: "dvh", text: "динамическая высота экрана, меняется при появлении и скрытии панелей браузера." },
            { term: "svh", text: "безопасная мобильная высота экрана." },
            { term: "lvh", text: "максимальная мобильная высота экрана." },
            { term: "vmin", text: "размер от меньшей стороны экрана, хорошо для квадратов/кругов." },
            { term: "vmax", text: "размер от большей стороны, хорошо для крупных декоративных вещей." },
            { term: "ch", text: "ширина по количеству символов, отлично для текстовых блоков." }
          ]
        },
        storageKey: "units_dvhHeight",
        js: ["features/units/dvh-height.js"],
        reloadRequired: true
      }
    }
  },
  miniBrowser: {
    name: "Мини браузер",
    options: {
      browserPanelHost: {
        hidden: true,
        storageKey: "miniBrowser_browserPanelHost",
        enabledWhenAnyOf: [
          "miniBrowser_enabled",
          "miniBrowser_sidePanelBrowser",
          "miniBrowser_openCurrentSiteTabButton"
        ],
        css: ["features/mini-browser/browser-panel.css"],
        isolated_js: ["features/mini-browser/browser-panel.js"],
        isolated_deinit: "features/mini-browser/browser-panel.deinit.js",
        defaultValue: true,
        reloadRequired: false
      },
      enabled: {
        label: "Мини браузер",
        tooltip: "Добавляет кнопку мини браузера в верхнюю панель редактора.",
        storageKey: "miniBrowser_enabled",
        dnrRulesets: ["gemini_frame_rules"],
        defaultValue: false,
        reloadRequired: false
      },
      sidePanelBrowser: {
        label: "Браузер правой панели",
        tooltip: "Добавляет кнопку браузера в боковой панели Chrome.",
        storageKey: "miniBrowser_sidePanelBrowser",
        dnrRulesets: ["gemini_frame_rules"],
        defaultValue: false,
        reloadRequired: false
      },
      pinnedTabs: {
        type: "browserTabs",
        label: "Закрепленные ссылки",
        storageKey: "miniBrowser_pinnedTabs",
        defaultValue: [
          { id: "project-site", title: "Сайт проекта", url: "", active: true, dynamicUrl: "currentSite" },
          { id: "gemini", title: "Gemini", url: "https://gemini.google.com", active: true },
          { id: "deepseek", title: "Deepseek", url: "https://chat.deepseek.com", active: false },
          { id: "claude", title: "Claude", url: "https://claude.ai", active: false },
          { id: "chatgpt", title: "ChatGPT", url: "https://openai.com", active: false },
          { id: "qwen", title: "Qwen", url: "https://chat.qwen.ai", active: false },
          { id: "kimi", title: "Kimi", url: "https://www.kimi.com", active: false },
          { id: "glm", title: "GLM", url: "https://chat.z.ai", active: false },
          { id: "gigachat", title: "GigaChat", url: "https://giga.chat", active: false }
        ],
        reloadRequired: false
      }
    }
  },
  previewMode: {
    name: "Режим предпросмотра",
    options: {
      increasePreviewWidth: {
        label: "Увеличить ширину предпросмотра",
        css: ["features/preview-mode/increase-width.css"],
        reloadRequired: true
      }
    }
  }
};
