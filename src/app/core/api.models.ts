// Mirrors `components.schemas` from the API's OpenAPI document (/api/docs-json).

export type UserRole = 'user' | 'admin';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
  user: PublicUser;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ShortUrl {
  id: number;
  code: string;
  originalUrl: string;
  clicks: number;
  createdAt: string;
  updatedAt: string;
  /** `null` when the link never expires. */
  expiresAt: string | null;
  shortUrl: string;
}

export interface PaginatedUrls {
  items: ShortUrl[];
  total: number;
  page: number;
  limit: number;
}

export interface ListUrlsQuery {
  page: number;
  limit: number;
  search?: string;
}

export interface CreateUrlRequest {
  url: string;
  alias?: string;
  expiresAt?: string;
}

export interface UpdateUrlRequest {
  url?: string;
  /** `null` removes the expiration. */
  expiresAt?: string | null;
}

export interface DailyClicks {
  /** UTC day, `YYYY-MM-DD`. */
  date: string;
  clicks: number;
}

export interface Breakdown {
  label: string;
  clicks: number;
}

export interface TopUrl {
  id: number;
  code: string;
  shortUrl: string;
  originalUrl: string;
  clicks: number;
}

export interface Overview {
  totalUrls: number;
  totalClicks: number;
  clicksLast30Days: number;
  topUrls: TopUrl[];
  clicksByDay: DailyClicks[];
}

export interface UrlStats {
  from: string;
  to: string;
  totalClicks: number;
  clicksByDay: DailyClicks[];
  topReferrers: Breakdown[];
  browsers: Breakdown[];
  os: Breakdown[];
  devices: Breakdown[];
}
