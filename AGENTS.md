# AGENTS.md

Инструкции для AI-агентов, работающих в этом репозитории.

## Что это

Дизайн маркетингового сайта **Kafka** — SaaS-платформы для ресторанов Казахстана (своё приложение/QR-меню, WhatsApp/Telegram-бот, агрегаторы Wolt/Glovo/Yandex Eats/Choco, доставка, CRM, лояльность и Fidele, бэк-офис, обучение, AI-ассистент; интеграции с iiko, r_keeper, 1С, Kaspi Pay, Webkassa). Язык сайта — русский (переключатель RU/KZ/EN в шапке), валюта — ₸.

Сайт на Astro **собирается прямо из файлов макета** `design/project/*.dc.html`: разметка и стили переносятся один в один, логика артбордов исполняется в браузере. Поэтому почти любая правка внешнего вида или текста — это правка `.dc.html`, а не кода в `src/`. План и статус работ — `docs/PLAN.md`.

- Канвас (дизайн-артефакт на claude.ai): https://claude.ai/code/artifact/d0a4ea06-2044-43da-b093-e5aae1e247a3 (короткая ссылка: https://claude.ai/artifact/SmL2BqQK7J73sajUwnSWBL)
- `design/project/` — файлы канваса, источник правды для сайта. Пользователь может менять макет и в редакторе канваса — тогда сначала скачайте свежую версию файла из артефакта.
- `assets/` — сюда пользователь складывает изображения и другие материалы для лендинга.

## Команды

- `npm run dev` — dev-сервер на http://localhost:4321 (в Astro 7 уходит в фон; `npx astro dev stop` / `status` / `logs`). Правки в `design/project/*.dc.html` подхватываются на лету.
- `npm run build` → `dist/`; `npm run preview` — просмотр сборки; `npm run check` — проверка типов.
- `node scripts/shot.mjs <путь> <ширина> <out.png> [селектор|-] [ожидание_мс] [full]` — скриншот работающего dev-сервера через локальный Chrome (playwright-core), заодно печатает ошибки консоли. Пример: `node scripts/shot.mjs /pricing 390 /tmp/p.png - 1500 full`. Флаги `--screenshot` самого Chrome не годятся: не дожидаются анимаций.

- `node scripts/og.mjs` — пересобрать `public/og.png` (превью для соцсетей, 1200×630) и `public/logo.png` (логотип для schema.org).
- `node scripts/logos.mjs` — пересобрать логотипы партнёров из `assets/` в `public/logos/` (`<id>.webp` — квадратная иконка 128 px для плиток, `<id>-mark.webp` — словесный знак на прозрачном фоне). Список брендов и параметры обрезки — в начале скрипта; в макетах логотипы подключены как `<img src="/logos/…">`. `whatsapp.svg` в `public/logos/` сделан вручную из Simple Icons (не из `assets/`, скрипт их не трогает).
- `scripts/almaty-map.py` — карта центра Алматы в карточке «Доставка» на главной (`public/img/almaty-map.svg`, данные OpenStreetMap, подпись «© OpenStreetMap» рядом с картой обязательна). Как пересобрать и откуда брать данные — в шапке скрипта; маршрут и метки рисуются поверх карты в `Main.dc.html`/`Mobile.dc.html` в той же системе координат 600×480.
- `node scripts/phones.mjs <dir> [chrome|webkit] [ширина]` — скриншоты 5 экранов телефона в hero; `node scripts/sections.mjs <dir> '<путь>|<ширина>|<селектор>|<имя>' …` — скриншоты отдельных блоков. Оба останавливают таймеры страницы и проверяют её как в Chrome, так и (phones) в WebKit/Safari.

- Docker: `docker compose up -d --build` — собирает сайт (Node) и раздаёт `dist/` через nginx на порту 8080 (конфиг `docker/nginx.conf`, `absolute_redirect off` нужен из-за проброса порта). После любых правок контейнер нужно пересобрать этой же командой; остановить — `docker compose down`.

- Деплой на ps.kz (Plesk, Apache): `npm run deploy` — собирает сайт в `dist/`, коммитит только `dist/` и делает `git push`. Папка `dist/` лежит в git; Plesk забирает репозиторий, корень документов сайта — `dist/`. Правки исходников коммитьте отдельно до деплоя. Правила `.htaccess` (`public/.htaccess`) повторяют `docker/nginx.conf`: `/products/` → 301 на `/products`, 404 → `/404.html`, кеш для `/_astro/`.

Тестов нет; проверка — сборка, скриншоты на 1440 и 390 px и клики через playwright.

## Как устроен сайт

- `src/lib/dc/render.ts` — серверный рендер артборда: шаблонный синтаксис превращается в HTML начального состояния плюс служебные хуки: `{{x}}` в тексте → `<dc-t data-t>`, атрибут с `{{}}` → значение + `data-b-<attr>` (шаблон), `onClick` → `data-on-click`, `<sc-if>` → `<dc-if hidden>`, `<sc-for>` → `<dc-for>` с развёрнутыми элементами. Ссылки `X.dc.html` → маршруты сайта (`PAGE_LINKS`).
- `src/lib/dc/runtime.ts` — `DCLogic` (state/setState) и `mount()`: после каждого `setState` пересчитывает `renderVals()` и обновляет хуки. Длина списков в `sc-for` во время работы не меняется (если понадобится — дорабатывать рантайм).
- `astro.config.mjs` — Vite-плагин: `import C from '…/X.dc.html?dc-logic'` отдаёт класс `Component` артборда как ES-модуль (на сервере для начального состояния и в браузере).
- `src/lib/dc/css.ts` — CSS страницы = `<helmet><style>` главного артборда; отличающиеся правила других артбордов скоупятся (`.v-mob`, `.v-page`).
- `src/pages/index.astro` — главная: десктопный артборд (`.v-desk`) от 761 px и `Mobile.dc.html` (`.v-mob`) до 760 px. У мобильного дерева id и якоря с префиксом `m-`.
- `src/pages/[...page].astro` — внутренние страницы (`/products`, `/integrations`, `/integrations/rkeeper`, `/cases`, `/pricing`, `/partners`). Список страниц, их title/description/keywords, хлебные крошки и JSON-LD — в `src/lib/seo.ts` (`PAGES`); новая страница = артборд + запись в `PAGES` + маршрут в `PAGE_LINKS` (`render.ts`).
- `src/lib/seo.ts` — SEO: общие настройки (`SITE`: коды подтверждения Google Search Console и Яндекс Вебмастера, номер Яндекс Метрики), метаданные страниц, разметка schema.org (Organization, WebSite, BreadcrumbList, FAQPage — из `faq` в `renderVals()` артборда при `faqSchema: true`, Service). `sitemap.xml` и `robots.txt` строятся из него же (`src/pages/sitemap.xml.ts`, `robots.txt.ts`), домен — `site` в `astro.config.mjs`.
- `src/layouts/Base.astro` — `<head>`: мета, canonical, Open Graph, JSON-LD, шрифты. `src/pages/404.astro` — страница 404 (noindex).
- Формы демо отправляют заявки в сервис `kafka-bot` (он пересылает их в Telegram-чат продаж). Механика — `src/lib/lead.ts` (UTM в `sessionStorage`, `fetch` с таймаутом, разбор ответа) и `DCLogic.sendLead()` в `runtime.ts` (считает `elapsed` с момента показа формы). Логика формы в артбордах (`leadVals`/`submitLead`, поля по `name`, ловушка `website`) одинакова во всех 8 файлах — правьте синхронно; у `Pricing` и `Partners` есть свой `leadExtra()`. Адрес API — переменная `PUBLIC_LEAD_API` (по умолчанию Railway; в Docker — `--build-arg`). Контракт API — `docs/LEADS-INTEGRATION.md`. С `localhost` сервер отвечает 403: проверяйте с перехватом запроса в playwright (`page.route`). Каждая успешная заявка уходит в живой чат — тестовые отправлять только с согласия пользователя и с «ТЕСТ» в имени.

## Структура канваса

`design/project/canvas.json` — индекс: артборды (`boards`, координаты и размеры фреймов), их порядок (`order`), заголовок. Каждый артборд — самодостаточный файл `*.dc.html`:

| Файл | Что это |
|---|---|
| `Main.dc.html` | Главная, desktop 1440: hero со слайдером телефонов и live-счётчиком заказов, «Что получает ваш ресторан» (карусель из 9 модулей), путь заказа, результаты, форма демо (`#demo`) |
| `Mobile.dc.html` | Главная, mobile 390 |
| `Products.dc.html` | Все модули подробно + конструктор набора модулей |
| `IntegrationRkeeper.dc.html` | SEO-лендинг «Интеграция r_keeper» (`/integrations/rkeeper`): схема работы, возможности, шаги подключения, FAQ на `<details>` (текст ответов всегда в HTML) |
| `Integrations.dc.html`, `Cases.dc.html`, `Pricing.dc.html` (тарифы Старт/Рост/Сеть + FAQ), `Partners.dc.html` | Внутренние страницы |
| `UIKit.dc.html` | UI-кит: цвета, типографика, логотип, иконки, кнопки — сверяйтесь с ним |

Страницы ссылаются друг на друга по имени файла (`href="Products.dc.html"`). Шапка, меню и блок демо-формы **скопированы** в каждый файл, а не вынесены в компонент — общую правку нужно повторить во всех страницах (и в `Mobile.dc.html`).

## Формат `.dc.html` (то, что ломается молча)

- Строку `<script src="./support.js"></script>` в `<head>` не трогать.
- Разметка — внутри `<x-dc>`; общие стили и Google Fonts — в `<helmet>`. Вся разметка — XML-строгая: закрывать каждый элемент, атрибуты в кавычках.
- Логика — `<script type="text/x-dc" data-dc-script>` с классом `Component extends DCLogic` (обычный JS без import; `state`/`setState`, `renderVals()`). В разметке `{{hole}}` — только точечный путь в результат `renderVals()`, не выражение. Циклы `<sc-for>`, условия `<sc-if>`. UI не строить через `innerHTML`/`appendChild`.
- Без `<iframe>`, emoji-иконок и внешних запросов (кроме Google Fonts).
- Страницы desktop — резиновые (`expand: "fill"` в индексе), Mobile — фиксированные 390 px.
- Полная спецификация формата — в файлах артефакта `artifact-type/reference/format.md` и `craft.md` (читать через Artifact `read_file`).

## Дизайн-система (из `UIKit.dc.html`)

- Цвета: томат `#D4401F` (основной, hover `#B5341A`; для текста/ссылок `#C23A1B`), уголь `#17130F` (текст), база `#F7F4EF` (фон), белые карточки, мята `#12805C` (статусы, WhatsApp-кнопка), томат светлый `#FCE7DF`, бейдж NEW `#FFC83D`. Fidele — отдельный суббренд: `#5B3DF5` + `#C8F169`. Вторичный текст `#3B342E` / `#6A615A`, рамки `#E4DDD2`/`#E7E1D8`.
- Шрифты: Montserrat (весь текст; заголовки — `.cap`, 800, uppercase), Fraunces 800 — только словесный знак `kafka.` (точка томатная).
- Иконки: Lucide, 24 px, линия 2; соцсети — Simple Icons. Инлайн-SVG.
- Готовые классы в `<helmet>`: `.btn` + `.btn-p/-s/-wa/-l` (pill, ≥52 px), `.card` (радиус 28), `.chip`, `.badge .b-new/.b-ai`, `.eyebrow`, `.glass`, `.tick`, `.photo` (полосатый плейсхолдер под фото с подписью).
- Мокапы телефонов, чатов, приложений нарисованы HTML/CSS, а не картинками. Реальных изображений пока нет — места под фото помечены `.photo`.

## Как вносить изменения

1. Тексты, стили, раскладка, логика блоков — правьте `design/project/*.dc.html` (с соблюдением формата выше). Код в `src/` — только для механики сайта (рендер, маршруты, SEO, формы).
2. Править только то, что попросили; проверить в dev-сервере на 1440 и 390 px.
3. Если пользователь хочет синхронизировать канвас — опубликовать в него изменённые файлы: Artifact publish с `url` канваса, `root` = `design`, `file_path` = абсолютный путь одного изменённого файла, остальные изменённые — в `files` (`"project/X.dc.html": "project/X.dc.html"`). `canvas.json` отправлять только при добавлении/удалении/перемещении артбордов.
4. Изображения из `assets/`: для сайта — положить в `public/` и ссылаться абсолютным путём (`/img/…`). Канвас понимает только загруженные в артефакт файлы (Artifact `upload_asset` → URL `/_blob/<id>`); если картинка должна быть и в канвасе — решить с пользователем, как совместить (например, подмена `/_blob/` → `/img/` при рендере в `render.ts`).

Инструменты «Artifact …» выше — инструменты Claude Code; другим агентам эти шаги нужно выполнять своими средствами или через пользователя.
