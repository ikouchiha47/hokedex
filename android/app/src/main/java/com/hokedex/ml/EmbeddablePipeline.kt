package com.hokedex.ml

import android.content.Context

interface EmbeddablePipeline<out R : MLResult> : MLPipeline<R> {
    fun embed(context: Context, imageUri: String): FloatArray
    fun embedCrop(context: Context, imageUri: String, x: Float, y: Float, width: Float, height: Float): FloatArray
}
