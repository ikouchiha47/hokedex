package com.hokedex.ml

object MLRegistry {
    private val pipelines = mutableMapOf<String, MLPipeline>()

    fun register(categoryId: String, pipeline: MLPipeline) {
        pipelines[categoryId] = pipeline
    }

    fun get(categoryId: String): MLPipeline? = pipelines[categoryId]

    fun closeAll() {
        pipelines.values.forEach { it.close() }
        pipelines.clear()
    }
}
