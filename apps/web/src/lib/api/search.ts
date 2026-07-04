import type { GlobalSearchResponse } from '@sitescop/shared-types';
import { apiRequest } from '../api-client';

export const searchApi = {
  global: (q: string) => {
    const query = new URLSearchParams({ q });
    return apiRequest<GlobalSearchResponse>(`/api/v1/search?${query}`);
  },
};
