// src/app/eviromet.ts/base-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';

// Interfaces para las respuestas del backend
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

@Injectable({
  providedIn: 'root'
})
export class BaseApiService {
  // URL base de tu backend según el archivo txt
  protected readonly apiUrl = 'http://localhost:8000/api/v1';
  
  // Headers por defecto
  protected httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(protected http: HttpClient) {}

  // GET genérico - Adaptado para manejar respuestas directas del backend
  protected get<T>(endpoint: string, params?: any): Observable<T> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    const options = httpParams.keys().length > 0 ? 
      { ...this.httpOptions, params: httpParams } : 
      this.httpOptions;

    return this.http.get<T>(`${this.apiUrl}${endpoint}`, options)
      .pipe(
        retry(1),
        map(response => {
          // Tu backend a veces devuelve directamente los datos, otras veces con wrapper
          // Intentamos normalizar la respuesta
          if (this.isApiResponse(response)) {
            return response as T;
          }
          // Si no es un ApiResponse, creamos uno
          return {
            success: true,
            data: response,
            message: 'Datos obtenidos correctamente'
          } as unknown as T;
        }),
        catchError(this.handleError)
      );
  }

  // POST genérico - Adaptado para crear wrapper de respuesta si es necesario
  protected post<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}${endpoint}`, data, this.httpOptions)
      .pipe(
        retry(1),
        map(response => {
          if (this.isApiResponse(response)) {
            return response as T;
          }
          return {
            success: true,
            data: response,
            message: 'Creado correctamente'
          } as unknown as T;
        }),
        catchError(this.handleError)
      );
  }

  // PUT genérico - Adaptado para crear wrapper de respuesta si es necesario
  protected put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}${endpoint}`, data, this.httpOptions)
      .pipe(
        retry(1),
        map(response => {
          if (this.isApiResponse(response)) {
            return response as T;
          }
          return {
            success: true,
            data: response,
            message: 'Actualizado correctamente'
          } as unknown as T;
        }),
        catchError(this.handleError)
      );
  }

  // DELETE genérico - Adaptado para crear wrapper de respuesta
  protected delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}${endpoint}`, this.httpOptions)
      .pipe(
        retry(1),
        map(response => {
          if (this.isApiResponse(response)) {
            return response as T;
          }
          return {
            success: true,
            data: response,
            message: 'Eliminado correctamente'
          } as unknown as T;
        }),
        catchError(this.handleError)
      );
  }

  // Método helper para verificar si la respuesta tiene el formato ApiResponse
  private isApiResponse(response: any): boolean {
    return response && 
           typeof response === 'object' && 
           'success' in response && 
           'data' in response;
  }

  // Manejo de errores mejorado
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error desconocido';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      console.error(`Código de error: ${error.status}, Mensaje: ${error.message}`);
      
      // Verificar si el error tiene el formato de tu backend
      if (error.error && error.error.detail) {
        errorMessage = error.error.detail;
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else {
        switch (error.status) {
          case 400:
            errorMessage = 'Solicitud incorrecta';
            break;
          case 401:
            errorMessage = 'No autorizado';
            break;
          case 403:
            errorMessage = 'Acceso prohibido';
            break;
          case 404:
            errorMessage = 'Recurso no encontrado';
            break;
          case 422:
            errorMessage = 'Datos de entrada inválidos';
            break;
          case 500:
            errorMessage = 'Error interno del servidor';
            break;
          default:
            errorMessage = `Error ${error.status}: ${error.message}`;
        }
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}