package com.hokedex.ml

import android.content.Context
import android.graphics.Bitmap

interface FaceDetectionStrategy {
    fun detect(context: Context, imageUri: String): DetectionResult
    fun detectBitmap(bitmap: Bitmap): DetectionResult
    fun close()
}
