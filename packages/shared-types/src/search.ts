export type SearchResultType = 'job' | 'contact' | 'agreement' | 'inspection' | 'invoice';

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string | null;
}

export interface GlobalSearchResponse {
  query: string;
  results: SearchResultItem[];
}
