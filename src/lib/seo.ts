/**
 * SEO settings and per-page metadata (titles, descriptions, keywords, structured data).
 * Domain: `site` in astro.config.mjs — canonical, sitemap.xml and robots.txt are built from it.
 */

export const SITE = {
  name: 'Kafka',
  /** Default description (home page and pages without their own). */
  description:
    'Kafka помогает ресторанам и кафе в Казахстане получать больше прямых заказов: своё приложение и QR-меню, AI-ассистент в WhatsApp, доставка, агрегаторы и программа лояльности. Работает с iiko и r_keeper.',
  /** Sharing image, 1200×630 (regenerate: node scripts/og.mjs). */
  ogImage: '/og.png',
  logo: '/logo.png',
  /**
   * Ownership confirmation: content of the meta tag from
   * Google Search Console (google-site-verification) and Yandex Webmaster (yandex-verification).
   * Empty — the tag is not output.
   */
  googleVerification: '',
  yandexVerification: '',
  /** Yandex Metrica counter number; empty — the counter is not connected. */
  yandexMetrikaId: '',
  /** Contacts (also hard-coded in the footers of design/project/*.dc.html — change both). */
  phone: '+77475557604',
  email: 'info@kafka.kz',
  address: {
    streetAddress: 'пр. Назарбаева, 119',
    addressLocality: 'Алматы',
    addressCountry: 'KZ',
  },
};

export interface Crumb {
  name: string;
  path: string;
}

export interface PageMeta {
  /** Site path without trailing slash. */
  path: string;
  /** Artboard in design/project/ (without .dc.html). */
  file: string;
  title: string;
  description: string;
  keywords?: string;
  breadcrumbs?: Crumb[];
  /** Output FAQPage markup from `faq` ([{q, a}]) in the artboard's renderVals() — only if the FAQ is visible on the page. */
  faqSchema?: boolean;
  /** Extra JSON-LD nodes for the page. */
  schema?: object[];
}

const home: Crumb = { name: 'Главная', path: '/' };
const integrations: Crumb = { name: 'Интеграции', path: '/integrations' };

export const HOME: Omit<PageMeta, 'file'> = {
  path: '/',
  faqSchema: true,
  title: 'Kafka — приложение, доставка и лояльность для ресторанов',
  description: SITE.description,
  keywords:
    'приложение для ресторана, приложение для кафе, автоматизация ресторана, программа лояльности для ресторана, доставка для ресторана, QR-меню, WhatsApp-бот для заказов, агрегаторы Wolt Glovo Яндекс Еда Choco, интеграция iiko, интеграция r_keeper, CRM для ресторана, Казахстан, Алматы, Астана',
};

export const PAGES: PageMeta[] = [
  {
    path: '/products',
    file: 'Products',
    title: 'Модули Kafka — приложение, WhatsApp-бот, агрегаторы, CRM',
    description:
      'Модули Kafka для ресторанов и кафе: мобильное приложение и QR-меню, AI-бот для заказов в WhatsApp и Telegram, агрегаторы в одном окне, доставка, CRM, лояльность, бэк-офис и 1С.',
    keywords: 'приложение для ресторана, QR-меню, WhatsApp-бот для заказов, Telegram-бот, CRM для ресторана, программа лояльности, доставка, Казахстан',
    breadcrumbs: [home, { name: 'Продукты', path: '/products' }],
  },
  {
    path: '/integrations',
    file: 'Integrations',
    title: 'Интеграции Kafka — r_keeper, iiko, 1С, Poster, агрегаторы',
    description:
      'Kafka подключается к r_keeper, iiko, 1С и Poster, агрегаторам Wolt, Glovo, Yandex Eats и Choco, к TipTopPay, Webkassa, WhatsApp и Telegram. Без смены кассы.',
    keywords: 'интеграция r_keeper, интеграция rkeeper, интеграция iiko, интеграция 1С, интеграция Poster, интеграция Wolt, Glovo, Yandex Eats, Choco, Webkassa',
    breadcrumbs: [home, integrations],
  },
  {
    path: '/integrations/rkeeper',
    file: 'IntegrationRkeeper',
    title: 'Интеграция r_keeper (R-Keeper) с доставкой и агрегаторами — Kafka',
    description:
      'Интеграция r_keeper с приложением, сайтом, WhatsApp-ботом и агрегаторами Wolt, Glovo, Yandex Eats, Choco. Заказы сразу в кассу, единое меню и стоп-лист. Запуск от 3 дней.',
    keywords:
      'интеграция r_keeper, интеграция rkeeper, интеграция r-keeper, r_keeper доставка, r_keeper агрегаторы, r_keeper Wolt, r_keeper Glovo, r_keeper Yandex Eats, r_keeper приложение, r_keeper Казахстан, ркипер интеграция',
    breadcrumbs: [home, integrations, { name: 'r_keeper', path: '/integrations/rkeeper' }],
    faqSchema: true,
    schema: [
      {
        '@type': 'Service',
        name: 'Интеграция с r_keeper',
        serviceType: 'Интеграция кассы r_keeper с каналами продаж и агрегаторами',
        description:
          'Подключение кассы r_keeper (R-Keeper) к приложению, сайту, QR-меню, WhatsApp- и Telegram-боту и агрегаторам Wolt, Glovo, Yandex Eats и Choco: заказы автоматически попадают в кассу, меню и стоп-лист синхронизируются.',
        areaServed: { '@type': 'Country', name: 'Казахстан' },
      },
    ],
  },
  {
    path: '/cases',
    file: 'Cases',
    title: 'Кейсы Kafka — результаты ресторанов и кафе',
    description:
      'Как кафе, рестораны, кофейни и дарк-китчены в Казахстане растят заказы в собственных каналах и снижают расходы на агрегаторы с Kafka.',
    breadcrumbs: [home, { name: 'Кейсы', path: '/cases' }],
  },
  {
    path: '/pricing',
    file: 'Pricing',
    title: 'Тарифы Kafka — стоимость платформы для ресторана',
    description:
      'Тарифы Kafka Старт, Рост и Сеть: фиксированная подписка за модули и точки без комиссии с заказа. Посчитайте стоимость для своего заведения.',
    keywords: 'стоимость приложения для ресторана, тарифы, цена интеграции r_keeper, цена интеграции iiko, подписка',
    breadcrumbs: [home, { name: 'Тарифы', path: '/pricing' }],
    faqSchema: true,
  },
  {
    path: '/partners',
    file: 'Partners',
    title: 'Партнёрская программа Kafka для дилеров и интеграторов',
    description:
      'Партнёрская программа Kafka для дилеров r_keeper и iiko, интеграторов и агентств: вознаграждение за подключённые заведения и поддержка внедрений.',
    breadcrumbs: [home, { name: 'Партнёрам', path: '/partners' }],
  },
];

export const abs = (path: string, site: URL) => new URL(path, site).href.replace(/\/$/, path === '/' ? '/' : '');

/** JSON-LD for a page: organization + website on every page, breadcrumbs, FAQ and extra nodes. */
export function pageSchema(
  site: URL,
  page: Pick<PageMeta, 'path' | 'breadcrumbs' | 'schema'>,
  faq?: { q: string; a: string }[],
) {
  const orgId = abs('/', site) + '#organization';
  const graph: object[] = [
    {
      '@type': 'Organization',
      '@id': orgId,
      name: SITE.name,
      url: abs('/', site),
      logo: abs(SITE.logo, site),
      description: SITE.description,
      areaServed: { '@type': 'Country', name: 'Казахстан' },
      telephone: SITE.phone,
      email: SITE.email,
      address: { '@type': 'PostalAddress', ...SITE.address },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'sales',
        telephone: SITE.phone,
        email: SITE.email,
        areaServed: 'KZ',
        availableLanguage: ['ru', 'kk'],
      },
    },
    {
      '@type': 'WebSite',
      '@id': abs('/', site) + '#website',
      name: SITE.name,
      url: abs('/', site),
      inLanguage: 'ru',
      publisher: { '@id': orgId },
    },
  ];
  if (page.breadcrumbs?.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: page.breadcrumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: abs(c.path, site),
      })),
    });
  }
  if (faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }
  for (const node of page.schema ?? []) graph.push({ provider: { '@id': orgId }, url: abs(page.path, site), ...node });
  return { '@context': 'https://schema.org', '@graph': graph };
}
