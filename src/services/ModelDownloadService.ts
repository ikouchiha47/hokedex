import { NativeModules, NativeEventEmitter } from 'react-native';

const { HokedexML } = NativeModules;

// PeoplePipeline throws FileNotFoundException when model files are missing.
// Message format: "/data/.../files/models/blaze_face_full_range.tflite (No such file or directory)"
const MODEL_UNAVAILABLE_PATTERNS = [
  'no such file or directory',
  'filenotfoundexception',
  '.tflite',
];

export function isModelUnavailableError(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return MODEL_UNAVAILABLE_PATTERNS.some(p => msg.includes(p));
}

type DownloadCallbacks = {
  onProgress: (percent: number) => void;
  onDone: () => void;
  onError: (e: unknown) => void;
};

export class ModelDownloadService {
  checkReady(): Promise<boolean> {
    return HokedexML.checkModelsReady();
  }

  download(callbacks: DownloadCallbacks): () => void {
    const emitter = new NativeEventEmitter(HokedexML);

    const progressSub = emitter.addListener(
      'hokedex:modelProgress',
      ({ percent }: { percent: number }) => callbacks.onProgress(percent),
    );

    const doneSub = emitter.addListener('hokedex:modelReady', () => {
      cleanup();
      callbacks.onDone();
    });

    function cleanup() {
      progressSub.remove();
      doneSub.remove();
    }

    HokedexML.downloadModels().catch((e: unknown) => {
      cleanup();
      callbacks.onError(e);
    });

    return cleanup;
  }
}
