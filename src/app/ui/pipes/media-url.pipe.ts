import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Resuelve la URL de una imagen subida (`/api/uploads/...`) contra el backend.
 * En Docker la API está en el mismo origen (proxy de nginx) y no cambia nada;
 * en desarrollo (`ng serve`) apunta a `http://localhost:3000`.
 */
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('/api/') && /^https?:\/\//.test(environment.apiUrl)) {
    return environment.apiUrl.replace(/\/api\/?$/, '') + url;
  }
  return url;
}

@Pipe({ name: 'mediaUrl', standalone: true })
export class MediaUrlPipe implements PipeTransform {
  transform(url: string | null | undefined): string {
    return mediaUrl(url);
  }
}
