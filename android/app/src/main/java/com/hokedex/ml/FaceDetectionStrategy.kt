package com.hokedex.ml

import android.content.Context

interface FaceDetectionStrategy {
    fun detect(context: Context, imageUri: String): DetectionResult
    fun close()
}
