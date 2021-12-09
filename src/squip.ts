import { promises as fs } from "fs";
import { sqip } from "sqip";
import * as StorageBase from "ghost-storage-base";

interface IGhostStoragePreprocessorTransform {
  save(
    img: StorageBase.Image,
    targetDir?: string
  ): Promise<[StorageBase.Image, string | undefined][]>;
  delete(
    img: StorageBase.Image,
    targetDir?: string
  ): Promise<[StorageBase.Image, string | undefined][]>;
}

export class GhostStoragePreprocessorSqipTransform
  implements IGhostStoragePreprocessorTransform
{
  public async save(
    image: StorageBase.Image,
    targetDir?: string
  ): Promise<Array<[StorageBase.Image, string]>> {
    const imageFile = await fs.readFile(image.path);
    const res = await sqip({ input: imageFile });
    const sqipResult = Array.isArray(res) ? res[0] : res;

    const sqipPath = image.path + ".sqip.svg";
    await fs.writeFile(sqipPath, sqipResult.content);

    const sqipImage: StorageBase.Image = {
      name: image.name + ".sqip.svg",
      path: sqipPath,
      type: "image/svg",
    };

    return [
      [image, targetDir],
      [sqipImage, targetDir],
    ];
  }

  public async delete(image: StorageBase.Image, targetDir?: string) {
    return [];
  }
}
