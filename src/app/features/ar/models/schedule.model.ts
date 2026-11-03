/**
 * WebAR: matrices binarias
 * Modelos de datos para el módulo AR
 */

export interface ScheduleEntry {
  day: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado';
  start_time: string;   // "07:00"
  end_time: string;     // "09:00"
  subject: string;      // "Cálculo I"
  teacher: string;      // "Prof. García"
}

export interface Room {
  id: number;
  name: string;           // "Laboratorio 201"
  barcode_value: number;  // valor del marcador Barcode (1–64)
  block: string;          // "Bloque A"
  capacity?: number;
}

export interface RoomSchedule {
  room: Room;
  schedule: ScheduleEntry[];
}

export type ArState = 'idle' | 'scanning' | 'detected' | 'loading' | 'error';
