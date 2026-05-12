// apps/backend/src/games/rawg-proxy.ts

import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const RAWG_PROXY_URL =
  'https://playpulse-rawg-proxy.vercel.app/api/rawg';

export async function fetchFromRawgProxy(
  httpService: HttpService,
  endpoint: string,
  params?: Record<string, any>,
) {
  const cleanParams = Object.entries(
    params || {},
  ).reduce(
    (acc, [key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        acc[key] = value;
      }

      return acc;
    },
    {} as Record<string, any>,
  );

  const query = new URLSearchParams();

  Object.entries(cleanParams).forEach(
    ([key, value]) => {
      query.set(key, String(value));
    },
  );

  const url =
    `${RAWG_PROXY_URL}/${endpoint}?${query.toString()}`;

  console.log(
    '[RAWG PROXY REQUEST]',
    url,
  );

  try {
    const response = await firstValueFrom(
      httpService.get(url, {
        timeout: 15000,

        headers: {
          Accept: 'application/json',
        },
      }),
    );

    return response.data;
  } catch (error: any) {
    console.error(
      '[RAWG PROXY ERROR]',
    );

    console.error(
      'URL:',
      url,
    );

    console.error(
      'STATUS:',
      error?.response?.status,
    );

    console.error(
      'DATA:',
      error?.response?.data,
    );

    throw error;
  }
}

