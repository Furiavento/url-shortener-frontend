import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { API_BASE_URL } from './api-config';
import { Overview, UrlStats } from './api.models';

@Service()
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/api/analytics`;

  overview() {
    return this.http.get<Overview>(`${this.baseUrl}/overview`);
  }

  /** Without a range the API defaults to the last 30 days. */
  urlStats(id: number, range?: { from: Date; to: Date }) {
    let params = new HttpParams();
    if (range) {
      params = params.set('from', range.from.toISOString()).set('to', range.to.toISOString());
    }
    return this.http.get<UrlStats>(`${this.baseUrl}/urls/${id}`, { params });
  }
}
