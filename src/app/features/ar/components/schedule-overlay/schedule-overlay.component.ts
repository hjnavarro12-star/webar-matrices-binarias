import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { ScheduleEntry } from '../../models/schedule.model';
import { ArService } from '../../services/ar.service';

@Component({
  selector: 'app-schedule-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule],
  template: `
    @if (loading() && !schedule()) {
      <section class="schedule-overlay schedule-overlay--status" role="status" aria-live="polite">
        <ion-spinner name="crescent" aria-hidden="true"></ion-spinner>
        <p>Cargando horario...</p>
      </section>
    } @else if (schedule(); as roomSchedule) {
      <section
        class="schedule-overlay"
        role="region"
        [attr.aria-label]="'Horario de ' + roomSchedule.room.name"
      >
        @if (error()) {
          <p class="schedule-overlay__notice" role="status">{{ error() }}</p>
        }

        <ion-card class="schedule-card">
          <ion-card-header>
            <ion-card-title>{{ roomSchedule.room.name }}</ion-card-title>
            <p class="schedule-card__meta">
              {{ roomSchedule.room.block }}
              @if (roomSchedule.room.capacity) {
                · Capacidad: {{ roomSchedule.room.capacity }}
              }
            </p>
          </ion-card-header>

          <ion-card-content>
            @if (roomSchedule.schedule.length) {
              <div
                class="schedule-overlay__table"
                tabindex="0"
                role="region"
                aria-label="Tabla de horario semanal"
              >
                <table>
                  <caption>Horario semanal</caption>
                  <colgroup>
                    <col class="col-day" />
                    <col class="col-time" />
                    <col class="col-subject" />
                    <col class="col-teacher" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">Día</th>
                      <th scope="col">Hora</th>
                      <th scope="col">Materia</th>
                      <th scope="col">Docente</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (entry of roomSchedule.schedule; track $index) {
                      <tr>
                        <td>{{ dayLabels[entry.day] }}</td>
                        <td>{{ entry.start_time }}–{{ entry.end_time }}</td>
                        <td>{{ entry.subject }}</td>
                        <td>{{ entry.teacher }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p class="schedule-overlay__empty">No hay horarios registrados para este salón.</p>
            }
          </ion-card-content>
        </ion-card>
      </section>
    } @else if (error()) {
      <section class="schedule-overlay schedule-overlay--error" role="alert">
        <p>{{ error() }}</p>
      </section>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      right: 12px;
      bottom: max(12px, env(safe-area-inset-bottom));
      left: 12px;
      z-index: 10000;
      display: block;
      pointer-events: none;
    }

    .schedule-overlay {
      width: min(100%, 560px);
      max-height: 52vh;
      max-height: 52dvh;
      margin: 0 auto;
      padding: 12px;
      overflow: auto;
      color: #fff;
      background: rgba(5, 22, 31, 0.88);
      border: 1px solid rgba(232, 200, 67, 0.7);
      border-radius: 18px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.38);
      font-family: Roboto, sans-serif;
      pointer-events: auto;
      animation: schedule-overlay-in 180ms ease-out;
    }

    .schedule-overlay--status,
    .schedule-overlay--error {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      min-height: 64px;
      padding: 16px;
      font-size: 16px;
      line-height: 1.4;
      text-align: center;
    }

    .schedule-overlay--error {
      background: rgba(110, 24, 24, 0.94);
      border-color: rgba(255, 255, 255, 0.45);
    }

    .schedule-overlay--status ion-spinner {
      flex: 0 0 auto;
      width: 26px;
      height: 26px;
      color: var(--color-accent);
    }

    .schedule-overlay__notice {
      margin: 0 2px 10px;
      padding: 9px 10px;
      color: #fff4bd;
      background: rgba(232, 200, 67, 0.14);
      border-left: 3px solid var(--color-accent);
      border-radius: 6px;
      font-size: 15px;
      line-height: 1.35;
    }

    .schedule-card {
      --background: transparent;
      --color: #fff;
      margin: 0;
      border-radius: 12px;
      box-shadow: none;
    }

    .schedule-card ion-card-header {
      padding: 2px 4px 10px;
    }

    .schedule-card ion-card-title {
      color: #fff;
      font-size: clamp(22px, 6vw, 28px);
      font-weight: 700;
      line-height: 1.15;
    }

    .schedule-card__meta {
      margin-top: 5px;
      color: #d7e5ec;
      font-size: 14px;
      line-height: 1.35;
    }

    .schedule-card ion-card-content {
      padding: 0;
      color: #fff;
      font-size: 15px;
    }

    .schedule-overlay__table {
      max-height: 32vh;
      max-height: 32dvh;
      overflow: auto;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 10px;
      -webkit-overflow-scrolling: touch;
    }

    .schedule-overlay__table:focus-visible {
      outline: 3px solid var(--color-accent);
      outline-offset: 2px;
    }

    table {
      width: 100%;
      min-width: 300px;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 15px;
      line-height: 1.35;
    }

    caption {
      padding: 9px 10px;
      color: #fff;
      background: rgba(10, 112, 156, 0.42);
      font-size: 14px;
      font-weight: 700;
      text-align: left;
    }

    .col-day { width: 17%; }
    .col-time { width: 23%; }
    .col-subject { width: 34%; }
    .col-teacher { width: 26%; }

    th,
    td {
      padding: 9px 7px;
      overflow-wrap: anywhere;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      text-align: left;
      vertical-align: top;
    }

    th {
      position: sticky;
      top: 0;
      z-index: 1;
      color: #fff;
      background: #123f54;
      font-size: 13px;
    }

    tbody tr:last-child td {
      border-bottom: 0;
    }

    .schedule-overlay__empty {
      padding: 8px 4px 4px;
      color: #e2edf2;
      font-size: 16px;
      line-height: 1.4;
    }

    @keyframes schedule-overlay-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 360px) {
      :host {
        right: 8px;
        left: 8px;
      }

      .schedule-overlay {
        padding: 10px;
      }

      th,
      td {
        padding: 8px 5px;
      }
    }

    @media (max-height: 560px) {
      .schedule-overlay {
        max-height: 46vh;
        max-height: 46dvh;
      }

      .schedule-overlay__table {
        max-height: 27vh;
        max-height: 27dvh;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .schedule-overlay {
        animation: none;
      }
    }
  `],
})
export class ScheduleOverlayComponent {
  private readonly arService = inject(ArService);

  protected readonly dayLabels: Record<ScheduleEntry['day'], string> = {
    lunes: 'Lunes',
    martes: 'Martes',
    miercoles: 'Miércoles',
    jueves: 'Jueves',
    viernes: 'Viernes',
    sabado: 'Sábado',
  };

  protected readonly schedule = this.arService.currentSchedule;
  protected readonly loading = this.arService.loading;
  protected readonly error = this.arService.error;
}
