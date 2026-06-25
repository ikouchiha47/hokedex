export type ModeKey = 'photo' | 'voice' | 'local' | 'contact';

export type CaptureResult =
  | { type: 'photo'; uri: string }
  | { type: 'voice'; uri: string | null }
  | { type: 'local'; uri: string }
  | { type: 'contact' }

export interface ModeProps {
  onCapture: (result: CaptureResult) => void;
  onReady: () => void;
  onBlocked: () => void;
}
