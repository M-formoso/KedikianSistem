import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  constructor(private http: HttpClient) {}

  // Obtener la ubicación actual
  getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('La geolocalización no está disponible en este dispositivo');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp)
          };
          resolve(locationData);
        },
        (error) => {
          let errorMessage;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'El usuario denegó la solicitud de geolocalización';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'La información de ubicación no está disponible';
              break;
            case error.TIMEOUT:
              errorMessage = 'Se agotó el tiempo de espera para obtener la ubicación';
              break;
            default:
              errorMessage = 'Error desconocido al obtener la ubicación';
          }
          reject(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  // Registrar la ubicación en el servidor junto con la información de fichaje
  registerClockInWithLocation(clockInData: any): Observable<any> {
    return this.getCurrentLocation()
      .then(location => {
        // Añadir información de ubicación a los datos de fichaje
        const dataWithLocation = {
          ...clockInData,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            timestamp: location.timestamp
          }
        };
        
        // Enviar al servidor (reemplazar con tu URL de API)
        return this.http.post<any>('/api/clock-in', dataWithLocation);
      })
      .catch(error => {
        console.error('Error al obtener la ubicación:', error);
        // Opcionalmente, proceder sin ubicación o manejar el error
        return of({ error: 'No se pudo obtener la ubicación', clockInData });
      });
  }

  // Verificar si el operario está en la ubicación de trabajo
  isOperatorInWorkArea(coordinates: LocationData, workAreaRadius: number = 100): Observable<boolean> {
    // Coordenadas predefinidas de la zona de trabajo (ejemplo: oficina central)
    const workAreas = [
      { name: 'Construcción Ruta 68', latitude: -33.4400, longitude: -70.6500, radius: 500 },
      { name: 'Extracción Cantera Norte', latitude: -33.4100, longitude: -70.6200, radius: 300 },
      { name: 'Mantención Maquinaria', latitude: -33.4300, longitude: -70.6400, radius: 100 }
    ];

    return this.getCurrentLocation()
      .then(location => {
        // Comprobar si está en alguna de las áreas de trabajo
        for (const area of workAreas) {
          const distance = this.calculateDistance(
            location.latitude, 
            location.longitude,
            area.latitude,
            area.longitude
          );
          
          if (distance <= area.radius) {
            return of(true);
          }
        }
        return of(false);
      })
      .catch(error => {
        console.error('Error al verificar ubicación:', error);
        return of(false);
      });
  }

  // Calcular distancia entre dos coordenadas en metros (fórmula Haversine)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distancia en metros
    
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}