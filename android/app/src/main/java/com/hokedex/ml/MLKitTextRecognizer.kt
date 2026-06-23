package com.hokedex.ml

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions
import com.google.mlkit.vision.text.TextRecognizer
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.util.concurrent.CountDownLatch
import java.util.concurrent.atomic.AtomicReference

class MLKitTextRecognizer : TextRecognitionStrategy {

    // Two recognizers — Latin covers English, Dutch, and most European scripts;
    // Devanagari covers Hindi. Results are merged.
    private val latinRecognizer: TextRecognizer =
        TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    private val devanagariRecognizer: TextRecognizer =
        TextRecognition.getClient(DevanagariTextRecognizerOptions.Builder().build())

    override fun recognise(context: Context, imageUri: String): TextResult {
        val stream = openImageStream(context, imageUri)
            ?: return TextResult(fullText = "", blocks = emptyList())
        val bitmap = BitmapFactory.decodeStream(stream)
        stream.close()

        val image = InputImage.fromBitmap(bitmap, 0)
        val imgW = bitmap.width.toFloat()
        val imgH = bitmap.height.toFloat()

        val allBlocks = mutableListOf<TextBlock>()

        for ((recognizer, script) in listOf(latinRecognizer to "Latin", devanagariRecognizer to "Devanagari")) {
            val resultRef = AtomicReference<List<TextBlock>>(emptyList())
            val latch = CountDownLatch(1)

            recognizer.process(image)
                .addOnSuccessListener { visionText ->
                    resultRef.set(visionText.textBlocks.map { block ->
                        val bb = block.boundingBox
                        TextBlock(
                            text = block.text,
                            boundingBox = if (bb != null) BoundingBox(
                                x = bb.left / imgW,
                                y = bb.top / imgH,
                                width = bb.width() / imgW,
                                height = bb.height() / imgH,
                            ) else BoundingBox(0f, 0f, 0f, 0f),
                            script = script,
                            lines = block.lines.map { line ->
                                val lbb = line.boundingBox
                                TextLine(
                                    text = line.text,
                                    boundingBox = if (lbb != null) BoundingBox(
                                        x = lbb.left / imgW,
                                        y = lbb.top / imgH,
                                        width = lbb.width() / imgW,
                                        height = lbb.height() / imgH,
                                    ) else BoundingBox(0f, 0f, 0f, 0f),
                                    confidence = line.elements.mapNotNull { it.confidence }.average().toFloat().takeIf { !it.isNaN() } ?: 0f,
                                )
                            },
                        )
                    })
                    latch.countDown()
                }
                .addOnFailureListener { latch.countDown() }

            latch.await()
            allBlocks.addAll(resultRef.get())
        }

        val fullText = allBlocks.joinToString("\n") { it.text }
        return TextResult(fullText = fullText, blocks = allBlocks)
    }

    private fun openImageStream(context: Context, imageUri: String): InputStream? {
        if (!imageUri.startsWith("content://") && !imageUri.startsWith("file://")) {
            val file = File(imageUri)
            return if (file.exists()) FileInputStream(file) else null
        }
        return context.contentResolver.openInputStream(Uri.parse(imageUri))
    }

    override fun close() {
        latinRecognizer.close()
        devanagariRecognizer.close()
    }
}
