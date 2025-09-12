import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DebugService {
  
  constructor(private http: HttpClient) {}

  /**
   * Probar conectividad con el backend
   */
  testConnection(): Observable<any> {
    console.log('🧪 Testing connection to:', environment.apiUrl);
    return this.http.get(`${environment.apiUrl}/`);
  }

  /**
   * Probar endpoint específico de reportes laborales
   */
  testWorkHoursEndpoint(): Observable<any> {
    console.log('🧪 Testing work hours endpoint:', `${environment.apiUrl}/reportes-laborales`);
    return this.http.get(`${environment.apiUrl}/reportes-laborales`);
  }

  /**
   * Probar endpoint de usuarios
   */
  testUsersEndpoint(): Observable<any> {
    console.log('🧪 Testing users endpoint:', `${environment.apiUrl}/usuarios`);
    return this.http.get(`${environment.apiUrl}/usuarios`);
  }

  /**
   * Verificar usuario actual en localStorage
   */
  checkCurrentUser(): any {
    const usuarioActual = localStorage.getItem('usuarioActual');
    console.log('👤 Usuario en localStorage:', usuarioActual);
    
    if (usuarioActual) {
      try {
        const parsed = JSON.parse(usuarioActual);
        console.log('👤 Usuario parsed:', parsed);
        console.log('🎫 Token presente:', !!parsed.access_token || !!parsed.token);
        return parsed;
      } catch (error) {
        console.error('❌ Error parsing usuario:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Log de todas las configuraciones importantes
   */
  logConfiguration(): void {
    console.group('🔧 CONFIGURACIÓN DE DEBUG');
    console.log('API URL:', environment.apiUrl);
    console.log('Production:', environment.production);
    console.log('Logging enabled:', environment.enableConsoleLogging);
    console.log('Detailed errors:', environment.enableDetailedErrors);
    console.log('Work Hours endpoint:', environment.apiUrl + environment.endpoints.workHours.clockIn);
    console.log('Auth endpoint:', environment.apiUrl + environment.endpoints.auth.login);
    console.groupEnd();

    console.group('👤 USUARIO ACTUAL');
    this.checkCurrentUser();
    console.groupEnd();
  }

  /**
   * Crear un reporte laboral de prueba
   */
  createTestWorkHours(usuarioId: number): Observable<any> {
    const testData = {
      usuario_id: usuarioId,
      fecha_asignacion: new Date().toISOString()
    };

    console.log('🧪 Creating test work hours:', testData);
    return this.http.post(`${environment.apiUrl}/reportes-laborales`, testData);
  }

  /**
   * Test completo de la aplicación
   */
  runFullDiagnostic(): void {
    console.group('🏥 DIAGNÓSTICO COMPLETO');
    
    // 1. Configuración
    this.logConfiguration();
    
    // 2. Test de conectividad básica
    this.testConnection().subscribe({
      next: (response) => {
        console.log('✅ Conexión básica OK:', response);
        
        // 3. Test de endpoint de usuarios
        this.testUsersEndpoint().subscribe({
          next: (users) => {
            console.log('✅ Endpoint usuarios OK:', users);
            
            // 4. Test de endpoint de reportes laborales
            this.testWorkHoursEndpoint().subscribe({
              next: (reports) => {
                console.log('✅ Endpoint reportes laborales OK:', reports);
              },
              error: (error) => {
                console.error('❌ Error en endpoint reportes laborales:', error);
              }
            });
          },
          error: (error) => {
            console.error('❌ Error en endpoint usuarios:', error);
          }
        });
      },
      error: (error) => {
        console.error('❌ Error en conexión básica:', error);
        console.error('🔍 Detalles del error:');
        console.error('- Status:', error.status);
        console.error('- StatusText:', error.statusText);
        console.error('- URL:', error.url);
        console.error('- Error body:', error.error);
      }
    });
    
    console.groupEnd();
  }
}