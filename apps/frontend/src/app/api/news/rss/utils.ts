// app/api/news/rss/utils.ts
import { DOMParser } from '@xmldom/xmldom';

export interface RssItem {
  id: string;
  title: string;
  description: string;
  content: string;
  link: string;
  pubDate: string;
  image: string;
  source: string;
  sourceUrl: string;
  category: string;
}

export interface RssSource {
  id: string;
  name: string;
  url: string;
  isEnabled: boolean;
  isDefault: boolean;
  category: string;
}

/**
 * 🔥 Node.js-совместимый парсер через @xmldom/xmldom
 */
export function parseRssXml(xml: string, sourceName: string, sourceUrl: string): RssItem[] {
  const items: RssItem[] = [];
  
  try {
    // 🔹 Используем xmldom вместо браузерного DOMParser
    const parser = new DOMParser({
      errorHandler: {
        warning: () => {},
        error: () => {},
        fatalError: () => {},
      },
    });
    
    const doc = parser.parseFromString(xml, 'text/xml');
    
    // Проверка на ошибки парсинга
    const parseError = doc.getElementsByTagName('parsererror')[0];
    if (parseError) {
      console.error(`[RSS Parser] Error for ${sourceName}:`, parseError.textContent);
      return [];
    }
    
    // Получаем все item/entry элементы
    const entries = doc.getElementsByTagName('item');
    
    for (let i = 0; i < entries.length; i++) {
      try {
        const entry = entries[i];
        
        // === ЗАГОЛОВОК (обязательное поле) ===
        const titleEl = entry.getElementsByTagName('title')[0];
        const title = titleEl?.textContent?.trim();
        if (!title) continue;
        
        // === ССЫЛКА (обязательное поле) ===
        const linkEl = entry.getElementsByTagName('link')[0];
        let link = linkEl?.textContent?.trim();
        if (!link) {
          // Пробуем атрибут href для Atom
          const href = linkEl?.getAttribute('href');
          if (href) link = href.trim();
          else continue;
        }
        
        // === ОПИСАНИЕ ===
        const descEl = entry.getElementsByTagName('description')[0] 
          || entry.getElementsByTagName('summary')[0];
        let description = descEl?.textContent?.trim() || '';
        // Очищаем от HTML для краткого превью
        description = description.replace(/<[^>]*>/g, '').slice(0, 300) + (description.length > 300 ? '...' : '');
        
        // === ПОЛНЫЙ КОНТЕНТ ===
        const contentEl = entry.getElementsByTagName('content:encoded')[0] 
          || entry.getElementsByTagName('content')[0];
        const content = contentEl?.textContent?.trim() || description;
        
        // === ДАТА ПУБЛИКАЦИИ ===
        const dateEl = entry.getElementsByTagName('pubDate')[0] 
          || entry.getElementsByTagName('published')[0]
          || entry.getElementsByTagName('updated')[0];
        let pubDate = new Date().toISOString();
        if (dateEl?.textContent) {
          const parsed = new Date(dateEl.textContent.trim());
          if (!isNaN(parsed.getTime())) {
            pubDate = parsed.toISOString();
          }
        }
        
        // === ИЗОБРАЖЕНИЕ (поддержка разных форматов) ===
        let image = '';
        
        // 1. media:thumbnail
        const mediaThumb = entry.getElementsByTagName('media:thumbnail')[0];
        if (mediaThumb?.getAttribute('url')) {
          image = mediaThumb.getAttribute('url')!.trim();
        }
        // 2. media:content
        else if (entry.getElementsByTagName('media:content')[0]?.getAttribute('url')) {
          image = entry.getElementsByTagName('media:content')[0]!.getAttribute('url')!.trim();
        }
        // 3. enclosure (как в cubiq.ru)
        else {
          const enclosures = entry.getElementsByTagName('enclosure');
          for (let j = 0; j < enclosures.length; j++) {
            const type = enclosures[j].getAttribute('type');
            if (type?.startsWith('image/')) {
              image = enclosures[j].getAttribute('url')!.trim();
              break;
            }
          }
        }
        // 4. Ищем <img> в content/description
        if (!image) {
          const imgMatch = (content || description).match(/<img[^>]+src=["']([^"'>]+)["']/i);
          if (imgMatch?.[1]) {
            image = imgMatch[1].trim();
          }
        }
        
        // === КАТЕГОРИЯ ===
        const categoryEl = entry.getElementsByTagName('category')[0];
        const category = categoryEl?.textContent?.trim().toLowerCase() || 'general';
        
        // === УНИКАЛЬНЫЙ ID ===
        const guidEl = entry.getElementsByTagName('guid')[0];
        const id = guidEl?.textContent?.trim() || `${sourceName}-${i}-${Date.now()}`;
        
        items.push({
          id,
          title,
          description,
          content,
          link,
          pubDate,
          image,
          source: sourceName,
          sourceUrl: sourceUrl.trim(),
          category,
        });
      } catch (itemError) {
        console.warn(`[RSS Parser] Failed item ${i} from ${sourceName}:`, itemError);
        continue;
      }
    }
    
    return items;
  } catch (error: any) {
    console.error(`[RSS Parser] Critical error for ${sourceName}:`, error.message);
    return [];
  }
}

/**
 * 🔥 Надёжный фетчинг с обходом блокировок
 */
export async function fetchRssFeed(url: string, sourceName: string): Promise<RssItem[]> {
  try {
    const cleanUrl = url.trim();
    
    // 🔹 Пробуем прямой запрос с правильными заголовками (без прокси)
    // Многие сайты разрешают запросы с правильным User-Agent
    const response = await fetch(cleanUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      signal: AbortSignal.timeout(15000), // 15 секунд таймаут
      cache: 'no-store',
    });
    
    if (!response.ok) {
      // 🔹 Если прямой запрос не удался — пробуем прокси как фолбэк
      console.warn(`[RSS Fetch] Direct fetch failed for ${sourceName}: ${response.status}, trying proxy...`);
      
      const proxies = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://cors.bridged.cc?url=',
      ];
      
      for (const proxy of proxies) {
        try {
          const proxyResponse = await fetch(proxy + encodeURIComponent(cleanUrl), {
            headers: {
              'Accept': 'application/rss+xml, application/xml, text/xml',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            signal: AbortSignal.timeout(10000),
          });
          
          if (proxyResponse.ok) {
            const xml = await proxyResponse.text();
            if (xml && xml.length > 50) {
              return parseRssXml(xml, sourceName, cleanUrl);
            }
          }
        } catch {
          continue; // Пробуем следующий прокси
        }
      }
      
      throw new Error(`All proxies failed for ${sourceName}`);
    }
    
    const xml = await response.text();
    
    if (!xml || xml.length < 50) {
      throw new Error('Empty or invalid RSS response');
    }
    
    return parseRssXml(xml, sourceName, cleanUrl);
  } catch (error: any) {
    console.error(`[RSS Fetch] Failed to fetch ${sourceName}:`, error.message);
    return [];
  }
}

/**
 * 🔹 Дефолтные источники
 */
export const DEFAULT_SOURCES: RssSource[] = [
  { 
    id: 'stopgame', 
    name: 'StopGame', 
    url: 'http://stopgame.ru/rss.php', 
    isEnabled: true, 
    isDefault: true, 
    category: 'Gaming' 
  },
  { 
    id: 'cubiq', 
    name: 'Cubiq', 
    url: 'https://cubiq.ru/news/feed/', 
    isEnabled: true, 
    isDefault: true, 
    category: 'Tech' 
  },
  { 
    id: 'goha', 
    name: 'GoHa.Ru', 
    url: 'https://www.goha.ru/rss/news', 
    isEnabled: true, 
    isDefault: true, 
    category: 'Gaming' 
  },
  { 
    id: 'iguides', 
    name: 'iGuides', 
    url: 'https://www.iguides.ru/main/rss/', 
    isEnabled: true, 
    isDefault: true, 
    category: 'Tech' 
  },
  { 
    id: 'dtf', 
    name: 'DTF', 
    url: 'https://dtf.ru/rss', 
    isEnabled: true, 
    isDefault: true, 
    category: 'Gaming' 
  },
];