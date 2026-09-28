import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { API_BASE_URL } from './api-config';
import {
  CreateUrlRequest,
  ListUrlsQuery,
  PaginatedUrls,
  ShortUrl,
  UpdateUrlRequest,
} from './api.models';

@Service()
export class UrlsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/api/urls`;

  list({ page, limit, search }: ListUrlsQuery) {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<PaginatedUrls>(this.baseUrl, { params });
  }

  get(id: number) {
    return this.http.get<ShortUrl>(`${this.baseUrl}/${id}`);
  }

  create(body: CreateUrlRequest) {
    return this.http.post<ShortUrl>(this.baseUrl, body);
  }

  update(id: number, body: UpdateUrlRequest) {
    return this.http.patch<ShortUrl>(`${this.baseUrl}/${id}`, body);
  }

  remove(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
