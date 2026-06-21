import { type CalendarEvent, type CalendarPermission } from '../../types/calendar';
import { type Result } from '../../types/moments';

/**
 * Single access point for device calendar data.
 * Phase 1 stub — all methods throw until Phase 2 wires Android CalendarContract.
 *
 * R-CONV-03: Nothing outside this class may touch CalendarContract or Android cursor APIs.
 */
export class CalendarProxy {
  async requestPermission(): Promise<CalendarPermission> {
    throw new Error('CalendarProxy.requestPermission: Not implemented');
  }

  async listEvents(fromMs: number, toMs: number): Promise<Result<CalendarEvent[]>> {
    throw new Error('CalendarProxy.listEvents: Not implemented');
  }
}
