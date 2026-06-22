# Аудит конвертора HTML → слои TapTop (tthelper): дефекты конвертации стилей и улучшения

<aside>
🎯

Главный вывод: фактическая конвертация стилей в слои выполняется детерминированным локальным сборщиком (`buildConstructorClipboardData` и парсер CSS), а вкладка «Правила» (`nativeStyles`, `styleGuards`, `embedCss`, `skipClasses`) влияет **только на промпт для модели** и **не применяется** в самом сборщике. Отсюда основная часть «некорректной» конвертации: сборщик живёт по своим зашитым правилам, расходящимся с тем, что обещано пользователю и модели.

</aside>

Анализ выполнен по исходникам репозитория [GoodMade/tthelper](https://github.com/GoodMade/tthelper), основной файл — `features/ai-panel/gemini-panel.js` (фича «Сверстай по коду» / builder mode). Приложенный `taptop-full.js` — это бандл самого редактора TapTop (целевая платформа), а не конвертора.

## 1. Как устроена конвертация

Есть два пути получения структуры слоёв и три источника стилей.

**Пути получения дерева слоёв:**

1. **AI → `constructor.root`** (`constructorSystemInstruction`): модель сразу возвращает JSON-спецификацию слоёв со `styles` / `mediaStyles`.
2. **AI → html/css/js, затем локальный парсинг** (`builderCodeSystemInstruction` → `localConstructorHtmlNodes` через `DOMParser` → `buildConstructorClipboardData`): модель пишет обычную вёрстку, а расширение само раскладывает её на слои.
3. **Вкладки «Вёрстка/Стили/Скрипт»** (`buildCodeLayoutPrompt`): пользовательский HTML/CSS отправляется модели, и параллельно сырой CSS парсится локально (`addConstructorSourceCssClassStyles`).

**Куда попадают стили:**

- Инлайновые `styles` / `mediaStyles` слоя → `designSelectors` под уникальным классом `.<base>--u-<id>` (через `addConstructorLayerStyles`).
- `classStyles` / `mediaClassStyles` → `mainSelectors` под `.<className>`.
- Сырой исходный CSS (вкладка «Стили», блоки `<style>`) → `parseConstructorCssRules` → правила классов, root-селекторы и селекторы по тегам.

```mermaid
flowchart TD
    A["HTML/CSS пользователя или AI"] --> B{"Путь"}
    B -->|"AI constructor.root"| C["normalizeConstructorRoot"]
    B -->|"AI html/css/js"| D["localConstructorHtmlNodes (DOMParser)"]
    B -->|"Вкладки кода"| D
    C --> E["buildConstructorLayer"]
    D --> E
    E --> F["addConstructorLayerStyles (styles/mediaStyles)"]
    A --> G["addConstructorSourceCssClassStyles"]
    G --> H["parseConstructorCssRules"]
    F --> I["designSelectors / mainSelectors"]
    H --> I
    I --> J["clipboardData TapTop"]
</callout>

<callout icon="⚠️" color="yellow_bg">
Важная деталь: `createConstructorBuildContext` получает из правил **только** `keepClasses`, `replaceFrom`, `replaceTo`. А `addConstructorSourceCssClassStyles` использует ещё `rootSelectors` и `rootClassStyles`. Поля `nativeStyles`, `styleGuards`, `embedCss`, `skipClasses` в детерминированном коде **не читаются нигде** — только в `builderRulesPromptText` (текст для модели).
</callout>

## 🎛 Панель стилизации слоя в TapTop — фактическая схема (по бандлу `taptop-full.js`)

Это и есть «как устроены поля стилизации слоя», на основе чего нужно чинить конвертор. Слой хранит стили не как произвольный CSS-текст, а как структуру «свойство → объект значения» с фиксированным enum поддерживаемых свойств (`m.Fi` в бандле).

### Модель значения
Каждое значение свойства — объект, а не строка:

- `value` — значение;
- `isCustom` — флаг «значение нестандартное» (произвольная строка вместо разобранного числа/единицы/варианта);
- для размерных свойств — `number` + `unit` + `available` (`available` = значение распознано пикером).

Сериализация значения в бандле сводится к двум веткам:

```

// обычное размерное значение: число + единица

`${this.number}${this.unit}`

// нестандартное значение (calc/var/произвольная строка)

`calc(${this.number} ...)`

```jsx

<callout icon="🔑" color="red_bg">
	Главное для конвертора: если значение нельзя разложить на `number`+`unit` или известный вариант (это `calc()`, `var()`, многослойные `box-shadow`/`transition`/`background`, функции `transform` и т.п.), его нужно записывать с `isCustom: true`. Сейчас сборщик всегда ставит `isCustom:false` (дефект 2.7) — отсюда «значение есть, но не применяется».
</callout>

### Единицы измерения (enum)
`px`, `%`, `auto`, `none`, `normal`, `em`, `rem`, `vw`, `vh`, `fr`, `deg`, `rad`, `grad`, `turn`, `num`, `top`, `center`, `bottom`.

### Какие свойства слой поддерживает нативно (точные ключи)
TapTop поддерживает заметно больше, чем «текст + размеры». Список полей по секциям панели (имена — ровно те ключи, что ждёт слой):

- **Размеры и отступы:** `margin-top/bottom/left/right`, `padding-top/bottom/left/right`, `width`, `min-width`, `max-width`, `height`, `min-height`, `max-height`
- **Flex (родитель):** `flex-direction`, `flex-wrap`, `justify-content`, `align-items`, `align-content`; **(потомок):** `align-self`, `flex-grow`, `flex-shrink`, `flex-basis`, `order`
- **Grid:** `grid-template-columns`, `grid-template-rows`, `grid-auto-flow`, `justify-items`, `justify-self`, `grid-row-start/end`, `grid-column-start/end`
- **Gap:** `column-gap`, `row-gap`
- **Раскладка:** `display`, `overflow-x`, `overflow-y`, `position`, `top/right/bottom/left`, `z-index`, `float`, `clear`
- **Типографика:** `font-family`, `font-size`, `font-weight`, `font-style`, `line-height`, `letter-spacing`, `text-indent`, `text-align`, `text-align-last`, `vertical-align`, `text-transform`, `text-decoration`, `text-decoration-line`, `text-shadow`, `color`, `-webkit-text-stroke-color/width`, `white-space`, `overflow-wrap`
- **Фон:** `background-color`, `background-image`, `background-size`, `background-position`, `background-repeat`, `background-attachment`, `background-clip`, `object-fit`
- **Граница и контур:** `border-(top|right|bottom|left)-(width|style|color)`, `border-*-radius` (4 угла), `outline-color/style/width/offset`
- **Эффекты:** `box-shadow`, `opacity`, `mix-blend-mode`, `filter`, `backdrop-filter`, `transform`, `transform-origin`, `perspective`, `perspective-origin`, `backface-visibility`, `cursor`, `pointer-events`, `visibility`, `appearance`, `content`
- **Переходы:** `transition-property`, `transition-duration`, `transition-delay`, `transition-timing-function`

### Точные value-enum'ы секций (сверено с `en-lang.json`)

Языковой файл редактора (ключи локали `DE_RIGHT_STYLES_*`) — это **авторитетная карта «метка UI → свойство»**, и она подтверждает нативную поверхность панели 1-в-1 (включая `transition`-enum выше). Ниже зафиксированы точные наборы значений — конвертору их стоит использовать для **валидации значения перед маршрутизацией**: значение вне enum → `isCustom`/Embed, а не молчаливая потеря.

- **`filter` / `backdrop-filter` — структурированный редактор функций (как `transform`), а НЕ простой longhand.** Функции: `blur` (Radius), `brightness` (Amount), `contrast`, `grayscale`, `hue-rotate` (Angle), `invert`, `saturate`, `sepia` + `drop-shadow`. Конвертору: разбирать `filter: blur(4px) brightness(1.2)` в список функций (по аналогии с Шагом 8 для `transform`); неизвестную функцию или нестандартный порядок → `isCustom:true`/Embed.
- **`mix-blend-mode` (16):** `normal`, `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`, `hard-light`, `soft-light`, `difference`, `exclusion`, `hue`, `saturation`, `color`, `luminosity`.
- **`border-style` (только 4 значения!):** `none` (Нет), `solid` (Сплошная), `dashed` (Пунктирная), `dotted` (Точечная). Значений `double` / `groove` / `ridge` / `inset` / `outset` / `hidden` у границы НЕТ → `isCustom`/Embed. Граница — посторонние longhand `border-(top|right|bottom|left)-(width|style|color)` + режим «все стороны» (иконка связи) и выбор конкретной стороны. Цвет и толщина — общие на сторону.
- **`outline-style` (шире, чем у border!):** `none`, `solid`, `dotted`, `dashed`, `double`, `groove`, `ridge`, `inset`, `outset` (+ отдельно `outline-color` / `outline-width` / `outline-offset`). Асимметрия: `outline-style: double` можно, а `border-style: double` — нет.
- **Размеры (`width` / `height` / `min-*` / `max-*`):** поле = `число` + единица из выпадающего списка. Спец-значения: `width` / `height` (и `top` / `right` / `bottom` / `left`) принимают `auto` (список `autoProperties`); `max-width` / `max-height` принимают `none` (значение по умолчанию); `min-width` / `min-height` по умолчанию `0`. Интринсик-ключевые слова `fit-content` / `max-content` / `min-content` / `stretch` / `fill-available` НЕ поддерживаются. `calc()` / `clamp()` / `min()` / `max()` / `var()` полем размера тоже не парсятся.
- **`border-width`:** только `число` + единица. Ключевые слова `thin` / `medium` / `thick` полем не принимаются → нормализовать в px (`1` / `3` / `5`) либо уводить в `isCustom`.
- **`cursor` (≈40):** `auto`, `default`, `pointer`, `text`, `vertical-text`, `move`, `grab`, `grabbing`, `crosshair`, `cell`, `copy`, `alias`, `context-menu`, `progress`, `wait`, `not-allowed`, `none`, `zoom-in`, `zoom-out` + resize-набор (`n/e/s/w/ne/nw/se/sw`-`resize`, `ew`/`ns`/`nesw`/`nwse`/`col`/`row`-`resize`). Значения вне набора → custom/Embed.
- **`background-clip` (3 опции):** контент (`content-box`) / паддинг (`padding-box`) / текст (`text`). `border-box` — дефолт; прочие → custom.
- **Текст → `white-space` (Breaking):** `normal`, `nowrap`, `pre`, `pre-line`, `pre-wrap`, `break-spaces`. **`text-decoration-line` (Decoration):** `none`, `underline`, `line-through` (нет `overline`). **`text-transform` (Letter case):** `none`, `uppercase`, `lowercase`, `capitalize`.
- **`box-shadow` (структура):** X / Y / Blur / Spread / Color + переключатель Drop (наружу) / Inner (`inset`). Несколько теней — список; тень с нестандартными частями → проверять покомпонентно.
- **`transform` (доп. поля помимо move/scale/rotate/skew):** `transform-origin` (Origin), `perspective` (Distance) + `perspective` у детей (Children perspective), `backface-visibility` (Backface visible/hidden).

### Чего у слоя НЕТ (это и теряется/ломается)

- **Шортхендов не существует — только longhand.** Нет полей `margin`, `padding`, `border`, `background`, `font`, `flex`, `overflow`, `gap`, `inset`, `transition`, `grid`, `place-*`. Любой шортхенд из источника обязательно раскладывать на точные longhand-ключи выше (дефекты 2.4, 2.5).
- **Чёрный список (`cssBlackList`, молча не сохраняются):** `border-image-*`, `background-position-x/y`, `background-repeat-x/y`, `text-wrap`, `white-space-collapse`.
- **Нет в enum вообще:** `box-sizing`, кастомные свойства `--*` (и `var(--*)` без фолбэка), любые псевдоклассы/псевдоэлементы и `@keyframes` — у слоя физически нет поля, куда их положить.

<callout icon="✅" color="green_bg">
	Про псевдоклассы — ваша логика подтверждается схемой: модель стилей слоя плоская («свойство→значение» для одного состояния), измерения состояний (`:hover`, `:focus`) и at-правил в ней нет. Поэтому единственный путь — перенос в Embed-слой (`<style>`), что вы и делаете вручную. Это не «потеря», а кандидат на автоматизацию (дефект 2.1).
</callout>

### Кастомные свойства (`isCustom`) — куда писать ненативное и чем ограничен выбор

Когда стиль не ложится в нативное поле, у TapTop есть два механизма «custom», и оба ограничены списками:

1. **Флаг `isCustom: true` на значении нативного свойства.** Позволяет записать произвольную строку (например `width: calc(100% - 20px)`, `color: var(--brand)`) вместо разобранного числа/единицы. Само свойство при этом обязано быть из enum (`m.Fi`) — кастомным становится только значение.
2. **Custom-свойства (`cssAllCustomParams`, 361 свойство).** Это не «горстка шортхендов», а почти весь стандартный CSS: `box-sizing`, `aspect-ratio`, `clip-path`, `mask-*`, `scroll-*`, логические `*-block`/`*-inline`, `grid-*`, `transform`/`transition`/`translate`/`rotate`/`scale`, `filter`/`backdrop-filter` и т.д. Любое из них можно записать целиком как custom-свойство (сырая CSS-строка, `isCustom:true`) и добавить имя в массив `custom` селектора. Полный перечень — в Шаге 1 патча.

<callout icon="⛔" color="orange_bg">
	Маршрут значения по факту такой: (1) свойство нативное (`m.Fi`) и значение разбирается → структурой; (2) нативное, но значение неразложимо (`calc/var`/край) → то же свойство с `isCustom:true`; (3) свойство есть в `cssAllCustomParams` (361), но не нативное → custom-свойство (сырая строка, `isCustom:true` + имя в массиве `custom` селектора); (4) в Embed только то, чего нет НИ в нативных, НИ в этих 361 (узкий набор: `--переменные`, нестандартные свойства) плюс псевдоклассы/`@`-правила. Отдельно: `cssBlackList` (`border-image-*`, `background-position-x/y`, `background-repeat-x/y`, `text-wrap`, `white-space-collapse`) не сохраняется вовсе; `unreliableProperties` (`text-decoration`, `background-position`, `white-space`) нестабильны; `autoProperties` (`width`, `height`, `top/right/bottom/left`) принимают `auto`.
</callout>

**Следствие для конвертора** — маршрут значения должен быть таким:

1. свойство нативное и значение разбирается → longhand + `isCustom:false`;
2. свойство нативное, но значение неразложимо (`calc/var`/многослойное) → то же свойство + `isCustom:true`;
3. свойство есть в `cssAllCustomParams` (361), но не нативное (напр. `box-sizing`, `aspect-ratio`, `clip-path`, `grid`, логические `*-block`/`*-inline`) → custom-свойство (`isCustom:true` + имя в массиве `custom` селектора);
4. свойство вне нативных И вне этих 361 (`--vars`, нестандартные свойства, `animation`), плюс псевдо/`@`-правила → Embed.

### Формат значения в clipboard (точная структура, по бандлу)

Слой хранит каждое свойство не строкой, а **объектом значения** (классы на базе общего `f`, сериализация — schema-based, serializr-подобная). Сериализуемые поля базового класса:

- `name` — имя CSS-свойства;
- `value` — значение (для простых свойств это и есть итоговая CSS-строка, `serializeValue` возвращает `this.value`);
- `isCustom` — булев флаг (по умолчанию `false`);
- `available` — булев флаг «значение распознано пикером» (по умолчанию `true`).

Разновидности классов значения:

1. **Простое значение** (`color`, `display`, `cursor`…): `{ name, value, isCustom:false, available:true }`.
2. **Размерное значение**: дополнительно `number` + `unit`; геттер `length` = число+единица, разбор строки регуляркой `^(-?…)([a-z]+|%)$`. Не распарсилось — number/unit пустые.
3. **Многослойные** (`box-shadow`, `transition`, `filter`, `backdrop-filter`, `transform`): хранят `items: [...]`, сериализация = `items.map(serializeStr).join(" " | ", ")`.
4. **Custom-значение** (отдельный класс, ключ `d.ux`): `{ name: <propertyName>, value: String(raw), isCustom:true }` — кладёт **сырую CSS-строку как есть**, без разбора на число/единицу.
5. **Цвет** хранится строкой в `value`, но нормализованной: классы `color`, `background-color`, `border-*-color`, `outline-color`, `-webkit-text-stroke-color` прогоняют любой ввод через `toRgbString()` и сохраняют `rgb()/rgba()` (+ флаг `disabled` для прозрачного). У `box-shadow` цвет — отдельное подполе `color`, а смещения — `number`+`unit`.

<callout icon="🔑" color="red_bg">
	«Кастомность» фиксируется в **двух местах** одновременно. (1) На объекте значения: `isCustom:true`. (2) На уровне JSON селектора есть массив `custom: [<имена свойств>]`; при вставке (`unserialize`) свойство, чьё имя есть в `custom`, пересобирается через custom-класс (сырая строка). Конвертор обязан и ставить `isCustom:true`, и добавлять имя свойства в `custom`-массив селектора — иначе при paste значение распарсится как обычное и «слетит».
</callout>

Итоговая форма для генерации (на одно свойство):

```

// обычное

{ name: "width", value: "320px", isCustom: false, available: true }

// custom (calc/var/шортхенд из [m.CV](http://m.CV))

{ name: "width", value: "calc(100% - 20px)", isCustom: true, available: true }

// + в селекторе: custom: ["width", ...]

```jsx

## 🏗 Структура HTML → дерево слоёв TapTop

Конвертор работает не только со стилями, но и со **структурой**: HTML-дерево превращается в дерево слоёв. TapTop обходит DOM по узлам (`nodeType`: `TEXT_NODE` / `ELEMENT_NODE`) и разделяет inline/block по вычисленному `display`. Маппинг тегов задают `CONSTRUCTOR_CONTAINER_TAG_NAMES` и `CONSTRUCTOR_TEXT_TAG_NAMES`, сборка — `buildConstructorLayer` / `buildConstructorClipboardData`, fallback — `localConstructorEmbedCodeFromCode`.

### Каталог элементов TapTop (правая панель)

Тип элемента выбирается из правой панели, а не только сменой тега. Группы:

- **Основные:** `Section`, `Container`, `Div Block` — три разных примитива (не один div). `Container` — центрирующая обёртка с max-width, `Section` — секция, `Div Block` — обычный блок.
- **Типографика:** `Text` (один текстовый блок), `Rich Text` (многоблочный форматированный текст), `Text Link` (инлайновая ссылка `a`).
- **Виджеты:** `Link Block`, `Button`, `List`, `Block List`, `Accordion`, `Tabs`, `Embed`, `Map`, `Search`, `Payment`, `Image`, `Slider`, `Pop-up`, `Menu`, `Video`, `Up Button`, `Collection`, `SVG Icon` (+ кастомные GitHub-виджеты хелпера; `Badge` — отключён).
- **Формы:** `Form`, `Input`, `Textarea`, `Checkbox`, `Radio`, `Select`, `Upload File`.

### Смена тега — ТОЛЬКО у `Div Block`

В настройках слоя `Div Block` тег меняется из закрытого списка: `Div`, `Header`, `Footer`, `Nav`, `Main`, `Section`, `Article`, `Aside`, `Address`, `Figure` (подтверждено в бандле). Другие элементы (`Section` / `Container` / виджеты) свой тег не меняют. Теги вне этого списка (`figcaption`, `details`, `summary`, `dialog`, `fieldset`, кастомные) тегом задать нельзя → либо `Div Block` (с потерей семантики), либо Embed.

### Соответствие HTML → элемент/слой

<callout icon="🎯" color="yellow_bg">
	**Это целевая карта (что умеет TapTop), а НЕ то, что делает конвертор.** Сборщик эмитит только 7 типов слоёв — `text`, `section`, `link`, `image`, `svg`, `embed`, `div` (см. `normalizeConstructorLayerType`). Отдельных типов `List` / `Form` / `Input` / `Table` / `Video` у конвертора нет — они схлопываются в `div` / `section` (детали в подразделе «HTML: что реально теряется при конвертации» ниже).
</callout>

- **Блок / контейнер**: `div` → `Div Block`; семантические `header` / `footer` / `nav` / `main` / `section` / `article` / `aside` / `address` / `figure` → `Div Block` с соответствующим тегом. Неизвестный блочный тег → `div`.
- **Текст**: `p`, `h1`–`h6`, `blockquote`, `span` и текстовые узлы → `Text` или `Rich Text` (если внутри разнородный форматированный контент). Заголовки — через enum (`X7.H1`, `X7.BLOCKQUOTE`).
- **Ссылка `a`** (НЕ тег, а отдельный элемент): инлайновая → `Text Link`; блочная (оборачивает блок/картинку) → `Link Block`. Кнопка-ссылка → виджет `Button`.
- **Кнопка**: `button`, `a.button`, `role="button"` → виджет `Button`.
- **Списки**: `ul` / `ol` / `li` → `List` / `Block List`.
- **Медиа**: `img` → `Image`; `video` → `Video`; `svg`-иконка → `SVG Icon`, сложный/произвольный `svg` → Embed; `iframe` → Embed (или `Map` для карт).
- **Формы**: `form` → `Form`, `input` → `Input`, `textarea` → `Textarea`, `select` → `Select`, `input[type=checkbox]` → `Checkbox`, `input[type=radio]` → `Radio`, `input[type=file]` → `Upload File`.
- **Embed (fallback)**: `table`, `canvas`, `script`, `dialog`, `details` / `summary`, `picture` / `source`, `audio` и любые без нативного элемента → код целиком в Embed через `localConstructorEmbedCodeFromCode`.

### Ключевые правила и подводные камни

1. **Inline ≠ отдельный слой.** Inline-элементы (`span`, `a`, `strong`, `em`, `b`, `i`, …) внутри текста должны вливаться в **rich text** текстового слоя, а не порождать дочерние слои. Иначе блок `div` с вложенным `span` и текстом раздувается в лишние слои и теряет цельность абзаца. Разделение идёт по `display: inline` vs block.
2. **Смешанный контент** (текст + дочерние элементы вперемежку) надо корректно разбивать: текстовые узлы → текстовый слой, блочные дети → отдельные слои.
3. **Пустые / whitespace текстовые узлы** не должны превращаться в пустые текстовые слои — отбрасывать.
4. **SVG и таблицы — только Embed.** Нет нативных слоёв для произвольного `svg` / `table`; попытка собрать их структурно потеряет содержимое. Икон-система TapTop — отдельный механизм, не для произвольного SVG.
5. **Void-элементы**: `img` / `br` / `hr` / `input` не имеют детей; `br` / `hr` внутри текста → перенос / разделитель, а не слой.
6. **`tagName` сохранять**, если он из допустимого набора — иначе семантика (`header` / `nav` / `footer`) теряется и всё схлопывается в `div`.
7. **Уникальные классы**: имена классов прогоняются через `CONSTRUCTOR_UNIQUE_CLASS_RE` и переиспользование удалённых классов (`reuse-deleted-class-names.js`) — следить, чтобы конвертор не плодил дубли классов на повторяющихся блоках.

<callout icon="✅" color="green_bg">
	Сверено по реальному исходнику `gemini-panel.js` (загружен из репозитория GoodMade/tthelper). Маппинг тегов подтверждён: `CONSTRUCTOR_CONTAINER_TAG_NAMES` содержит ровно 10 контейнерных тегов — `address`, `article`, `aside`, `div`, `figure`, `footer`, `header`, `main`, `nav`, `section` — это в точности список дропдауна тега у `Div Block`. `CONSTRUCTOR_TEXT_TAG_NAMES` = `h1`–`h6`, `p`, `span`, `small`, `strong`, `em`, `b`, `i`, `label` (важно: `blockquote` в наборе НЕТ — как текстовый тег он не распознаётся). `normalizeConstructorSourceTag` дополнительно принимает только `a` / `button` / `img` / `svg`; прочие теги дают пустой тег и теряют семантику (дефект 2.10).
</callout>

### HTML: что реально теряется при конвертации

Проверено по исходнику `gemini-panel.js` — и AI-путь (`buildConstructorLayer`), и локальный DOM-парс (`localConstructor*`). Каталог выше — целевая поверхность TapTop; фактическое поведение конвертора скромнее.

**1. Всего 7 типов слоёв.** `normalizeConstructorLayerType` / `constructorTypeFromClipboardTag` сводят любой элемент к `text`, `section`, `link`, `image`, `svg`, `embed`, `div`. Отдельных типов `List` / `Form` / `Input` / `Table` / `Video` в коде нет, поэтому в DOM-пути:

- `<ul>` / `<ol>` / `<li>` → `div` (виджет List не создаётся, маркеры и семантика списка теряются);
- `<form>` / `<input>` / `<textarea>` / `<select>` / чекбоксы / радио → `div` / `section` — **поля становятся пустыми div, форма нефункциональна**;
- `<table>` / `<tr>` / `<td>` → `div` (структура таблицы расплющивается, даже без авто-Embed);
- `<video>` / `<audio>` / `<iframe>` → `div` (медиа теряется, автоматического Embed нет);
- `<button>` → `link` (теряются `type=submit/reset` и связь с формой).

**2. Атрибуты — частично.** `localConstructorAttributes` / `layoutAttrsFromTag` копируют произвольные атрибуты (`id`, `data-*`, `aria-*`, `role`, `name`, `type`, `target`, `rel`…) в `tag.data` (`dataSource:"from_parent"`), с обрезкой ~400 символов; `on*`-обработчики, `class` и `style` отбрасываются. Но поскольку это не настоящие виджеты Input/Button, атрибуты-`data` функционально могут не применяться (`name` / `required` / `for`, `id`-якоря). Инлайн `style=""` парсится (`parseStyleDeclarations`), но тем же багливым парсером (дефект 2.3).

**3. Картинки.** Берётся только `<img src>` (или `data-src`) плюс `alt` / `title` / `width` / `height`. **`srcset` / `sizes` / `<picture><source>` игнорируются** — адаптивные изображения теряются.

**4. Текст и инлайн.** Для текстовых тегов сохраняется `innerHTML`, т.е. инлайн-форматирование (`<b>` / `<i>` / вложенные `<a>`) **выживает** как HTML — это плюс. Но: отдельный `<br>` между блоками **дропается** (`return null`); `<blockquote>` / `<pre>` / `<code>` / `<hr>` не входят в текстовый набор → `div` (теряют смысл; `<pre>` теряет значимые пробелы, тем более что текст ещё и `.trim()`-ается); `<hr>` не становится разделителем.

**5. Уровень документа (`<head>`).** `<title>`, `<meta>`, favicon, подключение шрифтов (`<link>` на Google Fonts / `@font-face`) не переносятся — шрифты в проекте не регистрируются. В Embed уходят только `<link rel=stylesheet>` и `<script>`; `<style>` парсится как CSS.

**6. Прочее.** Комментарии `<!-- -->`, `<template>` / `<slot>`, web-components, `<noscript>` не обрабатываются; действуют лимиты усечения (≈400/800/1200/2200 символов) и обхода (первые ~12 узлов в превью, `maxVisits ~220`) — крупные документы режутся.

### Улучшения по структуре HTML

Решения для потерь из подраздела выше. Принцип тот же, что и для стилей: что выразимо нативным виджетом — мапить, остальное в Embed целым фрагментом, но НИКОГДА не терять молча.

1. **Списки `ul` / `ol` / `li` → виджет `List` / `Block List`.** Распознавать `ul`/`ol` как контейнер списка, `li` — как элементы (вместо `div`); сохранять `list-style`, `start`, `type`; вложенные списки — рекурсивно. Если виджет List в формате вставки недоступен — заворачивать список целиком в Embed, а не плющить в `div`.
2. **Формы → виджеты `Form` / `Input` / ...** Маппить `form` → `Form`, `input[type]` → `Input` / `Checkbox` / `Radio` / `Upload File`, `textarea` → `Textarea`, `select` → `Select`; переносить атрибуты (`name`, `type`, `placeholder`, `required`, `value`, `for`) в свойства виджета. Нераспознанные поля — Embed формы целиком (чтобы сохранить работоспособность), а не пустые `div`.
3. **Таблицы `<table>` → Embed целиком.** Не разбирать `tr`/`td` в `div` (структура и семантика теряются) — заворачивать таблицу одним фрагментом в Embed (как уже делается для произвольного SVG).
4. **Медиа `<video>` / `<audio>` / `<iframe>` → виджет или Embed.** `video` → виджет `Video`, `iframe` карт → `Map`, остальные `iframe` / `audio` → Embed с сохранением `src` / `controls` / `poster`.
5. **`<br>` / `<hr>` / `<pre>`.** `<br>` внутри текста — сохранять как перенос в rich text (а не `return null`); `<hr>` → разделитель / `Div Block` с границей; `<pre>` / `<code>` — сохранять как текст с `white-space: pre` (моноширинный) или в Embed, не применяя `.trim()` и не теряя значимые пробелы.
6. **`<picture>` / `srcset`.** Брать дефолтный/наибольший источник из `srcset` (или `<source>`) в `src` виджета `Image`; при необходимости адаптива — переносить `srcset` атрибутом либо весь `<picture>` в Embed.
7. **`<head>`: шрифты и мета.** Подключения шрифтов (`<link>` Google Fonts, `@font-face`) переносить в Embed-`<style>` / `<link>` на уровне страницы (чтобы текст рендерился нужным шрифтом); `<title>` / `<meta>` — игнорировать осознанно (вне модели слоёв).
8. **Диагностика.** В карточке результата показывать, что ушло в Embed и что схлопнулось в `div` (как и для стилей — см. п. 6 «Системных рекомендаций»), чтобы структурные потери были видимы пользователю.

## 2. Дефекты конвертации стилей

### 2.1. Псевдоклассы/псевдоэлементы и @keyframes молча теряются (Критично)

В `parseConstructorCssRules`:

```

const isRootPseudo = selectorText.toLowerCase() === ':root';

if (!isRootPseudo && (selectorText.includes(':') || selectorText.includes('::'))) return;

```jsx

Любой селектор с `:` (кроме `:root`) отбрасывается — `:hover`, `:focus`, `::before`, `::after`, `:nth-child` и т.д. При этом он **не перекладывается в Embed**. В локальном fallback-пути (`localConstructorEmbedCodeFromCode`) в Embed попадают только `<link rel=stylesheet>`, `<script>` и вкладка «Скрипт» — CSS из вкладки «Стили» с hover/псевдоэлементами/`@keyframes` пропадает целиком. То же с `@font-face`, `@supports`, `@import` (отсекаются как `@`-правила без переноса).

> Правило `embedCss` создаёт у пользователя ожидание, что hover-стили уедут в Embed, но локальный парсер его игнорирует.

**Улучшение:** при отбрасывании псевдо/at-правил собирать их в отдельный буфер и автоматически дописывать в `embedCode` компонента (обернув в `<style>`), а список селекторов брать из `embedCss`, а не из захардкоженной проверки `includes(':')`.

<callout icon="✅" color="green_bg">
	Подтверждено пользователем: пропуск псевдо задаётся в правилах и сам по себе не проблема — у слоя нет поля для назначения таких состояний (см. раздел со схемой). Цель улучшения — автоматизировать перенос псевдо/`:hover`/`@keyframes` в Embed-слой, который сейчас делается вручную, а не пытаться хранить их в стилях слоя.
</callout>

### 2.2. Правила вкладки «Правила» не применяются в сборщике (Критично)

`nativeStyles`, `styleGuards`, `embedCss`, `skipClasses` не используются детерминированно. Последствия:

- По факту схемы вывод уточняется: `transform`, `box-shadow`, `cursor`, `z-index`, `text-transform`, `white-space`, `text-decoration`, `filter`, `opacity` и подобные TapTop **поддерживает нативно** (см. раздел со схемой). Проблема не в «неподдержке», а в том, что: (а) `nativeStyles` из правил не читается сборщиком, поэтому нет единой точки классификации; (б) значения пишутся с `isCustom:false`, хотя для неразложимых значений нужен `isCustom:true`; (в) реально отсутствующие у слоя вещи (`box-sizing`, `--переменные`, шортхенды `transition`/`background`/`font`) надо раскрывать в longhand или уводить в Embed.
- `skipClasses` (container/row/col) не отсекаются на уровне сборщика — плодятся лишние классы.
- `styleGuards` ограничивают только модель.

**Улучшение:** ввести единый «нормализатор стилей», который на основе `nativeStyles` разделяет свойства на: (а) нативные → в стили слоя, (б) неподдерживаемые → в Embed-CSS на уникальный селектор слоя, (в) запрещённые `styleGuards` → отбрасываются. Тогда поведение совпадёт с обещаниями UI.

### 2.3. `parseStyleDeclarations` ломает значения с `;` и `:` внутри (Критично)

```

String(value || '').split(';').forEach((part) => {

const index = part.indexOf(':');

...

});

```jsx

Разбиение по `;` без учёта скобок/кавычек разрушает значения, содержащие `;`:

- `background-image: url(data:image/svg+xml;base64,...)` — `;` внутри data-URI рвёт значение.
- `background: url("a;b.png")`, многослойные градиенты/тени с функциями.

При этом в других местах кода уже есть корректный `splitCssFunctionAwareList` (учитывает скобки и кавычки) — но в основном парсере деклараций он не используется.

**Улучшение:** заменить `split(';')` на функцию, осведомлённую о скобках/кавычках (переиспользовать `splitCssFunctionAwareList`), и резать пару имя/значение по первому `:` вне скобок.

### 2.4. Неполное раскрытие шортхендов (Критично)

`normalizeConstructorStyleDeclaration` раскрывает только `margin`/`padding`, `border`, `border-(width|style|color)`, `border-radius` и `gap`. Не раскрываются распространённые шортхенды:

<table header-row="true">
<tr><td>Шортхенд</td><td>Что происходит сейчас</td><td>Последствие</td></tr>
<tr><td>`background`</td><td>пишется как одно свойство `background`</td><td>TapTop оперирует `background-color/image/size/...`; значение теряется</td></tr>
<tr><td>`font`</td><td>не раскрывается</td><td>теряются `font-size/weight/line-height/family`</td></tr>
<tr><td>`flex: 1`</td><td>пишется как `flex`</td><td>нет `flex-grow/shrink/basis` в нативных — игнор</td></tr>
<tr><td>`overflow: hidden`</td><td>остаётся `overflow`</td><td>в нативных только `overflow-x/y` — не применяется</td></tr>
<tr><td>`inset`</td><td>не раскрывается</td><td>теряются `top/right/bottom/left`</td></tr>
<tr><td>`transition`</td><td>как есть (строка)</td><td>хранится структурой `items[]` — редактор «Переход» пуст; `animation`/`grid`-шаблоны → Embed (см. раздел про `transform`/`transition`)</td></tr>
</table>

**Улучшение:** добавить раскрытие `background`, `font`, `flex`, `overflow`, `inset`, `place-*` в longhand; то, что не раскладывается на нативные — отправлять в Embed (см. 2.2).

### 2.5. `min-width:0` / `height:auto` отбрасываются (Высокая)

```

function shouldDropConstructorStyleValue(name, value) {

if (name === 'height' && value === 'auto') return true;

if (!CONSTRUCTOR_ZERO_SIZE_GUARD_PROPERTIES.has(name)) return false; // height, min-height, min-width

return isConstructorZeroCssValue(value);

}

```jsx

- `min-width: 0` — критичный приём для flex/grid (чтобы дочерний элемент мог сжиматься и работал `text-overflow`). Его молчаливое удаление ломает раскладку и переполнение текстом.
- `height: auto` часто ставят осознанно, чтобы переопределить унаследованную фиксированную высоту; удаление теряет намерение.

**Улучшение:** не отбрасывать `min-width:0`/`min-height:0`, когда значение явно присутствует в источнике (guard оставить только для значений, придуманных моделью, как и задумано в `styleGuards … unless-source`).

### 2.5а. `width:0px` сохраняется из-за асимметрии zero-guard'а (Критическая)

Самая частая причина «схлопывания» по ширине. Сверено по реальному коду конвертора `gemini-panel.js`:

```

const CONSTRUCTOR_ZERO_SIZE_GUARD_PROPERTIES = new Set(['height','min-height','min-width']);

function shouldDropConstructorStyleValue(name, value) {

if (name === 'height' && value === 'auto') return true;

if (!CONSTRUCTOR_ZERO_SIZE_GUARD_PROPERTIES.has(name)) return false;

return isConstructorZeroCssValue(value); // 0, 0px, 0%, 0rem...

}

```jsx

Guard отбрасывает нулевые значения **только** у `height`, `min-height`, `min-width`, а `width`, `max-width`, `max-height` в наборе **отсутствуют** → их `0` проходит насквозь и пишется как `0px`. Уже рантайм TapTop (`parseFloat(value) || 0` в бандле) превращает это в реальные 0px, и слой схлопывается по ширине. Именно из-за асимметрии guard'а высота обычно выживает, а ширина застревает на `0px`. Важно (поправка к прежней версии): сам `normalizeConstructorLengthValue` в конверторе значение в `0` НЕ превращает — он лишь дописывает `px` к голому числу, а `%` / `auto` / `calc()` / `var()` / `fit-content` пропускает как есть. То есть коэрсиция `parseFloat||0` живёт в рантайме редактора, а не в конверторе. Источник самого `width:0` — чаще всего `getComputedStyle()` скрытого/не разложенного элемента (`display:none`), который конвертор честно копирует.

**Симптомы (что застревает на `0px`):**
- `width: 0` / `max-width: 0` / `max-height: 0` из источника — guard их не ловит, доезжают как `0px` и рендерятся нулём.
- Пустое значение после бага парсинга `;` / `:` (дефект 2.3) → в рантайме `parseFloat||0` = `0`.
- Интринсик-ключевые слова (`fit-content` / `max-content` / `min-content` / `stretch`) и `calc()` / `var()` сами по себе в конверторе нулём НЕ становятся, но в поле размера редактора не парсятся и там схлопываются в `0` (это уже дефект 2.7 — их нужно уводить в custom/Embed).

**Улучшение:**
- добавить `width`, `max-width`, `max-height` в `CONSTRUCTOR_ZERO_SIZE_GUARD_PROPERTIES` (или отдельным правилом отбрасывать подозрительный `width:0` / `max-*:0` из computed-стилей);
- не читать размеры с элементов в состоянии `display:none` / нулевого лейаута (помечать такие значения ненадёжными);
- значения `calc()` / `var()` / интринсик-ключевые слова не пропускать в нативное поле (иначе `parseFloat→0`), а писать в custom property или Embed (дефект 2.7);
- сопутствующе: в регулярках `normalizeConstructorLengthValue` (`/^-?\d+(?:.\d+)?$/`) и `isConstructorZeroCssValue` неэкранированная точка (`.` вместо `\.`) — экранировать;
- никогда не подставлять `0` / `0px` как fallback — лучше опустить объявление.

### 2.6. Медиазапросы: только 3 max-width брейкпоинта, min-width и диапазоны теряются (Высокая)

`normalizeConstructorMedia` отображает `max-width ≤480/768/992` на брейкпоинты TapTop `479/767/991`. Но:

- `@media (min-width: 1200px)` и любые desktop-up запросы возвращаются как есть → ключ селектора с непонятным TapTop media → стили игнорируются.
- Диапазон `(min-width:768px) and (max-width:991px)` — берётся только `max-width`, нижняя граница теряется → стиль применяется ко всем ≤991.
- Промежуточные брейкпоинты (`1024px`, `1200px`) не попадают ни в одно условие → возвращаются «как есть» → игнор.

**Улучшение:** явно сообщать о неподдерживаемых (min-width / диапазонных) медиа — либо переносить такие правила в Embed-CSS, либо предупреждать пользователя, а не отбрасывать тихо.

### 2.7. `calc()` / `var()` и кастомные свойства помечаются как `isCustom:false` (Высокая)

`makeCssRule` всегда ставит `isCustom:false`, а число/единицу извлекает только из строгого `^(-?\d+...)(px|%|...)$`. Значит:

- `width: calc(100% - 20px)` и `color: var(--brand)` пишутся как обычные значения без разбора — TapTop ожидает для таких значений custom-режим (по самому же правилу «custom допускается только для calc/var»). Высокий риск, что такие стили не применяются.
- Определения `:root { --brand: #fff }` нельзя сохранить как переменную слоя → все ссылки `var(--brand)` ниже ломаются.

**Улучшение:** определять `calc(`/`var(`/`--` и выставлять `isCustom:true` (или маршрутизировать в Embed). Переменные из `:root` лучше целиком оставлять в Embed-`<style>`.

### 2.8. Конфликт «класс vs уникальный селектор слоя» (Высокая)

Инлайновые `styles` слоя уходят в `designSelectors` (`.x--u-id`), а CSS класса — в `mainSelectors` (`.class`). Если модель отдаёт и `styles`, и сохраняет класс (а её к этому и подталкивают), одно и то же свойство задаётся дважды; уникальный селектор обычно перекрывает класс. Итог визуально расходится с источником, где правило задавал класс.

**Улучшение:** при наличии исходного CSS для класса не дублировать те же свойства в `styles` слоя (дедуп на уровне сборщика, а не только просьбой к модели).

### 2.9. Контекстные селекторы (`.root .child`) расплющиваются — область действия и каскад теряются (Высокая)

В TapTop у слоя нет «контекстных» (предок→потомок) селекторов: модель стилей — это класс / уникальный селектор + источники-состояния (`По умолчанию` / `:hover` / `:active` / `:focus`). Состояния — это варианты ОДНОГО селектора, а не связь между двумя элементами, поэтому правило `.root .child { ... }` хранить «как есть» нельзя. Сверено по реальному коду — сборщик его расплющивает, причём **двумя разными путями** в зависимости от источника:

- **A. Сырой CSS (вкладка «Стили» / блоки `<style>`)** — `addConstructorSourceCssRuleStyles`: берётся **последний** класс цепочки (`.child`) и стили пишутся в него **глобально** (`mainSelectors`, `.child`). Единственная проверка — `constructorHasSourceClass` (класс `child` существует где-то в дереве); предок `.root` **не проверяется вовсе** → стиль протекает на ВСЕ `.child`. Исключение — селектор, кончающийся **тегом** (`.root span`): он применяется к уникальному селектору каждого совпавшего тега (`designSelectors` + `tagHasAncestorClasses`), т.е. область действия сохраняется.
- **B. Структурные `classStyles` от модели** — `addConstructorClassStyles`: строится синтетический класс `root__child` (`classParts.join('__')`) и навешивается на слои с классом `child` под предком `root` (`tagHasAncestorClassSequence`). Но в `applyConstructorCompoundClasses` есть фолбэк: если по цепочке предков не совпал НИ один слой — класс вешается на **все** `.child` → та же утечка области действия.

Прочие дефекты обоих путей:

- **Комбинаторы `>`, `+`, `~` не различаются.** `normalizeConstructorCssSelectorText` срезает пробелы вокруг `>+~`, а `constructorSelectorClassTokens` собирает классы просто по порядку — поэтому `.a .b`, `.a>.b`, `.a+.b`, `.a~.b` сводятся к одной цепочке `[a, b]`. Для соседних `+` / `~` это попросту неверно (это не предок→потомок).
- **Компаунд `.btn.primary` (один элемент, два класса) неотличим от `.btn .primary`.** Токены классов — `[btn, primary]`, и правило трактуется как «предок→потомок», хотя это один элемент с двумя классами → мис-таргетинг.
- **Конфликт `.child` vs `.root .child`** в пути A схлопывается в один и тот же глобальный `.child` → «последний победил»; контекстное различие (обычный `.child` — одно, под `.root` — другое) выразить нельзя, одно из правил молча теряется.

**Улучшение:**
- для контекстных правил, однозначно сопоставимых конкретным потомкам, создавать **уникальный класс / селектор на самих совпавших дочерних слоях** и писать стили туда (сохраняя область действия), а не в глобальный `.child`;
- различать `>` / `+` / `~` и не трактовать соседние комбинаторы как предков;
- компаунд `.a.b` (без пробела) определять как один элемент с несколькими классами, а не как цепочку предков;
- неразрешимые контекстные / соседние селекторы уводить в Embed (`<style>`), а не молча в глобальный класс;
- убрать фолбэк «навесить на все `.child`», когда цепочка предков не совпала (готовая реализация — Шаг 10 патча).

### 2.10. Селекторы по тегам — только из белого списка (Средняя)

`normalizeConstructorSourceTag` распознаёт ограниченный набор (текстовые теги, контейнеры, `a/button/img/svg`). CSS-правила для `ul/ol/li/table/input/select/textarea` и пр. дают пустой селектор → отбрасываются. Стили списков, форм и таблиц из исходного CSS теряются.

**Улучшение:** расширить распознавание тегов либо переносить стили нераспознанных тегов на соответствующие слои по факту наличия таких элементов.

### 2.11. `!important` не обрабатывается (Средняя)

Флаг `!important` остаётся внутри строки значения (`color: red !important` → значение `red !important`), для length-свойств ломает разбор числа/единицы и, скорее всего, не принимается слоем TapTop.

**Улучшение:** вырезать `!important`, при необходимости такие правила класть в Embed.

### 2.12. SVG: мультиколор схлопывается в currentColor (Средняя)

`normalizeConstructorSvgMarkup` + `normalizeConstructorSvgIconStyles` заменяют все `fill`/`stroke` на `currentColor` и поднимают первый найденный цвет в `color`. Для многоцветных SVG это теряет исходные цвета, а `extractConstructorSvgIconColor` берёт первый stroke/fill — может выбрать «не тот» цвет.

**Улучшение:** не приводить к `currentColor`, если в SVG больше одного уникального цвета; сохранять исходные `fill`/`stroke`.

### 2.13. Формат цвета: TapTop ждёт rgb/rgba-строку (Высокая)

Выяснено по бандлу: все цветовые свойства (`color`, `background-color`, `border-(top|right|bottom|left)-color`, `outline-color`, `-webkit-text-stroke-color`) хранят цвет **строкой** в поле `value`, но прогоняют любой ввод через цвет-библиотеку и сохраняют результат `toRgbString()` — то есть `rgb(...)`/`rgba(...)`. Дополнительно есть флаг `disabled` (состояние «прозрачный»; `value` тогда = `transparent`). У `box-shadow` цвет — отдельное подполе `color` внутри объекта тени, а смещения хранятся как `number`+`unit`.

Следствие: если конвертор пишет `#fff`, `red`, именованные цвета или `hsl()/hwb()`, значение может и примениться, но UI-пикер его не подхватит (поле выглядит пустым/сбрасывается).

**Улучшение:** нормализовать все цвета в `rgb()/rgba()` перед записью (повторить логику `toRgbString()`); `transparent`/`none` отображать во флаг `disabled`, а не в произвольную строку.

## 3. Сводка по приоритетам

<table header-row="true">
<tr><td>#</td><td>Дефект</td><td>Приоритет</td><td>Тип потери</td></tr>
<tr><td>2.1</td><td>Псевдо/keyframes теряются и не идут в Embed</td><td>Критично</td><td>Полная потеря стилей</td></tr>
<tr><td>2.2</td><td>Правила вкладки не применяются в сборщике</td><td>Критично</td><td>Расхождение поведения</td></tr>
<tr><td>2.3</td><td>`split(';')` ломает url()/data-URI/функции</td><td>Критично</td><td>Порча значений</td></tr>
<tr><td>2.4</td><td>Не раскрыты background/font/flex/overflow/inset</td><td>Критично</td><td>Потеря свойств</td></tr>
<tr><td>2.5</td><td>`min-width:0`/`height:auto` отбрасываются</td><td>Высокая</td><td>Сломанная раскладка</td></tr>
<tr><td>2.6</td><td>min-width/диапазонные медиа теряются</td><td>Высокая</td><td>Адаптив</td></tr>
<tr><td>2.7</td><td>calc()/var()/--vars как isCustom:false</td><td>Высокая</td><td>Стиль не применяется</td></tr>
<tr><td>2.8</td><td>Конфликт класс vs уникальный селектор</td><td>Высокая</td><td>Визуальное расхождение</td></tr>
<tr><td>2.9</td><td>Контекстный .root .child → глобальный класс</td><td>Высокая</td><td>Утечка области/каскад</td></tr>
<tr><td>2.10</td><td>Теги вне белого списка</td><td>Средняя</td><td>Потеря стилей списков/форм</td></tr>
<tr><td>2.11</td><td>`!important` не обрабатывается</td><td>Средняя</td><td>Невалидное значение</td></tr>
<tr><td>2.12</td><td>SVG мультиколор → currentColor</td><td>Средняя</td><td>Потеря цветов</td></tr>
<tr><td>2.13</td><td>Цвет не приведён к rgb/rgba</td><td>Высокая</td><td>Не подхват UI-пикером</td></tr>
</table>

## 4. Системные рекомендации

1. **Единый нормализатор стилей.** Один проход: раскрытие шортхендов → классификация по `nativeStyles` → нативные в слой, остальное в Embed, запрещённые `styleGuards` (с учётом `unless-source`) отбрасываются. Сделать правила вкладки реально работающими в сборщике, а не только в промпте. Классификацию строить по **реальному enum нативных свойств TapTop** (раздел со схемой): шортхенды раскрывать строго в longhand-ключи, неразложимые значения помечать `isCustom: true`, свойства из `cssBlackList` и `--переменные` уводить в Embed.
2. **Безопасный CSS-парсер.** Разбор деклараций и селекторов с учётом скобок/кавычек; полноценная обработка `@media` (включая min-width/диапазоны → предупреждение или Embed), `@keyframes`/`@font-face`/`@supports` → Embed.
3. **Автоперенос непереносимого в Embed.** Псевдоклассы/элементы, неподдерживаемые свойства, `var()`-токены из `:root` — собирать в `<style>` внутри Embed-слоя компонента, а не терять.
4. **Дедуп классов и уникальных селекторов** на уровне сборщика.
5. **Тест-набор (snapshot-тесты).** Набор пар «вход CSS → ожидаемый clipboard». Кейсы: shorthand-ы, data-URI в `url()`, `calc/var`, медиа min/max/диапазоны, `min-width:0`, hover/`::before`, мультиколор SVG, `.a.b` и `.a > .b`. Это закроет регрессии и даст объективную метрику «корректности конвертации».
6. **Диагностика для пользователя.** Показывать в карточке результата, какие правила ушли в Embed и какие отброшены (например, «5 hover-правил перенесено в Embed, 2 свойства не поддерживаются слоем») — снимет ощущение «молча криво сконвертировалось».

## 🔄 `transform` и `transition` — структурные редакторы (`items[]`), а не строка

Отдельный важный случай (подтверждён скриншотами панели «Трансформация»). Эти два свойства хранятся не CSS-строкой, а объектом с массивом `items[]`.

**`transform`** — каждый элемент: `{ type, x, xUnit, y, yUnit, z, zUnit, disabled }`.

- `type` ∈ `move`, `scale`, `rotate`, `skew` (+ `perspective`) — это вкладки Сдвиг/Масштаб/Поворот/Скос в UI.
- Сериализация элемента всегда в 3D-форме: `move` → `translate3D(x, y, z)`; `scale` → `scale3d(x, y, z)` (без единиц); `rotate` → `rotateX(x) rotateY(y) rotateZ(z)`; `skew` → `skew(x, y)`; `perspective` → `perspective(x)`.
- Единицы: `move` — `px/%/em/rem/vw/vh`; `rotate` — `deg/rad/grad/turn`; `scale` — безразмерное.
- `disabled:true` → элемент оборачивается в `/* ... */` (выключен, но сохранён).
- **`matrix()` не поддерживается** — `fill` его пропускает (items остаются пустыми).
- `transform-origin`, `perspective`, `perspective-origin`, `backface-visibility` — **отдельные нативные свойства** (скриншот «Настройки трансформации»).

**`transition`** — каждый элемент: `{ transitionProperty, transitionDuration, transitionTimingFunction, transitionDelay, unit:"ms" }`.

- Длительность и задержка нормализуются в **миллисекунды-числа** (`0.3s` → `300`, `unit:"ms"`).
- Элементы с нулевой длительностью **и** задержкой отфильтровываются (т.е. `transition: none`/нулевые не сохраняются).

<callout icon="🔑" color="red_bg">
	Clipboard хранит сериализованный `items[]`, и при вставке TapTop восстанавливает редактор из `items`, а **не парсит строку**. Поэтому писать `transform`/`transition` плоской строкой с `isCustom:true` нельзя — редакторы «Трансформация»/«Переход» останутся пустыми (значение может отрендериться в CSS, но в UI пропадёт и слетит при следующем редактировании). Нужно разбирать шортхенды в `items[]` (Шаг 8). Это исправляет Шаг 4, где `transition` ошибочно предлагался как custom-строка. Приоритет: Высокая.
</callout>

### `transition`: свойство перехода — закрытый enum, смягчение — пресеты

Дополнение к структуре `items[]` выше (подтверждено скриншотом попапа «Переходы» и бандлом).

Выпадающий список «свойство» (`transitionProperty`) — **не произвольная строка**, а фиксированный набор (классы `TransitionProperty` / `TransitionPropertyItem`). Полный список (метка → CSS):

<table header-row="true">
<tr><td>Метка в UI</td><td>CSS-значение</td></tr>
<tr><td>Нет / Все свойства</td><td>`none` / `all`</td></tr>
<tr><td>Непрозрачность</td><td>`opacity`</td></tr>
<tr><td>Цвет / Цвет шрифта</td><td>`color`</td></tr>
<tr><td>Внешний / Внутренний отступ</td><td>`margin` / `padding`</td></tr>
<tr><td>Граница / Цвет границы / Ширина границы</td><td>`border` / `border-color` / `border-width`</td></tr>
<tr><td>Трансформация</td><td>`transform`</td></tr>
<tr><td>Цвет фона / Положение фонового изобр.</td><td>`background-color` / `background-position`</td></tr>
<tr><td>Тень текста / Тень элемента</td><td>`text-shadow` / `box-shadow`</td></tr>
<tr><td>Ширина / Высота</td><td>`width` / `height`</td></tr>
<tr><td>Закругленные углы</td><td>`border-radius`</td></tr>
<tr><td>Размер шрифта / Межстрочный интервал</td><td>`font-size` / `line-height`</td></tr>
<tr><td>Позиционирование: сверху/справа/снизу/слева</td><td>`top` / `right` / `bottom` / `left`</td></tr>
<tr><td>Внешний верх./ниж./лев./прав. отступ</td><td>`margin-top` / `-bottom` / `-left` / `-right`</td></tr>
<tr><td>Внутренний верх./ниж./лев./прав. отступ</td><td>`padding-top` / `-bottom` / `-left` / `-right`</td></tr>
</table>

Чего в списке НЕТ (нельзя анимировать через редактор): `filter`, `backdrop-filter`, `flex`/`gap`/`grid-*`, `font-weight`, `letter-spacing`, `background-size`, `clip-path`, `visibility`, отдельные углы `border-*-radius` и пр.

Смягчение (`transition-timing-function`) — тоже **пресеты**: `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out` + ~24 именованных `cubic-bezier(...)` (Базовое смягчение / Смягчение в начале / в конце). Произвольный `cubic-bezier()` или `steps()` из исходного CSS ввести нельзя.

**Краевые случаи для конвертора:**

- `transition: all .3s ease` → один item: property=`all`, dur=300ms, easing=`ease`. ОК.
- `transition-property` не из списка (напр. `filter`, `visibility`) → item невозможен → либо дропнуть этот item, либо весь `transition` в Embed/custom.
- Произвольная `cubic-bezier()` / `steps()` → подобрать ближайший пресет или в custom/Embed.
- Многосвойственный `transition: opacity .2s, transform .3s` → несколько items (по запятой), каждый со своим property — уже учтено моделью `items[]`.

## 🔲 `display: grid` — трековые списки это тоже `items[]`

Проверено по бандлу (подтверждается скриншотами «Авто-лейаут» / «Настройки сетки»).

- **`display`** — простое строковое значение (база `f`): `grid`, `flex`, `inline-flex`, `block`, `inline-block`, `none` и т.д. поддерживаются нативно. Панель «Авто-лейаут» — это UI над longhand-свойствами flex/grid, отдельного хранилища нет.
- **`grid-template-columns` и `grid-template-rows`** — **структурные `items[]`** (как `transform`). Каждый трек = `{ value: "<трек>" }` — строка `1fr` / `auto` / `100px` / `minmax(0, 1fr)`. Значение = `items.map(v => v.value).join(" ")`. На скриншоте «Настройки сетки»: Колонки (2) → `1fr`, `1fr`; Строки (2) → `auto`, `auto` — это ровно два item в каждом списке.
	- `repeat(n, x)` хранится **одним** item (целой строкой), т.е. в UI это один трек, а не `n`. При конвертации `repeat()` лучше разворачивать в `n` отдельных треков.
- **Простые строковые свойства** (enum/строка, база `f`): `grid-auto-flow` (Заполнение: `row`/`column`/`dense`), `justify-items` + `align-items` (на скрине `normal`/`normal`), `justify-content` + `align-content` (Распределение/Выравнивание), `justify-self` + `align-self`, `grid-row-start/end`, `grid-column-start/end`.
- **Чего у grid НЕТ (longhand-полей нет → теряется или в Embed):** `grid` и `grid-template` (шортхенды), `grid-template-areas`, `grid-auto-columns`, `grid-auto-rows`, а также `gap` (есть только `row-gap`/`column-gap`). Шортхенды `grid`/`grid-row`/`grid-column` доступны лишь как custom (`m.CV`); именованные area-раскладки и неявные треки — только в Embed.

<callout icon="🔑" color="red_bg">
	Тот же принцип, что и для `transform`/`transition`: `grid-template-columns`/`grid-template-rows` нельзя писать плоской строкой — нужен массив `items[]` из `{ value }` по треку, иначе редактор «Настройки сетки» окажется пустым. См. Шаг 9.
</callout>

## 🛠 Патч конвертора (конкретные правки)

Готовые к внедрению изменения для `gemini-panel.js`. Списки свойств сверены с бандлом TapTop (`m.Fi`, `m.CV`, `cssBlackList`). Вспомогательные функции `parseNumberUnit`, `pushToEmbed`, `expandFlexShorthand`, `expandFontShorthand`, `expandBackgroundShorthand`, `indexOfTopLevel` — новые, их нужно добавить (логика очевидна из контекста).

### Шаг 1. Эталонные наборы свойств (из бандла)

```

// Нативные longhand-свойства слоя TapTop ([m.Fi](http://m.Fi)), сверено по бандлу

const TAPTOP_NATIVE = new Set([

'margin-top','margin-bottom','margin-left','margin-right',

'padding-top','padding-bottom','padding-left','padding-right',

'width','min-width','max-width','height','min-height','max-height',

'display','overflow-x','overflow-y','position','top','right','bottom','left','z-index','float','clear',

'flex-direction','flex-wrap','justify-content','align-items','align-content',

'align-self','flex-grow','flex-shrink','flex-basis','order',

'grid-template-columns','grid-template-rows','grid-auto-flow','justify-items','justify-self',

'grid-row-start','grid-row-end','grid-column-start','grid-column-end','column-gap','row-gap',

'font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-indent',

'text-align','text-align-last','vertical-align','text-transform','text-decoration','text-decoration-line',

'text-shadow','color','-webkit-text-stroke-color','-webkit-text-stroke-width','white-space','overflow-wrap',

'background-color','background-image','background-size','background-position','background-repeat',

'background-attachment','background-clip','object-fit',

'border-top-width','border-right-width','border-bottom-width','border-left-width',

'border-top-style','border-right-style','border-bottom-style','border-left-style',

'border-top-color','border-right-color','border-bottom-color','border-left-color',

'border-top-left-radius','border-top-right-radius','border-bottom-left-radius','border-bottom-right-radius',

'outline-color','outline-style','outline-width','outline-offset',

'box-shadow','opacity','mix-blend-mode','filter','backdrop-filter',

'transform','transform-origin','perspective','perspective-origin','backface-visibility',

'cursor','pointer-events','visibility','appearance','content',

'transition-property','transition-duration','transition-delay','transition-timing-function',

]);

// Свойства, которые слой вообще не сохраняет (cssBlackList)

const TAPTOP_BLACKLIST = new Set([

'border-image-outset','border-image-repeat','border-image-slice','border-image-source','border-image-width',

'background-position-x','background-position-y','background-repeat-x','background-repeat-y',

'text-wrap','white-space-collapse',

]);

// Полный whitelist custom-свойств TapTop (cssAllCustomParams, 361) — сверено по бандлу.

// Любое из них можно записать как custom (isCustom:true, сырая строка) + имя в selector.custom[].

const TAPTOP_CUSTOM = new Set([

'all','appearance','background','border','bottom','clear','color','columns','contain','container',

'content','cursor','direction','display','filter','flex','float','gap','grid','height',

'hyphens','inset','isolation','left','margin','marker','mask','offset','opacity','order',

'orphans','outline','overflow','padding','perspective','position','quotes','resize','right','rotate',

'scale','top','transform','transition','translate','widows','width','zoom','accent-color','align-content',

'align-items','align-self','aspect-ratio','backdrop-filter','backface-visibility','background-attachment','background-clip','background-color','background-image','background-origin',

'background-position','background-repeat','background-size','block-size','border-block','border-bottom','border-collapse','border-color','border-image','border-inline',

'border-left','border-radius','border-right','border-spacing','border-style','border-top','border-width','box-shadow','box-sizing','break-after',

'break-before','break-inside','caption-side','caret-color','clip-path','color-scheme','column-count','column-fill','column-gap','column-rule',

'column-span','column-width','container-name','container-type','content-visibility','counter-set','empty-cells','field-sizing','flex-basis','flex-direction',

'flex-flow','flex-grow','flex-shrink','flex-wrap','font-kerning','font-palette','font-size','font-style','font-synthesis','font-variant',

'font-weight','grid-area','grid-column','grid-gap','grid-row','grid-template','hyphenate-character','image-orientation','image-rendering','image-resolution',

'initial-letter','inline-size','inset-block','inset-inline','justify-content','justify-items','justify-self','letter-spacing','line-break','line-height',

'margin-block','margin-bottom','margin-inline','margin-left','margin-right','margin-top','marker-end','marker-mid','marker-start','mask-clip',

'mask-composite','mask-image','mask-mode','mask-origin','mask-position','mask-repeat','mask-size','mask-type','max-height','max-width',

'min-height','min-width','object-position','offset-anchor','offset-distance','offset-path','offset-position','offset-rotate','outline-color','outline-offset',

'outline-style','outline-width','overflow-anchor','overflow-wrap','overflow-x','overflow-y','overscroll-behavior','padding-block','padding-bottom','padding-inline',

'padding-left','padding-right','padding-top','paint-order','perspective-origin','place-content','place-items','place-self','pointer-events','row-gap',

'scroll-behavior','scroll-margin','scroll-padding','scrollbar-color','scrollbar-gutter','scrollbar-width','shape-margin','shape-outside','shape-rendering','tab-size',

'table-layout','text-align','text-decoration','text-emphasis','text-indent','text-justify','text-orientation','text-overflow','text-rendering','text-shadow',

'text-transform','touch-action','transform-origin','transform-style','transition-delay','transition-duration','transition-property','unicode-bidi','user-select','vertical-align',

'white-space','will-change','word-break','word-spacing','word-wrap','writing-mode','z-index','background-blend-mode','border-block-color','border-block-end',

'border-block-start','border-block-style','border-block-width','border-bottom-color','border-bottom-style','border-bottom-width','border-inline-color','border-inline-end','border-inline-start','border-inline-style',

'border-inline-width','border-left-color','border-left-style','border-left-width','border-right-color','border-right-style','border-right-width','border-top-color','border-top-style','border-top-width',

'box-decoration-break','color-interpolation-filters','column-rule-color','column-rule-style','column-rule-width','contain-intrinsic-height','contain-intrinsic-size','contain-intrinsic-width','font-feature-settings','font-language-override',

'font-optical-sizing','font-size-adjust','font-synthesis-style','font-synthesis-weight','font-variant-alternates','font-variant-caps','font-variant-ligatures','font-variant-numeric','font-variant-position','font-variation-settings',

'grid-auto-columns','grid-auto-flow','grid-auto-rows','grid-column-end','grid-column-gap','grid-column-start','grid-row-end','grid-row-gap','grid-row-start','grid-template-areas',

'grid-template-columns','grid-template-rows','hyphenate-limit-chars','inset-block-end','inset-block-start','inset-inline-end','inset-inline-start','list-style-image','list-style-position','margin-block-end',

'margin-block-start','margin-inline-end','margin-inline-start','masonry-auto-flow','max-block-size','max-inline-size','min-block-size','min-inline-size','mix-blend-mode','overscroll-behavior-block',

'overscroll-behavior-inline','overscroll-behavior-x','overscroll-behavior-y','padding-block-end','padding-block-start','padding-inline-end','padding-inline-start','scroll-margin-block','scroll-margin-bottom','scroll-margin-inline',

'scroll-margin-left','scroll-margin-right','scroll-margin-top','scroll-padding-block','scroll-padding-bottom','scroll-padding-inline','scroll-padding-left','scroll-padding-right','scroll-padding-top','scroll-snap-align',

'scroll-snap-stop','scroll-snap-type','shape-image-threshold','text-align-last','text-combine-upright','text-decoration-color','text-decoration-line','text-decoration-style','text-decoration-thickness','text-emphasis-color',

'text-emphasis-position','text-emphasis-style','text-underline-offset','text-underline-position','text-wrap-mode','text-wrap-style','transition-timing-function','border-block-end-color','border-block-end-style','border-block-end-width',

'border-block-start-color','border-block-start-style','border-block-start-width','border-bottom-left-radius','border-bottom-right-radius','border-end-end-radius','border-end-start-radius','border-inline-end-color','border-inline-end-style','border-inline-end-width',

'border-inline-start-color','border-inline-start-style','border-inline-start-width','border-start-end-radius','border-start-start-radius','border-top-left-radius','border-top-right-radius','contain-intrinsic-block-size','contain-intrinsic-inline-size','font-synthesis-small-caps',

'font-variant-east-asian','scroll-margin-block-end','scroll-margin-block-start','scroll-margin-inline-end','scroll-margin-inline-start','scroll-padding-block-end','scroll-padding-block-start','scroll-padding-inline-end','scroll-padding-inline-start','-webkit-text-fill-color',

'-webkit-text-stroke-color',

]);

const TAPTOP_AUTO_PROPS = new Set(['width','height','top','right','bottom','left']);

```

### Шаг 2. Определение `isCustom` и чистка значения

```

const CUSTOM_VALUE_RE = /(?:calc|var|clamp|min|max|env)(/i;

function stripImportant(value) {

return String(value).replace(/s*!importants*$/i, '').trim();

}

// true => значение нельзя разложить на число+единицу/вариант, нужен isCustom

function ttIsCustomValue(name, value) {

const v = stripImportant(value);

if (CUSTOM_VALUE_RE.test(v)) return true;        // calc(), var(), clamp()...

if (v.includes(',')) return true;                // многослойные box-shadow/transition/background/transform/filter

if (CONSTRUCTOR_LENGTH_STYLE_PROPERTIES.has(name)) {

if (TAPTOP_AUTO_PROPS.has(name) && v === 'auto') return false;

// размерное свойство обязано быть одиночным числом+единицей

return !/^-?d*.?d+(px|%|em|rem|vw|vh|fr|deg|rad|grad|turn)$/.test(v);

}

return false;

}

```

### Шаг 3. Правка `makeCssRule` — корректный `isCustom` и отвод в Embed

```

function makeCssRule(name, rawValue, media) {

const value = stripImportant(rawValue);

// (4) свойства, которых у слоя нет вовсе -> в Embed

if (TAPTOP_BLACKLIST.has(name) ||

(!TAPTOP_NATIVE.has(name) && !TAPTOP_CUSTOM.has(name))) {

pushToEmbed(name, value, media);              // box-sizing, --vars и т.п.

return null;

}

// (3) свойство из cssAllCustomParams (361), не нативное -> всегда custom; (1)/(2) натив -> custom при неразложимом значении

const isCustom = !TAPTOP_NATIVE.has(name) || ttIsCustomValue(name, value);

const rule = { property: name, value, isCustom };

if (!isCustom) Object.assign(rule, parseNumberUnit(value)); // number/unit как раньше

return rule;

}

```

### Шаг 4. Дораскрытие шортхендов в `normalizeConstructorStyleDeclaration`

```

const splitVals = v => splitCssFunctionAwareList(v.trim(), ' ').filter(Boolean);

// 1-4 значения -> top/right/bottom/left либо x/y

function expandBox(value, keys) {

const p = splitVals(value);

if (keys.length === 4) {

const [t, r = t, b = t, l = r] = p;

return { [keys[0]]: t, [keys[1]]: r, [keys[2]]: b, [keys[3]]: l };

}

return { [keys[0]]: p[0], [keys[1]]: p[1] != null ? p[1] : p[0] };

}

const SHORTHAND_EXPANDERS = {

overflow:        v => expandBox(v, ['overflow-x','overflow-y']),

inset:           v => expandBox(v, ['top','right','bottom','left']),

'place-items':   v => expandBox(v, ['align-items','justify-items']),

'place-content': v => expandBox(v, ['align-content','justify-content']),

'place-self':    v => expandBox(v, ['align-self','justify-self']),

flex:            expandFlexShorthand,         // -> flex-grow / flex-shrink / flex-basis

font:            expandFontShorthand,         // -> font-style/weight/size/line-height/family

background:      expandBackgroundShorthand,   // -> background-color/image/repeat/position/size/attachment

// transition/animation/grid НЕ раскладываются по longhand:

//   transition -> custom-шортхенд ([m.CV](http://m.CV).TRANSITION, isCustom:true)

//   animation/grid-шаблоны без longhand -> Embed

};

// в normalizeConstructorStyleDeclaration: перед записью прогнать имя через SHORTHAND_EXPANDERS

```jsx

> **`overflow` (панель «Переполнение»)** — сверено по бандлу: единого нативного `overflow` нет, контрол пишет сразу `overflow-x` + `overflow-y` (внутр. `cssOverflowParams = [overflow-x, overflow-y]`). Значения кнопок: `visible` / `hidden` / `clip` / `scroll` / `auto`. Экспандер `overflow → expandBox(['overflow-x','overflow-y'])` выше (Шаг 4) именно это и делает; двухзначный `overflow: hidden auto` → x=`hidden`, y=`auto`. Сам `overflow` есть ещё и в custom-списке (`m.CV.OVERFLOW`) — на случай, если нужно положить его строкой.

**`border-radius` (панель «Радиус») — сверено с бандлом.** Единого нативного `border-radius` нет: хранятся 4 угловых longhand — `border-top-left-radius`, `border-top-right-radius`, `border-bottom-left-radius`, `border-bottom-right-radius` (группа `cssBorderRadiusParams`). В панели: верхнее «общее» поле (связанное) задаёт все 4 угла, ниже — 4 поля по углам (иконки `radius-all-top-left` / `top-right` / `bottom-left` / `bottom-right`), у каждого своя единица. Сам `border-radius` есть только как custom-шортхенд (`m.CV.BORDER_RADIUS`).

Конвертор уже раскрывает `border-radius` (`expandConstructorBorderRadius`), но критично проверить **порядок углов**: у `border-radius` он по часовой стрелке `TL TR BR BL`, а **НЕ** `top right bottom left`, как у `margin`/`padding`:

- 1 значение → все 4 угла
- 2 → `TL`+`BR` = v1, `TR`+`BL` = v2
- 3 → `TL` = v1, `TR`+`BL` = v2, `BR` = v3
- 4 → `TL` = v1, `TR` = v2, `BR` = v3, `BL` = v4

Краевые случаи: эллиптический радиус (`10px / 20px` или два значения на угол) структурно не поддерживается — в панели один input на угол, поэтому такие значения — в custom/Embed. Проценты (одно значение на угол) поддерживаются.

**`position` / `z-index` / инсеты (панель «Позиционирование») — сверено с бандлом.** Всё нативное, группа `cssPositionParams = [position, top, right, bottom, left, z-index]`:

- `position` — строковый dropdown: `static`, `relative` («Относительное»), `absolute`, `fixed`, `sticky` — все 5 поддерживаются нативно.
- `z-index` — нативное (`z-index`), значение число или `auto` (поле справа).
- `top` / `right` / `bottom` / `left` — 4 нативных свойства (SVG-крестовина инсетов в HTML, `data-property-name="top|right|bottom|left"`). Принимают length / `%` / `auto`.

Важно для конвертора: шортхенд `inset` нативным longhand НЕ является (в enum его нет, но он есть в custom-списке 361). Его нужно раскрывать в `top/right/bottom/left` (порядок как у `margin`: `top right bottom left`):

- 1 значение → все 4
- 2 → `top`+`bottom` = v1, `right`+`left` = v2
- 3 → `top` = v1, `right`+`left` = v2, `bottom` = v3
- 4 → `top` = v1, `right` = v2, `bottom` = v3, `left` = v4

Если не раскрывать, `inset` уйдёт в custom сырой строкой, а крестовина-редактор останется пустой. Логические `inset-block` / `inset-inline` нативных полей не имеют → custom/Embed.

**Блок «Текст» (типографика + выравнивание + «Доп. параметры») — сверено с бандлом.** Почти всё нативное; отдельных структур (как у `transform`) нет — это UI над longhand-свойствами.

Верхняя часть панели:

- `font-family` (Arial) — строка.
- `font-weight` (dropdown «Regular») — именованные (`normal`/`bold`/`bolder`/`lighter`) или число 100–900; `font-style` (курсив) — отдельное нативное свойство.
- `font-size` (16 + `px`) — число+единица (`px`/`em`/`rem`/`%`/`vw`/`vh`).
- `color` (`000000`) + «100%» — альфа цвета → `rgba(...)` (см. дефект 2.13); отдельно есть и нативный `opacity`.
- `line-height` (`normal` + единица) — единицы `px`/`em`/`rem`/`%`/`vw`/`vh`/**`num`** (безразмерное) / **`normal`**. Безразмерное уже обрабатывается `normalizeConstructorUnitlessLineHeight`.
- `letter-spacing` (`normal` + единица) — число+единица или `normal`.
- Выравнивание → `text-align`: `left` / `center` / `right` / `justify`.

Попап «Дополнительные параметры текста»:

- Оформление → `text-decoration` / `text-decoration-line`: нет / `underline` / `line-through`.
- Регистр букв → `text-transform`: нет / `uppercase` (TT) / `lowercase` (tt) / `capitalize` (Tt).
- Перенос при переполнении → `overflow-wrap`: `normal` / `break-word`.
- Прерывание → `white-space`: `normal` / `nowrap` (Не переносить) / `pre` (с учётом пробелов) / `pre-wrap` (переносить с учётом всех) / `pre-line` (переносить без учёта) / `break-spaces` (текст и пробелы). Все 6 значений нативны.

Доп. нативные текстовые свойства: `text-indent`, `text-align-last`, `text-wrap`, `text-shadow`, `-webkit-text-stroke-color` / `-webkit-text-stroke-width` («Обводка текста»).

**Краевые случаи для конвертора:**

- Шортхенд `font` (напр. `font: italic 700 16px/1.4 Arial`) не нативный — раскрывать в `font-style` / `font-weight` / `font-size` / `line-height` / `font-family` (см. дефект 2.4).
- `text-decoration` с цветом/стилем линии (`underline dotted red`): нативна только сама линия (`text-decoration-line`); `text-decoration-color` / `text-decoration-style` в enum НЕТ → эти токены в custom/Embed.
- `word-break` нативным НЕ является (есть только в списке 361) → custom. Аналогично `word-spacing`, `hyphens`, `direction`, `writing-mode` → custom/Embed.
- `line-height` без единиц (`1.5`) — ок (единица `num`).

### Шаг 4а. Лейаут дочернего элемента (flex-child) — полнота

Панель «Лейаут дочернего элемента» — это UI над нативными longhand-свойствами, отдельного хранилища нет:

- «Размер» → `flex-grow` / `flex-shrink` / `flex-basis`;
- «Выровнять» → `align-self`;
- «Порядок» (Первый/Последний) → `order`.

Все эти longhand уже в нативном наборе (Шаг 1), поэтому при корректном `makeCssRule` уйдут как native (`isCustom:false`) и заполнят панель. Остаётся закрыть два пробела:

1. `flex` (шортхенд) уже раскрывается в Шаге 4 (`expandFlexShorthand`), но сама функция там была заглушкой — ниже конкретная реализация (без регулярок).
2. `flex-flow` (= `flex-direction` + `flex-wrap`) не раскрывался — добавить отдельный экспандер.

```

function expandFlexShorthand(value) {

const v = value.trim();

if (v === 'none')    return { 'flex-grow':'0','flex-shrink':'0','flex-basis':'auto' };

if (v === 'auto')    return { 'flex-grow':'1','flex-shrink':'1','flex-basis':'auto' };

if (v === 'initial') return { 'flex-grow':'0','flex-shrink':'1','flex-basis':'auto' };

const parts = splitCssFunctionAwareList(v, ' ').filter(Boolean);

const nums = [], basis = [], out = {};

for (const p of parts) {

if (p !== '' && !isNaN(p)) nums.push(p);   // unitless number -> grow/shrink

else basis.push(p);                         // px/%/auto/content/calc -> flex-basis

}

if (nums[0] != null) out['flex-grow'] = nums[0];

out['flex-shrink'] = nums[1] != null ? nums[1] : '1';

out['flex-basis']  = basis[0] != null ? basis[0] : '0%';

return out;

}

function expandFlexFlow(value) {

const p = splitCssFunctionAwareList(value.trim(), ' ').filter(Boolean);

const WRAP = new Set(['wrap','nowrap','wrap-reverse']);

const out = {};

for (const t of p) { if (WRAP.has(t)) out['flex-wrap'] = t; else out['flex-direction'] = t; }

return out;

}

// in SHORTHAND_EXPANDERS add:  'flex-flow': expandFlexFlow,

```jsx

**Нормализация значений (важно):** `flex-grow` и `flex-shrink` — безразмерные числа, их НЕ нужно прогонять через `normalizeConstructorLengthValue` (иначе припишется `px`); единичную нормализацию применять только к `flex-basis`. `order` — целое (в т.ч. отрицательное), пишется как есть. Псевдозначения `flex-basis` вроде `content`/`fit-content`/`max-content` — оставлять строкой, не трогая.

### Шаг 4б. `background` / `background-image` — структурная модель (сверено с бандлом)

`background-image` у слоя — НЕ строка, а структурный объект (serializr-класс). Подтверждённые поля: `positionX` (left/center/right), `positionY` (top/center/bottom), `offsetX`, `offsetY` (смещение + единица), данные изображения (url/folder/hash/libraryID/preview), `disabled`. Размер/повтор/прикрепление — соседние нативные свойства. Это ровно то, что в HTML-панели: «Выбрать изображение», сетка позиции 3×3 + поля X/Y, «Плитка», «Размер», «Фиксировано».

Соответствие контролов и CSS longhand:

<table header-row="true">
<tr><td>Контрол панели</td><td>CSS longhand</td><td>Значения</td></tr>
<tr><td>Выбрать изображение</td><td>`background-image`</td><td>`url(...)`</td></tr>
<tr><td>Плитка (close/xy/x/y)</td><td>`background-repeat`</td><td>`no-repeat` / `repeat` / `repeat-x` / `repeat-y`</td></tr>
<tr><td>Сетка 3×3 + X/Y</td><td>`background-position`</td><td>keyword offset keyword offset, напр. `left 0px top 0px`</td></tr>
<tr><td>Размер (кнопки)</td><td>`background-size`</td><td>`auto` / `contain` / `cover` / `100% 100%` / `100% auto` / `auto 100%`</td></tr>
<tr><td>Размер (слайдер 0–200%)</td><td>`background-size`</td><td>одиночный процент, напр. `100%`</td></tr>
<tr><td>Фиксировано</td><td>`background-attachment`</td><td>`scroll` / `fixed`</td></tr>
</table>

Сериализация позиции (из бандла): для `center` по оси пишется `left calc(offsetX + 50%)`, иначе `positionX offsetX`. При разборе `50%` → `center`. То есть редактор оперирует **ключевым словом + смещением**, и round-trip идёт через обычный CSS `background-position` (это видно по `style` самого `tt-background-image-editor__view`).

**Вывод для конвертора:** все шесть longhand-свойств фона — нативные, поэтому достаточно разложить шортхенд `background` на них и писать обычными native-декларациями (`isCustom:false`) — TapTop сам соберёт редактор из CSS. Готовый разборщик (без регулярок):

```

function expandBackgroundShorthand(value) {

// несколько слоёв (через запятую) структурно не поддерживаются -> null -> custom/Embed

if (splitCssFunctionAwareList(value, ',').length > 1) return null;

const REPEAT = new Set(['repeat','no-repeat','repeat-x','repeat-y','space','round']);

const ATTACH = new Set(['scroll','fixed','local']);

const POSWORD = new Set(['left','right','top','bottom','center']);

const out = {}, posTokens = [], sizeTokens = [];

let afterSlash = false;

for (const tok of splitCssFunctionAwareList(value.trim(), ' ').filter(Boolean)) {

const t = tok.toLowerCase();

if (t === '/') { afterSlash = true; continue; }   // size идёт после '/'

if (afterSlash) { sizeTokens.push(tok); continue; }

if (t.indexOf('url(') === 0 || t.indexOf('gradient') !== -1) out['background-image'] = tok;

else if (REPEAT.has(t)) out['background-repeat'] = tok;

else if (ATTACH.has(t)) out['background-attachment'] = tok;

else if (POSWORD.has(t) || (t !== '' && !isNaN(parseFloat(t)))) posTokens.push(tok);

else out['background-color'] = tok;

}

if (posTokens.length) out['background-position'] = posTokens.join(' ');

if (sizeTokens.length) out['background-size'] = sizeTokens.join(' ');

return out;

}

```

**Краевые случаи (обязательно учесть):**

1. **Несколько слоёв фона** (через запятую: `url(a), url(b)` или image+gradient) — структурной модели нет → весь `background-image`/`background` класть в custom (`isCustom:true` + имя в `selector.custom[]`) или в Embed. `expandBackgroundShorthand` для таких возвращает `null`.
2. **Градиенты** (`linear-gradient`/`radial-gradient`) — это отдельный режим «градиент» в попапе «Фон», а не редактор изображения; преобразовать CSS-градиент в его модель один-в-один нельзя → custom/Embed.
3. **Произвольный `background-size`** (две длины вроде `200px 100px`) — в наборе только перечисленные пресеты + одиночный процент со слайдера; такое значение пикер не подхватит → писать как custom.
4. **`background-position-x` / `background-position-y` и `background-repeat-x` / `background-repeat-y`** — в `cssBlackList` (молча не сохраняются). Их нельзя писать отдельно — только объединённые `background-position` / `background-repeat`.

### Шаг 5. Псевдо/at-правила → Embed (в `parseConstructorCssRules` и `localConstructorEmbedCodeFromCode`)

```

// вместо молчаливого "return" для селекторов с ':' и @-правил:

function routeNonLayerRule(rule, selectorText, ctx) {

const isRoot = selectorText.toLowerCase() === ':root';

const hasPseudo = !isRoot && /::?[a-z-]/i.test(selectorText);

const isAt = rule.type === 'at-rule' || /^@/.test(rule.cssText || '');

if (hasPseudo || isAt) {

ctx.embedCss.push(rule.cssText);  // :hover, ::before, @keyframes, @font-face, @supports

return true;                      // обработано -> в слой не пишем

}

return false;

}

// localConstructorEmbedCodeFromCode: добавить собранный CSS в Embed

if (ctx.embedCss.length) {

embedParts.push('<style>n' + ctx.embedCss.join('n') + 'n</style>');

}

```

### Шаг 6. Безопасный разбор деклараций (дефект 2.3)

```

function parseStyleDeclarations(cssText) {

const out = {};

for (const decl of splitCssFunctionAwareList(String(cssText || ''), ';')) {

const s = decl.trim();

if (!s) continue;

const i = indexOfTopLevel(s, ':');   // первый ':' вне скобок/кавычек

if (i < 0) continue;

const name = s.slice(0, i).trim().toLowerCase();

const value = s.slice(i + 1).trim();  // ';' и ':' внутри url()/data-URI/функций сохранены

if (name) out[name] = value;

}

return out;

}

```jsx

### Шаг 7. Генерация значения в форме clipboard TapTop

Конвертор должен выдавать не строку, а объект значения нужной формы и вести массив `custom` на селекторе:

```

function buildTaptopValue(name, rawValue) {

const value = stripImportant(rawValue);

const isCustom = !TAPTOP_NATIVE.has(name) || ttIsCustomValue(name, value);

// value всегда финальная CSS-строка; number/unit слой разберёт сам из value/length

return { name, value, isCustom, available: true };

}

// при добавлении свойства в селектор:

function addStyleToSelector(selector, name, rawValue) {

const v = buildTaptopValue(name, rawValue);

selector.props[name] = v;                 // объект значения

if (v.isCustom) {

selector.custom = selector.custom || [];

if (!selector.custom.includes(name)) selector.custom.push(name); // ОБЯЗАТЕЛЬНО

}

}

```jsx

Ключевое: для `isCustom:true` имя свойства **обязательно** заносится и в `custom`-массив селектора — иначе на вставке TapTop пересоберёт значение как обычное и потеряет `calc()/var()`/шортхенд. `available:true` ставим всегда; `parseNumberUnit` из Шага 3 больше не нужен — число/единицу слой вычисляет сам из `value`.

### Шаг 8. Разбор `transform` и `transition` в `items[]`

```

// transform: "translate(10px,0) rotate(45deg) scale(1.2)" -> items[]

// без регулярок: функции вида name(args) ищем через indexOf

function splitNumUnit(raw) {

const s = String(raw).trim();

let i = 0;

while (i < s.length && '0123456789.+-'.indexOf(s.charAt(i)) !== -1) i++;

return { num: parseFloat(s.slice(0, i)) || 0, unit: s.slice(i).trim() };

}

function assignTransformAxes(it, name, args) {

const setAxis = (axis, raw) => {

const nu = splitNumUnit(raw);

it[axis] = nu.num;

if (nu.unit) it[axis + 'Unit'] = nu.unit;

};

const last = name.charAt(name.length - 1);

if (last === 'x') return setAxis('x', args[0]);

if (last === 'y') return setAxis('y', args[0]);

if (last === 'z') return setAxis('z', args[0]);

if (name === 'rotate') return setAxis('z', args[0]);

if (name === 'scale' && args.length === 1) { setAxis('x', args[0]); setAxis('y', args[0]); return; }

if (args[0] != null) setAxis('x', args[0]);

if (args[1] != null) setAxis('y', args[1]);

if (args[2] != null) setAxis('z', args[2]);

}

function parseTransform(value) {

if (String(value).indexOf('matrix') !== -1) return null;

const items = [];

let rest = String(value);

while (true) {

const open = rest.indexOf('(');

if (open === -1) break;

const close = rest.indexOf(')', open);

if (close === -1) break;

const name = rest.slice(0, open).trim().toLowerCase();

const args = rest.slice(open + 1, close).split(',').map(s => s.trim());

rest = rest.slice(close + 1);

let type = null;

if (name.indexOf('translate') === 0) type = 'move';

else if (name.indexOf('scale') === 0) type = 'scale';

else if (name.indexOf('rotate') === 0) type = 'rotate';

else if (name.indexOf('skew') === 0) type = 'skew';

else if (name.indexOf('perspective') === 0) type = 'perspective';

if (!type) continue;

const defU = type === 'rotate' ? 'deg' : 'px';

const it = { type, x: 0, xUnit: defU, y: 0, yUnit: defU, z: 0, zUnit: defU, disabled: false };

assignTransformAxes(it, name, args);

items.push(it);

}

return items.length ? items : null;

}

// transition: "color .3s ease, transform 200ms" -> items[]

function toMs(raw) {

const s = String(raw).trim();

const n = parseFloat(s);

if (isNaN(n)) return 0;

return s.slice(-2) === 'ms' ? n : n * 1000;

}

function parseTransition(value) {

if (String(value).trim() === 'none') return [];

return splitCssFunctionAwareList(value, ',').map(part => {

// split учитывает скобки -> cubic-bezier(...) / steps(...) с пробелами не рвутся

const t = splitCssFunctionAwareList(part.trim(), ' ').filter(Boolean);

return {

transitionProperty: t[0] || 'all',

transitionDuration: toMs(t[1] || '0s'),

transitionTimingFunction: t[2] || 'ease',

transitionDelay: toMs(t[3] || '0s'),

unit: 'ms',

};

}).filter(i => i.transitionDuration > 0 || i.transitionDelay > 0);

}

// положить свойство целиком как custom (сырая строка) + пометить в selector.custom[]

function addCustom(selector, name, value) {

selector.props[name] = { name, value, isCustom: true, available: true };

selector.custom = selector.custom || [];

if (selector.custom.indexOf(name) === -1) selector.custom.push(name);

}

// вложенная функция (calc/var/min/max/clamp) -> parseTransform не справится, уводим в custom

function hasNestedFunc(value) {

const v = String(value).toLowerCase();

return v.indexOf('calc(') !== -1 || v.indexOf('var(') !== -1 ||

v.indexOf('min(') !== -1 || v.indexOf('max(') !== -1 || v.indexOf('clamp(') !== -1;

}

// transform: структура items[]; край (matrix, вложенные функции) -> custom, НЕ Embed

const tf = hasNestedFunc(value) ? null : parseTransform(value);

if (tf === null) addCustom(selector, 'transform', value);

else selector.props['transform'] = { name: 'transform', items: tf, isCustom: false };

// transition: пустой/непарсибельный разбор -> custom, иначе структура items[]

const tr = parseTransition(value);

if (!tr.length && String(value).trim() !== 'none') addCustom(selector, 'transition', value);

else selector.props['transition'] = { name: 'transition', items: tr, isCustom: false };

```jsx

Примечания: `move` сериализуется как `translate3D`, `scale` — как `scale3d` (безразмерные x/y/z), `rotate` — поосевые `rotateX/Y/Z`. `assignTransformAxes` должен учитывать суффикс оси (`translateX`→x, `translateY`→y, `rotateZ`→z и т.д.) и единицы из допустимых наборов. Длительности `transition` — всегда числа в мс.

### Шаг 9. `display: grid` — треки в `items[]`, `gap` в longhand

```

// gap -> row-gap + column-gap

function expandGap(value) {

const p = splitCssFunctionAwareList(value.trim(), ' ').filter(Boolean);

return { 'row-gap': p[0], 'column-gap': p[1] != null ? p[1] : p[0] };

}

// "repeat(2, 1fr)" -> { count: 2, body: "1fr" }, иначе null (без регулярок)

function matchRepeat(token) {

if (token.slice(0, 7).toLowerCase() !== 'repeat(') return null;

const inner = token.slice(7, token.lastIndexOf(')'));

const comma = inner.indexOf(',');

if (comma === -1) return null;

const count = parseInt(inner.slice(0, comma).trim(), 10);

const body = inner.slice(comma + 1).trim();

return count > 0 ? { count, body } : null;

}

// "repeat(2, 1fr) auto" -> items[]

function parseGridTracks(value) {

if (String(value).trim() === 'none') return [];

const items = [];

for (const tok of splitCssFunctionAwareList(value, ' ').filter(Boolean)) {

const rep = matchRepeat(tok);

if (rep) for (let k = 0; k < rep.count; k++) items.push({ value: rep.body });

else items.push({ value: tok });

}

return items;

}

// запись (structured):

selector.props['grid-template-columns'] = { name: 'grid-template-columns', items: parseGridTracks(cols), isCustom: false };

selector.props['grid-template-rows']    = { name: 'grid-template-rows',    items: parseGridTracks(rows), isCustom: false };

// grid / grid-template / grid-template-areas / grid-auto-columns / grid-auto-rows:

// нативных longhand-полей нет, но все они есть в custom-whitelist (cssAllCustomParams) ->

// класть как custom: addCustom(selector, name, value). В Embed только псевдо/@-правила и --переменные.

```jsx

`gap` раскладывается в `row-gap`/`column-gap`, треки — в `items[]`. `display`, `grid-auto-flow`, `justify-*`/`align-*` пишутся как обычные строковые значения.

### Шаг 10. Контекстные селекторы (`.root .child`) — уникальный класс на дочерних слоях (дефект 2.9)

Заменяет расплющивание в глобальный `.child`. Идея: разобрать селектор БЕЗ срезания комбинаторов, найти реальные дочерние слои под цепочкой предков и навесить на них уникальный класс, а стили писать в него (область действия сохранена). Соседние комбинаторы и неразрешимые цепочки — в Embed; компаунд `.a.b` — один элемент. Предполагается, что `selectorText` уже схлопнут по одиночным пробелам.

```

// Разбор селектора на сегменты С СОХРАНЕНИЕМ комбинатора (в отличие от

// normalizeConstructorCssSelectorText, который срезает пробелы вокруг > + ~).

// seg.combinator — связь сегмента с ПРЕДЫДУЩИМ: ">" дочерний, " " потомковый,

// "+"/"~" соседний; у первого сегмента combinator = null.

function tokenizeContextualSelector(sel) {

const segments = [];

let cur = { classes: [], tag: null, combinator: null };

let buf = "", mode = "tag";

const flushToken = () => {

if (buf === "") return;

if (mode === "class") cur.classes.push(buf); else cur.tag = buf.toLowerCase();

buf = "";

};

const flushSegment = (nextCombinator) => {

flushToken();

if (cur.classes.length || cur.tag) segments.push(cur);

cur = { classes: [], tag: null, combinator: nextCombinator };

mode = "tag";

};

for (let i = 0; i < sel.length; i++) {

const ch = sel.charAt(i);

if (ch === ".") { flushToken(); mode = "class"; continue; }

if (ch === ">" || ch === "+" || ch === "~") { flushSegment(ch); continue; }

if (ch === " ") { if (cur.classes.length || cur.tag) flushSegment(" "); continue; }

buf += ch;

}

flushSegment(null);

return segments;

}

```

```

function layerMatchesSegment(layer, seg) {

if (seg.tag && (layer.tag || "").toLowerCase() !== seg.tag) return false;

for (const cls of seg.classes) if (!layerHasClass(layer, cls)) return false;

return true;

}

// Цель + цепочка предков справа налево; combinator звена решает,

// прямой это родитель (">") или любой предок (" ").

function findLayersMatchingChain(tree, ancestors, target) {

const out = [];

walkLayers(tree, (layer) => {

if (!layerMatchesSegment(layer, target)) return;

let node = layer, ok = true;

for (let i = ancestors.length - 1; i >= 0; i--) {

const seg = ancestors[i];

const link = (i + 1 < ancestors.length) ? ancestors[i + 1].combinator : target.combinator;

node = node.parent;

if (link === ">") {

if (!node || !layerMatchesSegment(node, seg)) { ok = false; break; }

} else {

while (node && !layerMatchesSegment(node, seg)) node = node.parent;

if (!node) { ok = false; break; }

}

}

if (ok) out.push(layer);

});

return out;

}

```

```

function applyContextualCssRule(selectorText, declarations, ctx) {

const segments = tokenizeContextualSelector(selectorText);

// (1) один сегмент: компаунд .a.b или простой класс/тег = ОДИН элемент.

if (segments.length === 1) {

const sel = getMainSelectorForCompound(ctx, segments[0]); // классы как AND-условие

for (const name in declarations) addStyleToSelector(sel, name, declarations[name]);

return;

}

// (2) соседние +/~ структурно не выразимы -> Embed.

for (let i = 1; i < segments.length; i++) {

const c = segments[i].combinator;

if (c === "+" || c === "~") { ctx.embedCss.push(buildRuleText(selectorText, declarations)); return; }

}

// (3) потомковая/дочерняя цепочка: ищем РЕАЛЬНЫЕ дочерние слои.

const target = segments[segments.length - 1];

const matched = findLayersMatchingChain(ctx.layerTree, segments.slice(0, -1), target);

// (4) нет совпадений -> в Embed (НЕ навешиваем на все .child — старый фолбэк убран).

if (!matched.length) { ctx.embedCss.push(buildRuleText(selectorText, declarations)); return; }

// (5) уникальный класс на самих совпавших дочерних слоях -> область сохранена.

const uniqueClass = ensureUniqueClass(target);

const sel = getMainSelector(ctx, uniqueClass);

for (const layer of matched) addClassToLayer(layer, uniqueClass);

for (const name in declarations) addStyleToSelector(sel, name, declarations[name]);

}

```jsx

Новые хелперы (`layerHasClass`, `walkLayers`, `addClassToLayer`, `ensureUniqueClass`, `getMainSelector`, `getMainSelectorForCompound`, `buildRuleText`) — тонкие обёртки над уже существующими механизмами слоёв/селекторов конвертора (`classNameFor`/`ensureClass`, обход `constructor.root`, `mainSelectors`). `addStyleToSelector` — из Шага 7.

Что это чинит в дефекте 2.9:

- `.root .child` больше не пишется в глобальный `.child` — стили идут на уникальный класс только совпавших потомков (область действия сохранена);
- `>` / `+` / `~` различаются: дочерний требует прямого родителя, соседние уходят в Embed;
- `.btn.primary` (компаунд) трактуется как один элемент с двумя классами, а не как цепочка предков;
- убран фолбэк «навесить на все `.child`»: при отсутствии совпадений правило уходит в Embed, а не протекает глобально.

#### Почему `.root__child` сам по себе не решение

`.root__child` — это не отдельный подход, а та же идея «навесить сгенерированный класс на потомка», что и в Path B, и в Шаге 10. Проблема дефекта 2.9 не в имени класса, а в трёх вещах, которые имя само по себе не закрывает:

1. **Плоский `join` теряет комбинатор и компаунд.** `normalizeConstructorClassStyleSelector` строит имя как `classParts.join('__')`, поэтому `.root .child`, `.root > .child` и компаунд `.root.child` схлопываются в одно `root__child` — разные правила пишутся в один класс и перетирают друг друга.
2. **Назначение класса слепое.** `applyConstructorCompoundClasses` при неуверенном матче навешивает класс на все `.child` в дереве (фолбэк) — стиль протекает за пределы `.root`.
3. **Потеря специфичности/каскада (главное).** В CSS `.root .child` (0-2-0) должен побеждать `.child` (0-1-0) независимо от порядка. Два плоских класса на одном слое TapTop разрешает по своему порядку применения, а не по CSS-специфичности — переопределение может «перевернуться».

Поэтому решением становится не имя, а связка:

- **Точный матч цепочки предков** (Шаг 10, справа налево, без фолбэка на все `.child`); имя может быть и `root__child`, но обязано кодировать комбинатор и компаунд, чтобы не было коллизий из п. 1.
- **Предразрешение каскада на конвертации.** Для каждого целевого слоя вычислить итоговое значение каждого свойства по специфичности + порядку и записать готовые плоские значения в собственный класс слоя. Тогда Embed не нужен, а каскад сохранён — ценой потери «живой» связи с исходным классом (правка `.child` в редакторе потом не подхватится автоматически).
- **Embed — только для невыразимого в модели:** соседние `+` / `~`, `:nth-child`, атрибутные `[data-...]` и состояния, которых нет в модели источников.

### Шаг 11. Единый валидатор размеров `normalizeConstructorSizeValue` (дефекты 2.5, 2.5а)

Одна точка классификации для всего семейства размерных свойств (`width` / `height` / `min-*` / `max-*` и инсетов `top/right/bottom/left`): число+единица / `auto` / `none` → нативно; `calc/var/clamp/min/max` и интринсик-ключевые слова → custom; подозрительный `0` из computed-стилей → отбросить. Заменяет асимметричный `shouldDropConstructorStyleValue` (причина 2.5а) и одновременно перестаёт глотать осознанный `min-width:0` из источника (дефект 2.5).

```

const TAPTOP_SIZE_PROPS = new Set([

'width','height','min-width','min-height','max-width','max-height',

'top','right','bottom','left',

]);

const SIZE_UNITS = new Set(['px','%','em','rem','vw','vh','vmin','vmax']);

const SIZE_INTRINSIC = new Set([

'fit-content','max-content','min-content','stretch','fill-available','-webkit-fill-available',

]);

```

```

function hasCssFunc(v) {

const s = v.toLowerCase();

return s.indexOf('calc(') !== -1 || s.indexOf('var(') !== -1 ||

s.indexOf('clamp(') !== -1 || s.indexOf('min(') !== -1 ||

s.indexOf('max(') !== -1 || s.indexOf('env(') !== -1;

}

// "12.5px" -> { num: 12.5, unit: "px" }; нет числовой части -> null

function splitNumberUnit(v) {

let i = 0;

while (i < v.length && '0123456789.+-'.indexOf(v.charAt(i)) !== -1) i++;

if (i === 0) return null;

const num = parseFloat(v.slice(0, i));

if (isNaN(num)) return null;

return { num, unit: v.slice(i).trim().toLowerCase() };

}

// route: 'native' | 'custom' | 'embed' | 'drop'

function normalizeConstructorSizeValue(name, rawValue, opts) {

const fromComputed = !!(opts && opts.fromComputed);

const v = stripImportant(rawValue).trim();

if (v === '') return { route: 'drop' };

const low = v.toLowerCase();

if (low === 'auto')

return TAPTOP_AUTO_PROPS.has(name) ? { route: 'native', value: 'auto' } : { route: 'custom', value: v };

if (low === 'none')

return (name === 'max-width' || name === 'max-height') ? { route: 'native', value: 'none' } : { route: 'custom', value: v };

if (hasCssFunc(low)) return { route: 'custom', value: v };   // calc/var/clamp/min/max -> поле не парсит

if (SIZE_INTRINSIC.has(low)) return { route: 'custom', value: v };

const nu = splitNumberUnit(v);

if (nu && (nu.unit === '' || SIZE_UNITS.has(nu.unit))) {

// подозрительный ноль из computed скрытого элемента -> не писать (иначе застрянет 0px)

if (nu.num === 0 && fromComputed && (name === 'width' || name === 'max-width' || name === 'max-height'))

return { route: 'drop' };

return { route: 'native', value: String(nu.num) + (nu.unit === '' ? 'px' : nu.unit) };

}

return { route: 'custom', value: v };                        // многозначное/неизвестное

}

```

```

// в normalizeConstructorStyleDeclaration / makeCssRule, до общей ветки:

if (TAPTOP_SIZE_PROPS.has(name)) {

const r = normalizeConstructorSizeValue(name, value, { fromComputed });

if (r.route === 'drop') return;                              // объявление не пишем

if (r.route === 'native') return addStyleToSelector(sel, name, r.value);

if (r.route === 'custom') return addCustom(sel, name, r.value);

return pushToEmbed(name, r.value, media);                    // 'embed'

}

```jsx

Что это чинит:

- **2.5а:** `width:0` / `max-*:0`, прочитанные с computed-стилей скрытого (`display:none`) элемента, отбрасываются, а не доезжают как `0px`; `calc/var/clamp` и интринсик-ключевые слова не попадают в нативное поле (где `parseFloat→0`), а уходят в custom.
- **2.5:** `min-width:0` / `min-height:0`, явно заданные в источнике, проходят как нативные (их нет в списке drop) — раскладка flex/grid и `text-overflow` не ломаются.
- Единая маршрутизация: вместо разрозненных проверок (`shouldDropConstructorStyleValue`, `normalizeConstructorLengthValue`, `autoProperties`) один валидатор на всё семейство размеров, с явными ветками `native/custom/embed/drop`.

### Шаг 12. Медиазапросы: min-width и диапазоны → Embed (дефект 2.6)

Сейчас `normalizeConstructorMedia` понимает только `max-width ≤480/768/992`. Остальное (min-width, диапазоны, desktop-up) возвращается «как есть» и молча игнорируется. Решение — явная маршрутизация: что не ложится в 3 брейкпоинта, уводить в Embed.

```

const TAPTOP_BREAKPOINTS = [479, 767, 991];

// прочитать число px у фичи media (без регулярок)

function readMediaPx(condition, feature) {

const at = condition.indexOf(feature + ':');

if (at === -1) return null;

const s = condition.slice(at + feature.length + 1);

let i = 0;

while (i < s.length && s.charAt(i) === ' ') i++;

let j = i;

while (j < s.length && '0123456789.'.indexOf(s.charAt(j)) !== -1) j++;

const num = parseFloat(s.slice(i, j));

return isNaN(num) ? null : num;

}

// { route:'native', breakpoint } | { route:'embed' }

function normalizeConstructorMediaRule(condition) {

const c = String(condition).toLowerCase();

if (c.indexOf('min-width') !== -1) return { route: 'embed' };

if (c.indexOf('max-width') === -1) return { route: 'embed' };

const px = readMediaPx(c, 'max-width');

if (px === null) return { route: 'embed' };

const bp = TAPTOP_BREAKPOINTS.filter(b => px <= b + 1).sort((a, b) => a - b)[0];

return bp ? { route: 'native', breakpoint: bp } : { route: 'embed' };

}

function applyMediaRule(condition, cssText, ctx) {

const r = normalizeConstructorMediaRule(condition);

if (r.route === 'embed') {

ctx.embedCss.push('@media ' + condition + ' { ' + cssText + ' }');

return null;

}

return r.breakpoint;

}

```

Что это чинит: `@media (min-width: 1200px)`, диапазоны `(min-width:768px) and (max-width:991px)` и промежуточные брейкпоинты больше не теряются — уходят в Embed-`<style>` нетронутым правилом.

### Шаг 13. Дедуп «класс vs уникальный селектор» (дефект 2.8)

Если одно свойство задано и инлайном слоя (`designSelectors`, `.x--u-id`), и CSS класса (`mainSelectors`, `.class`) — уникальный селектор перетирает класс. Убираем дубль на уровне сборщика.

```

// перед записью inline-стилей слоя удалить свойства,

// которые уже заданы исходным CSS того же класса с тем же значением

function dedupLayerStylesAgainstClasses(layer, ctx) {

const classRules = {};

for (const cls of (layer.classes || [])) {

const sel = ctx.mainSelectors[cls];

if (!sel || !sel.props) continue;

for (const name in sel.props) classRules[name] = sel.props[name];

}

const styles = layer.styles || {};

for (const name in styles) {

if (!(name in classRules)) continue;

if (serializeTaptopValue(styles[name]) === serializeTaptopValue(classRules[name])) {

delete styles[name];           // одинаково -> дубль, класс оставляем

}

// разные значения -> намеренное переопределение, не трогаем

}

}

```

Что это чинит: одно и то же свойство не пишется дважды; визуальное расхождение «класс задумывался, а победил уникальный селектор» исчезает; осознанные переопределения сохраняются.

### Шаг 14. Стили тегов вне белого списка (дефект 2.10)

`normalizeConstructorSourceTag` отдаёт пустой селектор для `ul/ol/li/table/input/...` → правила по таким тегам выбрасываются. Не теряем: либо садим на реальные слои (по сохранённому `tagName`), либо в Embed.

```

const EXTRA_SOURCE_TAGS = new Set([

'ul','ol','li','dl','dt','dd',

'table','thead','tbody','tfoot','tr','td','th',

'form','input','textarea','select','option','label','fieldset','legend',

'figure','figcaption','details','summary','blockquote','pre','code','hr',

'video','audio','iframe',

]);

function applyTagSelectorRule(tag, declarations, ctx) {

const matched = [];

walkLayers(ctx.layerTree, (layer) => {

if ((layer.tag || '').toLowerCase() === tag) matched.push(layer);

});

if (!matched.length) {

ctx.embedCss.push(buildRuleText(tag, declarations));   // нет таких слоёв -> Embed

return;

}

for (const layer of matched) {

const uniqueClass = ensureUniqueClass(layer);

addClassToLayer(layer, uniqueClass);

const sel = getMainSelector(ctx, uniqueClass);

for (const name in declarations) addStyleToSelector(sel, name, declarations[name]);

}

}

```

Зависит от сохранения `tagName` (см. п. 6 «Ключевые правила»). Что это чинит: CSS списков/форм/таблиц больше не пропадает — либо применяется к реальным слоям, либо уходит в Embed. Хелперы `walkLayers` / `ensureUniqueClass` / `addClassToLayer` / `getMainSelector` / `buildRuleText` — из Шага 10, `addStyleToSelector` — из Шага 7.

### Шаг 15. Нормализация цвета в `rgb()/rgba()` (дефект 2.13)

TapTop хранит цвет строкой, но прогоняет через `toRgbString()`; `#hex` / named / `hsl()` пикер не подхватит. Нормализуем перед записью.

```

const TAPTOP_COLOR_PROPS = new Set([

'color','background-color',

'border-top-color','border-right-color','border-bottom-color','border-left-color',

'outline-color','-webkit-text-stroke-color','text-decoration-color','column-rule-color',

]);

// toRgb() — обёртка над цвет-библиотекой редактора (как toRgbString в бандле)

function buildTaptopColorValue(name, rawValue) {

const v = stripImportant(rawValue).trim().toLowerCase();

if (v === 'transparent' || v === 'none') {

return { name, value: 'transparent', isCustom: false, available: true, disabled: true };

}

if (v === 'currentcolor' || v === 'inherit' || v === 'initial' || v === 'unset') {

return { name, value: v, isCustom: true, available: true };   // не цвет-литерал

}

const rgb = toRgb(v);

if (!rgb) return { name, value: stripImportant(rawValue), isCustom: true, available: true };

return { name, value: rgb, isCustom: false, available: true };

}

// в addStyleToSelector: if (TAPTOP_COLOR_PROPS.has(name)) использовать buildTaptopColorValue

```

Краевое: у `box-shadow` цвет — подполе `color` внутри объекта тени (не отдельное свойство), нормализовать его там же. Что это чинит: пикер подхватывает значение; `transparent` / `none` → флаг `disabled`, а не произвольная строка.

### Шаг 16. SVG: сохранять мультиколор (дефект 2.12)

Сейчас все `fill` / `stroke` схлопываются в `currentColor`, а первый цвет поднимается в `color` — многоцветные иконки теряют цвета. Решение: коэрсить в `currentColor` только одноцветные.

```

// собрать уникальные fill/stroke (без регулярок — по атрибутам распарсенного DOM)

function collectSvgColors(svgEl) {

const set = new Set();

const visit = (el) => {

['fill', 'stroke'].forEach((attr) => {

const val = el.getAttribute && el.getAttribute(attr);

const low = String(val || '').toLowerCase();

if (low && low !== 'none' && low !== 'currentcolor') set.add(low);

});

Array.from(el.children || []).forEach(visit);

};

visit(svgEl);

return set;

}

function normalizeConstructorSvgColors(svgEl) {

const colors = collectSvgColors(svgEl);

if (colors.size <= 1) {

return { mode: 'monochrome', color: colors.values().next().value || null };

}

return { mode: 'multicolor' };          // исходные fill/stroke НЕ трогаем

}

```

Что это чинит: многоцветные SVG сохраняют исходные цвета; одноцветные по-прежнему перекрашиваются через `color` слоя.

**Порядок внедрения:** Шаги 1–3 закрывают `isCustom`/неподдержку (дефекты 2.2, 2.7), Шаг 4 — шортхенды (2.4), Шаг 5 — псевдо/keyframes (2.1), Шаг 6 — порчу значений (2.3), Шаг 10 — контекстные/составные селекторы (2.9), Шаг 11 — нормализация размеров (2.5, 2.5а). Шаги 12–16 закрывают остаток: медиа (2.6), дедуп класс/уникальный селектор (2.8), стили тегов вне whitelist (2.10), цвет → rgb/rgba (2.13), мультиколор SVG (2.12) — все «не выразимое в модели» уводится в Embed через тот же `ctx.embedCss`.

## 🎬 Анимации/эффекты — отдельная подсистема (не CSS, конвертору недоступна)

Панель «Анимации» (скриншоты: «Появление на экране», «По клику», «При наведении», «Трансформация по скроллу» с пресетами «Проявление/Увеличение/Скольжение…» и эффектами вроде «Непрозрачность») — это **не CSS-стили** и **не часть модели стилизации слоя** (`m.Fi`/`m.CV`). Это самостоятельная подсистема эффектов/интеракций редактора.

**Да, это есть в коде редактора** (бандл `taptop-full.js`). Подтверждено по структуре:

- Константы-ключи: `TRIGGER_ELEMENT:"triggerElement"`, `PRESET:"preset"`, `EFFECT_IDS:"effectIds"`, секции `ANIMATIONS` / `EFFECTS`.
- Эффекты хранятся **централизованно**, отдельно от стилей: `effects[id]`, где у каждого эффекта по брейкпоинту (`[SCREEN]`) лежат `keyframes`, `options`, `disabled`.
- Слой не хранит анимацию внутри стилей — он **ссылается** на эффекты через `effectIds` в своих `mediaParams`, плюс `triggerElement` (на каком элементе срабатывает) и `preset` (выбранный пресет).
- Применение: метод `setAttrAnimation(...)`; чтение через `getParam("animation") → { effect }`.

То есть это полноценный движок «триггер → пресет → эффект (с keyframes по брейкпоинтам)», параллельный стилям. Кириллица из панели в бандле не лежит — подписи вынесены в i18n, поэтому поиск по русским строкам даёт 0, но сама модель в коде присутствует.

<callout icon="⚠️" color="orange_bg">
**Следствие для конвертора.** Конвертор формирует только **стили слоя** (нативные + custom) и Embed. У него нет доступа к коллекции `effects` / `effectIds` / `triggerElement` / `preset`, и clipboard-данные слоя их не несут. Поэтому:

1. CSS-`animation` и `@keyframes` **нельзя** автоматически превратить в эти анимации TapTop — соответствия один-к-одному нет (пресеты — это не произвольные keyframes). Они по-прежнему уходят в **Embed**, либо анимация настраивается в редакторе вручную.
2. `transition` мы отводим в **custom-свойство** (Шаг 8) — это корректно для CSS-перехода, но это НЕ та «анимация по клику/скроллу», что на скриншотах; не нужно пытаться маппить одно в другое.
3. Генерировать записи `effects`/`effectIds` из конвертора **не следует** — это вне формата вставки слоя и сломает данные. Анимации/интеракции остаются ручной настройкой пользователя после вставки.
</callout>

## 5. Что стоит проверить на реальных данных

- ✅ Решено: значение хранится объектом `{ name, value, isCustom, available }`; `calc/var`/шортхенды → `isCustom:true` + имя в массиве `custom` селектора (см. «Формат значения в clipboard» и Шаг 7). Формат цвета также выяснен — см. дефект 2.13 (TapTop хранит `rgb/rgba`-строку + флаг `disabled`).
- Какие именно свойства редактор молча отбрасывает при вставке слоя (сверить с `nativeStyles`).
- Поведение `line-height` после конвертации unitless → `%` (наследование).

```