package com.hokedex.ml

object MLRegistry {
    private val factories = mutableMapOf<String, () -> MLPipeline<*>>()
    private val instances = mutableMapOf<String, MLPipeline<*>>()

    fun <R : MLResult> register(categoryId: String, factory: () -> MLPipeline<R>) {
        factories[categoryId] = factory
    }

    @Suppress("UNCHECKED_CAST")
    fun <R : MLResult> get(categoryId: String): MLPipeline<R>? {
        instances[categoryId]?.let { return it as MLPipeline<R> }
        val factory = factories[categoryId] ?: return null
        return (factory() as MLPipeline<R>).also { instances[categoryId] = it }
    }

    fun closeAll() {
        instances.values.forEach { it.close() }
        instances.clear()
    }
}
