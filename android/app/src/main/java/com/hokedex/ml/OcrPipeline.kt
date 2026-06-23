package com.hokedex.ml

import android.content.Context

class OcrPipeline(
    context: Context,
    private val strategy: TextRecognitionStrategy = MLKitTextRecognizer(),
) : MLPipeline<TextResult> {

    override fun detect(context: Context, imageUri: String): TextResult =
        strategy.recognise(context, imageUri)

    override fun close() = strategy.close()
}
