// # Local File System Image Storage module
// The (default) module for storing images, using the local file system

import config from "./config";
import { LocalStorageBase } from "./LocalStorageBase";
import urlUtils from "./url-utils";
import { promises as fs } from "fs";
import { sqip } from "sqip";
import * as StorageBase from "ghost-storage-base";

import * as path from "path";

let messages = {
  notFound: "Image not found",
  notFoundWithRef: "Image not found: {file}",
  cannotRead: "Could not read image: {file}",
};

export class LocalImagesStorage
  extends LocalStorageBase
  implements StorageBase
{
  storage = new LocalImagesStorage();

  constructor() {
    super({
      storagePath: path.join(config.paths.contentPath, "images/"),
      staticFileURLPrefix: urlUtils.STATIC_IMAGE_URL_PREFIX,
      siteUrl: config.url,
      errorMessages: messages,
    });
  }

  /**
   * Saves the file to storage (the file system)
   * - returns a promise which ultimately returns the full url to the uploaded file
   */
  async save(
    image: StorageBase.Image,
    targetDir: string = this.getTargetDir(this.storagePath)
  ): Promise<string> {
    const imageFile = await fs.readFile(image.path);
    const res = await sqip({ input: imageFile });
    const sqipResult = Array.isArray(res) ? res[0] : res;

    const targetFilename =
      (await this.getUniqueFileName(image, targetDir)) + ".sqip.svg";

    await this.saveRaw(sqipResult.content, targetFilename);

    return super.save(image, targetDir);
  }

  /**
   * Saves a buffer in the targetPath
   * @param {Buffer} buffer is an instance of Buffer
   * @param {String} targetPath path to which the buffer should be written
   * @returns {Promise<String>} a URL to retrieve the data
   */
  async saveRaw(buffer: Buffer, targetPath: string): Promise<string> {
    const storagePath = path.join(this.storagePath, targetPath);
    const targetDir = path.dirname(storagePath);

    await fs.mkdir(targetDir);
    await fs.writeFile(storagePath, buffer);

    // For local file system storage can use relative path so add a slash
    const fullUrl = urlUtils
      .urlJoin("/", urlUtils.getSubdir(), this.staticFileURLPrefix, targetPath)
      .replace(new RegExp(`\\${path.sep}`, "g"), "/");

    return fullUrl;
  }
}
