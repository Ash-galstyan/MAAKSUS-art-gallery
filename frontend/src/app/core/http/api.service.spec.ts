// frontend/src/app/core/http/api.service.spec.ts
import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('get() unwraps the { data } envelope', async () => {
    const promise = service.get<{ id: string }>('/artworks/1');
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/artworks/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: { id: '1' } });
    expect(await promise).toEqual({ id: '1' });
  });

  it('get() forwards defined params and strips undefined/null/empty ones', async () => {
    const promise = service.get('/artworks', { q: 'sea', page: 2, empty: '', missing: undefined });
    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/artworks`,
    );
    expect(req.request.params.get('q')).toBe('sea');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.has('empty')).toBeFalse();
    expect(req.request.params.has('missing')).toBeFalse();
    req.flush({ data: [] });
    await promise;
  });

  it('get() sends no params object when none are given', async () => {
    const promise = service.get('/artworks');
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/artworks`);
    expect(req.request.params.keys().length).toBe(0);
    req.flush({ data: [] });
    await promise;
  });

  it('getPaginated() returns the raw { data, nextCursor } envelope', async () => {
    const promise = service.getPaginated<{ id: string }>('/artworks');
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/artworks`);
    req.flush({ data: [{ id: '1' }], nextCursor: 'abc' });
    expect(await promise).toEqual({ data: [{ id: '1' }], nextCursor: 'abc' });
  });

  it('post() sends the body and unwraps the response', async () => {
    const promise = service.post<{ name: string }, { id: string }>('/artists', { name: 'X' });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/artists`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'X' });
    req.flush({ data: { id: '9' } });
    expect(await promise).toEqual({ id: '9' });
  });

  it('patch() sends the body and unwraps the response', async () => {
    const promise = service.patch<{ name: string }, { id: string }>('/artists/9', { name: 'Y' });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/artists/9`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ data: { id: '9' } });
    expect(await promise).toEqual({ id: '9' });
  });

  it('del() resolves to undefined', async () => {
    const promise = service.del('/artists/9');
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/artists/9`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(await promise).toBeUndefined();
  });

  it('postForm() sends FormData and forwards query params', async () => {
    const fd = new FormData();
    fd.append('file', new Blob(['x']));
    const promise = service.postForm<{ id: string }>('/artworks/1/images', fd, { primary: true });
    const req = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/artworks/1/images`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe(fd);
    expect(req.request.params.get('primary')).toBe('true');
    req.flush({ data: { id: 'img-1' } });
    expect(await promise).toEqual({ id: 'img-1' });
  });
});
