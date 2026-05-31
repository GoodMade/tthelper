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
        label: "Кнопка «Редактировать» рядом с выделенным embed-слоем",
        js: ["features/layers/embed-context-menu.js"],
        deinit: "features/layers/embed-context-menu.deinit.js",
        reloadRequired: true
      },
      selectedLayerVisibilityToggles: {
        label: "Кнопки «Скрыть\\Показать» рядом с выделенным слоем",
        js: ["features/layers/selected-layer-visibility-toggles.js"],
        deinit: "features/layers/selected-layer-visibility-toggles.deinit.js",
        reloadRequired: true
      },
      crossProjectClipboard: {
        label: "Копирование слоёв между проектами",
        js: ["features/layers/cross-project-clipboard.js"],
        isolated_js: ["features/layers/cross-project-clipboard-bridge.js"],
        deinit: "features/layers/cross-project-clipboard.deinit.js",
        isolated_deinit: "features/layers/cross-project-clipboard-bridge.deinit.js",
        reloadRequired: true
      },
      jsonTransfer: {
        label: "Экспорт/импорт слоёв JSON",
        css: ["features/layers/json-transfer.css"],
        js: ["features/layers/json-transfer.js"],
        deinit: "features/layers/json-transfer.deinit.js",
        reloadRequired: true
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
      },
      searchReplace: {
        label: "Поиск и замена текста на холсте",
        tooltip: "Добавляет меню в правую панель для поиска и замены текста, включая регулярные выражения.",
        css: ["features/right-panel/search-replace.css"],
        js: ["features/right-panel/search-replace.js"],
        deinit: "features/right-panel/search-replace.deinit.js",
        defaultValue: true,
        reloadRequired: false
      }
    }
  },
  miniBrowser: {
    name: "Мини браузер",
    options: {
      pinnedTabs: {
        type: "browserTabs",
        label: "Закрепленные вкладки браузера",
        storageKey: "miniBrowser_pinnedTabs",
        css: ["features/mini-browser/browser-panel.css"],
        isolated_js: ["features/mini-browser/browser-panel.js"],
        isolated_deinit: "features/mini-browser/browser-panel.deinit.js",
        dnrRulesets: ["gemini_frame_rules"],
        defaultValue: [
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
