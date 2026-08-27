/**
 * Утилита компрессии изображения до 1536px по длинной стороне (раздел 4).
 * Снижает стоимость API и время генерации.
 */

import * as ImageManipulator from "expo-image-manipulator";

export const MAX_IMAGE_DIMENSION = 1536;

/** Сжимает изображение: resize до 1536px + JPEG 0.8. */
export async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_IMAGE_DIMENSION } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}
