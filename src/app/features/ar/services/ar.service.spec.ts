import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { RoomSchedule } from '../models/schedule.model';
import { ArService } from './ar.service';

describe('ArService', () => {
  const endpoint = 'https://webar-matrices-binarias-production.up.railway.app/api/rooms';
  const schedule101: RoomSchedule = {
    room: {
      id: 1,
      name: 'Salón 101',
      pattern_marker_id: 'pattern-101',
      barcode_value: null,
      block: 'Bloque A',
      capacity: 30,
    },
    schedule: [
      {
        day: 'lunes',
        start_time: '07:00',
        end_time: '09:00',
        subject: 'Cálculo I',
        teacher: 'Prof. García',
      },
    ],
  };
  const schedule201: RoomSchedule = {
    room: { ...schedule101.room, id: 2, name: 'Salón 201', pattern_marker_id: 'pattern-201' },
    schedule: [],
  };

  let service: ArService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ArService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('inicia sin horario, salón, carga ni error', () => {
    expect(service.currentSchedule()).toBeNull();
    expect(service.detectedRoom()).toBeNull();
    expect(service.loading()).toBeFalse();
    expect(service.error()).toBeNull();
  });

  it('precalienta Railway una sola vez y deja el salón 101 en caché', () => {
    service.warmup();
    service.warmup();

    const request = httpMock.expectOne(`${endpoint}/pattern-101/schedule`);
    request.flush(schedule101);

    service.markerFound('101');
    expect(service.currentSchedule()).toEqual(schedule101);
    const refresh = httpMock.expectOne(`${endpoint}/pattern-101/schedule`);
    service.markerLost();
    expect(refresh.cancelled).toBeTrue();
  });

  it('consulta el Pattern fuera de NgZone y actualiza las señales con la respuesta', () => {
    const zone = TestBed.inject(NgZone);
    const runOutsideAngular = spyOn(zone, 'runOutsideAngular').and.callThrough();

    service.markerFound('101');

    expect(runOutsideAngular).toHaveBeenCalled();
    expect(service.loading()).toBeTrue();
    const request = httpMock.expectOne(`${endpoint}/pattern-101/schedule`);
    expect(request.request.method).toBe('GET');

    request.flush(schedule101);

    expect(service.currentSchedule()).toEqual(schedule101);
    expect(service.detectedRoom()).toEqual(schedule101.room);
    expect(service.loading()).toBeFalse();
    expect(service.error()).toBeNull();
  });

  it('cancela la consulta y limpia las señales cuando se pierde el marcador', () => {
    service.markerFound('101');
    const request = httpMock.expectOne(`${endpoint}/pattern-101/schedule`);

    service.markerLost();

    expect(request.cancelled).toBeTrue();
    expect(service.currentSchedule()).toBeNull();
    expect(service.detectedRoom()).toBeNull();
    expect(service.loading()).toBeFalse();
    expect(service.error()).toBeNull();
  });

  it('cancela la consulta anterior cuando cambia el salón detectado', () => {
    service.markerFound('101');
    const firstRequest = httpMock.expectOne(`${endpoint}/pattern-101/schedule`);

    service.markerFound('201');

    expect(firstRequest.cancelled).toBeTrue();
    expect(service.loading()).toBeTrue();
    const secondRequest = httpMock.expectOne(`${endpoint}/pattern-201/schedule`);
    secondRequest.flush(schedule201);

    expect(service.currentSchedule()).toEqual(schedule201);
    expect(service.detectedRoom()).toEqual(schedule201.room);
    expect(service.loading()).toBeFalse();
  });

  it('muestra un mensaje amigable cuando el salón no existe', () => {
    service.markerFound('999');
    const request = httpMock.expectOne(`${endpoint}/pattern-999/schedule`);

    request.flush({ message: 'Room not found' }, { status: 404, statusText: 'Not Found' });

    expect(service.currentSchedule()).toBeNull();
    expect(service.detectedRoom()).toBeNull();
    expect(service.error()).toBe('El salón detectado no está registrado.');
    expect(service.loading()).toBeFalse();
  });

  it('muestra un mensaje amigable cuando el marcador es inválido', () => {
    service.markerFound('abc');
    const request = httpMock.expectOne(`${endpoint}/pattern-abc/schedule`);

    request.flush({ message: 'Invalid marker' }, { status: 400, statusText: 'Bad Request' });

    expect(service.error()).toBe('El marcador detectado no es válido.');
    expect(service.loading()).toBeFalse();
  });

  it('reutiliza la caché del mismo marcador si falla la red', () => {
    service.markerFound('101');
    httpMock.expectOne(`${endpoint}/pattern-101/schedule`).flush(schedule101);
    service.markerLost();

    service.markerFound('101');

    expect(service.currentSchedule()).toEqual(schedule101);
    expect(service.detectedRoom()).toEqual(schedule101.room);
    const retry = httpMock.expectOne(`${endpoint}/pattern-101/schedule`);
    retry.flush('Network error', { status: 0, statusText: 'Unknown Error' });

    expect(service.currentSchedule()).toEqual(schedule101);
    expect(service.detectedRoom()).toEqual(schedule101.room);
    expect(service.error()).toBe('Sin conexión — datos del último acceso');
    expect(service.loading()).toBeFalse();
  });
});
