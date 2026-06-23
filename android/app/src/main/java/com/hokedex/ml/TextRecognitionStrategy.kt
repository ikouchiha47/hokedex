package com.hokedex.ml

import android.content.Context

interface TextRecognitionStrategy {
    fun recognise(context: Context, imageUri: String): TextResult
    fun close()
}
