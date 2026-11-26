import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomSchedule } from '../../models/schedule.model';
import { ArService } from '../../services/ar.service';
import { ScheduleOverlayComponent } from './schedule-overlay.component';

describe('ScheduleOverlayComponent', () => {
  const roomSchedule: RoomSchedule = {
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
      {
        day: 'miercoles',
        start_time: '10:00',
        end_time: '12:00',
        subject: 'Física II',
        teacher: 'Prof. Martínez',
      },
    ],
  };

  let fixture: ComponentFixture<ScheduleOverlayComponent>;
  let currentSchedule: WritableSignal<RoomSchedule | null>;
  let loading: WritableSignal<boolean>;
  let error: WritableSignal<string | null>;

  beforeEach(async () => {
    currentSchedule = signal(null);
    loading = signal(false);
    error = signal(null);

    await TestBed.configureTestingModule({
      imports: [ScheduleOverlayComponent],
      providers: [{ provide: ArService, useValue: { currentSchedule, loading, error } }],
    }).compileComponents();

    fixture = TestBed.createComponent(ScheduleOverlayComponent);
    fixture.detectChanges();
  });

  it('permanece oculto cuando no hay detección ni error', () => {
    expect(fixture.nativeElement.querySelector('.schedule-overlay')).toBeNull();
  });

  it('muestra el estado de carga cuando aún no hay horario', () => {
    loading.set(true);
    fixture.detectChanges();

    const status = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(status.textContent).toContain('Cargando horario...');
    expect(fixture.nativeElement.querySelector('ion-card')).toBeNull();
  });

  it('muestra el salón y la tabla semanal completa', () => {
    currentSchedule.set(roomSchedule);
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.schedule-overlay') as HTMLElement;
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(overlay.getAttribute('aria-label')).toBe('Horario de Salón 101');
    expect(overlay.textContent).toContain('Salón 101');
    expect(overlay.textContent).toContain('Bloque A');
    expect(overlay.textContent).toContain('Capacidad: 30');
    expect(overlay.textContent).toContain('Horario semanal');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Lunes');
    expect(rows[0].textContent).toContain('07:00–09:00');
    expect(rows[0].textContent).toContain('Cálculo I');
    expect(rows[0].textContent).toContain('Prof. García');
    expect(rows[1].textContent).toContain('Miércoles');
    expect(rows[1].textContent).toContain('Física II');
  });

  it('se oculta al perder el marcador', () => {
    currentSchedule.set(roomSchedule);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.schedule-overlay')).not.toBeNull();

    currentSchedule.set(null);
    loading.set(false);
    error.set(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.schedule-overlay')).toBeNull();
  });

  it('muestra un error accesible cuando no hay horario disponible', () => {
    error.set('El salón detectado no está registrado.');
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain('El salón detectado no está registrado.');
  });

  it('conserva el horario cacheado y muestra el aviso de conexión', () => {
    currentSchedule.set(roomSchedule);
    error.set('Sin conexión — datos del último acceso');
    fixture.detectChanges();

    const notice = fixture.nativeElement.querySelector('.schedule-overlay__notice') as HTMLElement;
    expect(notice.textContent).toContain('Sin conexión — datos del último acceso');
    expect(fixture.nativeElement.querySelector('ion-card-title')?.textContent).toContain('Salón 101');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('informa cuando el salón aún no tiene horarios', () => {
    currentSchedule.set({ ...roomSchedule, schedule: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No hay horarios registrados para este salón.',
    );
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });
});
