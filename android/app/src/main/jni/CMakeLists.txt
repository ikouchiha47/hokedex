# This file exists to trigger the externalNativeBuild in build.gradle,
# which is required for the autolinked JNI libraries to be included.
# react-native-reanimated and react-native-worklets build their own .so
# files via their own gradle externalNativeBuild — this file is intentionally minimal.
cmake_minimum_required(VERSION 3.13)
project(hokedex_app)
