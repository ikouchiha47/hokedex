package com.hokedex.ml

import android.content.Context

interface MLPipeline<out R : MLResult> {
    fun detect(context: Context, imageUri: String): R
    fun close()
}
