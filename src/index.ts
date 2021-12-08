import { xor, pick, flatten } from "lodash";
import * as StorageBase from "ghost-storage-base";
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
// @ts-ignore
import * as config from "../../../../../current/core/server/config";
// @ts-ignore
import * as common from "../../../../../current/core/server/lib/common";
// @ts-ignore
import * as LocalFileStorage from "../../../../../current/core/server/adapters/storage/LocalFileStorage";

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

  constructor(preprocessorConfig: GhostStoragePreprocessorConfig) {
    super();
    this.storage = getStorage(preprocessorConfig.use);
    this.preprocessors = [new GhostStoragePreprocessorSqipTransform()];
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

/**
 * Based on https://github.com/TryGhost/Ghost/blob/master/core/server/adapters/storage/index.js
 */
const storage = {
  local: new LocalFileStorage(),
};

function getStorage(storageModuleName = "local") {
  const storageConfig = config.get(`storage:${storageModuleName}`);
  let CustomStorage; // tslint:disable-line variable-name

  // CASE: cached
  if (storage[storageModuleName]) return storage[storageModuleName];

  // CASE: load adapter from custom path  (.../content/storage)
  try {
    CustomStorage = require(config.getContentPath("storage") +
      storageModuleName);
  } catch (err) {
    if (err.code !== "MODULE_NOT_FOUND") {
      throw new common.errors.IncorrectUsageError({
        message:
          "We have detected an unknown error in your custom storage adapter.",
        err,
      });
    }
  }

  // CASE: check in the default storage path
  try {
    CustomStorage =
      CustomStorage ||
      require(config.get("paths").internalStoragePath + storageModuleName);
  } catch (err) {
    if (err.code === "MODULE_NOT_FOUND") {
      throw new common.errors.IncorrectUsageError({
        err,
        context:
          "We cannot find your adapter in: " +
          config.getContentPath("storage") +
          " or: " +
          config.get("paths").internalStoragePath,
      });
    } else {
      throw new common.errors.IncorrectUsageError({
        message: "We have detected an error in your custom storage adapter.",
        err,
      });
    }
  }

  const customStorage = new CustomStorage(storageConfig);

  // CASE: if multiple StorageBase modules are installed, instanceof could return false
  if (Object.getPrototypeOf(CustomStorage).name !== StorageBase.name) {
    throw new common.errors.IncorrectUsageError({
      message: "Your storage adapter does not inherit from the Storage Base.",
    });
  }

  if (!customStorage.requiredFns) {
    throw new common.errors.IncorrectUsageError({
      message:
        "Your storage adapter does not provide the minimum required functions.",
    });
  }

  if (
    xor(
      customStorage.requiredFns,
      Object.keys(
        pick(Object.getPrototypeOf(customStorage), customStorage.requiredFns)
      )
    ).length
  ) {
    throw new common.errors.IncorrectUsageError({
      message:
        "Your storage adapter does not provide the minimum required functions.",
    });
  }

  storage[storageModuleName] = customStorage;
  return storage[storageModuleName];
}
