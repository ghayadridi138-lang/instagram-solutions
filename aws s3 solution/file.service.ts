import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import imageCompression from 'browser-image-compression';
import { lastValueFrom, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  private baseUrl = environment.apiUrl + "/aws"; // Proxy assumed or full backend URL

  constructor(private http: HttpClient) { }

  // Compress and upload file
  async uploadFile(file: File): Promise<string> {
    try {
      // Compress the file (max size 0.5MB, max 1600px)
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });

      const formData = new FormData();
      formData.append('file', compressedFile);

      // Create HTTP request to track progress if needed
      const response = await lastValueFrom(
        this.http.post<{ key: string }>(`${this.baseUrl}/upload`, formData)
      );

      return response.key; // ⬅️ This is "users/profile.jpg" or similar
    } catch (error) {
      throw error;
    }
  }
  downloadFile(key: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/download/`, {
      params: { key },
      responseType: 'blob',             // very important for binary data
    });
  }

  getImageUrl(key: string): string {
    return `${this.baseUrl}/download?key=${encodeURIComponent(key)}`;
  }

  deleteFile(key: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete/${key}`);
  }
}
