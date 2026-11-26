import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, NgZone, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, finalize, switchMap, tap } from 'rxjs';

import { Room, RoomSchedule } from '../models/schedule.model';

@Injectable({ providedIn: 'root' })
export class ArService {
  private readonly http = inject(HttpClient);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly apiUrl = 'https://webar-matrices-binarias-production.up.railway.app';
  private readonly detections = new Subject<string | null>();
  private readonly cache = new Map<string, RoomSchedule>();
  private activeMarkerId: string | null = null;
  private warmedUp = false;

  readonly currentSchedule = signal<RoomSchedule | null>(null);
  readonly detectedRoom = signal<Room | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  constructor() {
    this.detections.pipe(
      switchMap(markerId => markerId ? this.fetchSchedule(markerId) : EMPTY),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  warmup(): void {
    if (this.warmedUp) return;
    this.warmedUp = true;

    this.http.get<RoomSchedule>(`${this.apiUrl}/api/rooms/pattern-101/schedule`).pipe(
      catchError(() => EMPTY),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(schedule => this.cache.set('pattern-101', schedule));
  }

  markerFound(salon: string): void {
    this.ngZone.runOutsideAngular(() => {
      const markerId = `pattern-${salon}`;
      const cached = this.cache.get(markerId);

      this.activeMarkerId = markerId;
      this.errorState.set(null);
      this.loadingState.set(true);
      this.currentSchedule.set(cached ?? null);
      this.detectedRoom.set(cached?.room ?? null);
      this.detections.next(markerId);
    });
  }

  markerLost(): void {
    this.ngZone.runOutsideAngular(() => {
      this.activeMarkerId = null;
      this.loadingState.set(false);
      this.errorState.set(null);
      this.currentSchedule.set(null);
      this.detectedRoom.set(null);
      this.detections.next(null);
    });
  }

  private fetchSchedule(markerId: string): Observable<RoomSchedule> {
    return this.http.get<RoomSchedule>(`${this.apiUrl}/api/rooms/${markerId}/schedule`).pipe(
      tap(schedule => {
        if (markerId !== this.activeMarkerId) return;

        this.cache.set(markerId, schedule);
        this.currentSchedule.set(schedule);
        this.detectedRoom.set(schedule.room);
        this.errorState.set(null);
      }),
      catchError((error: HttpErrorResponse) => {
        if (markerId !== this.activeMarkerId) return EMPTY;

        const cached = this.cache.get(markerId);
        const canUseCache = Boolean(cached) && (error.status === 0 || error.status >= 500);

        if (canUseCache && cached) {
          this.currentSchedule.set(cached);
          this.detectedRoom.set(cached.room);
          this.errorState.set('Sin conexión — datos del último acceso');
        } else {
          this.currentSchedule.set(null);
          this.detectedRoom.set(null);
          this.errorState.set(this.messageFor(error));
        }

        return EMPTY;
      }),
      finalize(() => {
        if (markerId === this.activeMarkerId) {
          this.loadingState.set(false);
        }
      }),
    );
  }

  private messageFor(error: HttpErrorResponse): string {
    if (error.status === 0) return 'Sin conexión. No se pudo cargar el horario.';
    if (error.status === 400) return 'El marcador detectado no es válido.';
    if (error.status === 404) return 'El salón detectado no está registrado.';
    return 'No se pudo cargar el horario. Inténtalo de nuevo.';
  }
}
