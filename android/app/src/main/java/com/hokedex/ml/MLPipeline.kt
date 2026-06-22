package com.hokedex.ml

import android.content.Context

interface MLPipeline {
    fun detect(context: Context, imageUri: String): DetectionResult
    fun embed(context: Context, imageUri: String): FloatArray
    fun embedCrop(context: Context, imageUri: String, x: Float, y: Float, width: Float, height: Float): FloatArray
    fun close()
}
