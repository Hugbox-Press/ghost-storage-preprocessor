import * as fs from "fs";
import * as sqip from "sqip";
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
  public async save(image: StorageBase.Image, targetDir?: string) {
    const res = sqip({ filename: image.path });
    const sqipPath = image.path + ".sqip.svg";
    const sqipImage = Object.assign({}, image, {
      name: image.name + ".sqip.svg",
      path: sqipPath,
      mimetype: "image/svg",
      type: "image/svg",
    });
    await new Promise<void>((resolve, reject) =>
      fs.writeFile(sqipPath, res.final_svg, (err) =>
        err ? reject(err) : resolve()
      )
    );
    return [
      [image, targetDir],
      [sqipImage, targetDir],
    ] as [StorageBase.Image, string][];
  }

  public async delete(image: StorageBase.Image, targetDir?: string) {
    return [];
  }
}
