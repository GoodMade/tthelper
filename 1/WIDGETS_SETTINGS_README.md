# Widgets Settings

Этот файл локальный и добавлен в `.gitignore`. Он нужен как памятка по устройству папки `widgets_settings` для нас и для нейронки.

## Идея

`widgets_settings` хранит код настроек для конкретных виджетов. Это не универсальная система форм и не удаленный JS из GitHub. Каждый виджет может иметь свою механику, свой интерфейс и свои способы изменения слоя.

GitHub-виджеты остаются данными: `layers.json`, `script.json` и, если понадобится, декларативное описание вроде `widget.json`. Исполняемый JS/CSS для настроек лежит внутри расширения.

## Структура

```text
widgets_settings/
  kineskope/
    kineskope.js
    kineskope.css
    kineskope.deinit.js
```

Папка называется так же, как виджет или его стабильный ключ. Для `data-widget="kineskope"` используется `widgets_settings/kineskope/`.

## Файлы

`<widget>.js` создает интерфейс и реализует функции настроек конкретного виджета.

`<widget>.css` содержит стили интерфейса настроек.

`<widget>.deinit.js` убирает интерфейс и восстанавливает состояние при выключении фичи или переинъекции.

Дополнительные файлы можно добавлять рядом, если виджету нужны свои helpers, шаблоны или ассеты.

## Источники дополнительных виджетов

Опция `Дополнительные виджеты` использует старый storage key `widgets_githubWidgets`, чтобы не ломать существующие настройки включения.

Пользовательские источники хранятся отдельно в `chrome.storage.sync` по ключу `widgets_additionalWidgetSources`. Дефолтный источник отображается как `TapTop Helper`, имеет внутренний id `tthelper_data` и не хранится как пользовательский пункт: он всегда добавляется кодом и остается нередактируемым в popup.

Отключенные пользователем виджеты хранятся в `chrome.storage.sync` по ключу `widgets_additionalWidgetDisabled`. Это объект с ключами вида `sourceId::widget-name` и значением `true`. Если ключа нет, виджет считается включенным, поэтому новые загруженные виджеты включаются по умолчанию.

Локально загруженные пользователем виджеты отображаются отдельным readonly-источником `Загруженные виджеты` с id `local_uploaded_widgets`. Файлы не записываются в папку расширения: Chrome extension runtime не может менять собственные файлы после установки. Вместо этого `layers.json` и `script.json` хранятся в `chrome.storage.local` внутри `widgets_additionalWidgetCache`:

```text
widgets_additionalWidgetCache.local_uploaded_widgets.files.<widget-name>.layers.json
widgets_additionalWidgetCache.local_uploaded_widgets.files.<widget-name>.script.json
```

При локальной загрузке имя виджета должно быть латинским slug (`my-widget`) и совпадать с `data-widget` в `layers.json`. Это важно, потому что настройки виджетов ищут слой по `data-widget`. Если два разных виджета используют одинаковый `data-widget`, настройки и runtime-скрипты могут зацепить оба. Поэтому `data-widget` считается глобальным id типа виджета, а `sourceId::widget-name` — только ключом источника для UI/cache.

Формат пользовательского источника:

```json
{
  "id": "source-...",
  "title": "My widgets",
  "type": "github",
  "url": "https://github.com/user/repo/tree/main/widgets",
  "active": true
}
```

`type: "github"` читает публичный GitHub-репозиторий через структуру:

```text
widgets/
  widget-name/
    layers.json
    script.json
```

Можно указывать ссылку на репозиторий или сразу на папку, например `https://github.com/user/repo/tree/main/widgets`.

Список GitHub-виджетов грузится в таком порядке:

1. jsDelivr Data API `https://data.jsdelivr.com/v1/packages/gh/<owner>/<repo>@<branch>?structure=flat`.
2. `widgets.json` в raw-папке, если он есть.
3. HTML страницы папки `github.com/.../tree/.../widgets`.
4. GitHub API `contents` как последний fallback.

Так расширение не упирается сразу в анонимный лимит GitHub API.

Файлы GitHub-виджетов (`layers.json`, `script.json`) скачиваются через jsDelivr CDN:

```text
https://cdn.jsdelivr.net/gh/<owner>/<repo>@<branch>/<path>/<widget>/layers.json
```

GitHub token для источников не используется и поля token в popup нет. Старый ключ `widgets_githubToken` считается legacy/sensitive: popup не экспортирует его в backup, если он когда-то был сохранен в `chrome.storage.local`.

Загруженные источники кэшируются в `chrome.storage.local`:

```text
widgets_additionalWidgetCache
widgets_additionalWidgetSyncStatus
```

В редакторе список и JSON-файлы виджетов берутся из local cache. Онлайн-запросы выполняются при первой синхронизации источника, после изменения URL/типа источника или при ручном нажатии кнопки синхронизации в popup.

`type: "folder"` читает прямую папку хостинга. Так как обычная папка по HTTP не дает надежный список файлов, рядом должен быть индекс:

```text
https://example.com/widgets/widgets.json
https://example.com/widgets/widget-name/layers.json
https://example.com/widgets/widget-name/script.json
```

`widgets.json` может быть массивом строк:

```json
["widget-name", "another-widget"]
```

или объектом:

```json
{
  "widgets": [
    { "name": "widget-name" },
    { "name": "another-widget" }
  ]
}
```

## Подключение настроек виджетов

Файлы подключаются через `features/config.js`. Например настройки Kineskope сейчас подключаются как часть опции `widgets.githubWidgets`, чтобы у GitHub-виджетов доп-настройки были включены по умолчанию и не появлялись отдельным тумблером.

Если путь лежит вне `features/`, его нужно разрешить в `manifest.json` через `web_accessible_resources`, потому что CSS загружается со страницы по URL расширения.

## Как добавлять новый виджет

1. Создать папку `widgets_settings/<widget-name>/`.
2. Добавить `<widget-name>.js`, `<widget-name>.css`, при необходимости `<widget-name>.deinit.js`.
3. Подключить файлы в `features/config.js` к той фиче, которая должна включать эти настройки.
4. Если файлы находятся в новой корневой папке, проверить `manifest.json -> web_accessible_resources`.
5. В JS ориентироваться на стабильные признаки слоя: `data-widget`, `data-role`, `data-src`, имя слоя или другой явно заданный data-параметр.

## Почему не удаленный JS

Chrome MV3 плохо совместим с удаленно загружаемым исполняемым кодом. Поэтому из GitHub лучше брать только данные и декларативные флаги, а JS/CSS настроек хранить внутри расширения.
