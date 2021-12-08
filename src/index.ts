import { xor, pick, flatten } from "lodash";
import StorageBase from "ghost-storage-base";
import { GhostStoragePreprocessorSqipTransform } from "./squip";
/**
 * At runtime, this file will be installed to content/adapters/storage/preprocessor/dist/index.js
 *
 * ../preprocessor
 * ../../storage
 * ../../../adapters
 * ../../../../content
 * ../../../../../core
 */

import LocalFilesStorage from "ghost/core/server/adapters/storage/LocalFilesStorage";

type GhostStoragePreprocessorConfig = {
  transforms: [string, { [k: string]: any }][];
  use: string;
};

type Preprocessor = {
  save(
    img: StorageBase.Image,
    targetDir?: string
  ): Promise<[StorageBase.Image, string][]>;
  delete(
    img: StorageBase.Image,
    targetDir?: string
  ): Promise<[StorageBase.Image, string][]>;
};

module.exports = class GhostStoragePreprocessor extends StorageBase {
  public storage: any;
  public preprocessors: Preprocessor[];

  constructor() {
    super();
    (this.storage = new LocalFilesStorage()),
      (this.preprocessors = [new GhostStoragePreprocessorSqipTransform()]);
  }

  public exists(...args: any[]) {
    return this.storage.exists(...args);
  }

  public read(...args: any[]) {
    return this.storage.read(...args);
  }

  public serve(...args: any[]) {
    return this.storage.serve(...args);
  }

  public async save(image: StorageBase.Image, targetDir?: string) {
    return await this.applyPreprocessors("save", image, targetDir);
  }

  public async delete(fileName: string, targetDir?: string) {
    return await this.applyPreprocessors(
      "delete",
      { path: fileName, type: "image", name: "" },
      targetDir
    );
  }

  private async applyPreprocessors(
    method: string,
    image: StorageBase.Image,
    targetDir?: string
  ) {
    let images = [[image, targetDir]];
    for (const preprocessor of this.preprocessors) {
      const processed = await Promise.all(
        images.map((args: [StorageBase.Image, string]) =>
          preprocessor[method](...args)
        )
      );
      images = flatten(processed);
    }
    const [res] = await Promise.all(
      images.map((args) => this.storage[method](...args))
    );
    return res;
  }
};
