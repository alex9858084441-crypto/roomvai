/**
 * Утилита компрессии изображения до 1536px по длинной стороне (раздел 4).
 * Реализация — на этапе 3 (expo-image-manipulator).
 */

export const MAX_IMAGE_DIMENSION = 1536;

export async function compressImage(_uri: string): Promise<string> {
  // TODO этап 3: ImageManipulator.manipulateAsync(uri, [{ resize }], JPEG 0.8)
  return _uri;
}
