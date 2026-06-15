export type BoundingBox = {
  x: number;   // normalized 0–1, relative to image width
  y: number;   // normalized 0–1, relative to image height
  width: number;
  height: number;
};

export type DetectionResult =
  | { type: 'NO_SUBJECT' }
  | { type: 'MULTI_SUBJECT'; crops: BoundingBox[] }
  | { type: 'LOW_CONFIDENCE'; crop: BoundingBox; confidence: number }
  | { type: 'SUCCESS'; crop: BoundingBox };

// Embedding: 512d float32, L2-normalised. Model: FaceNet 512d (facenet_512.tflite).
// Cosine similarity is the correct metric — thresholds in Category row.
export type FaceEmbedding = number[]; // length === 512
