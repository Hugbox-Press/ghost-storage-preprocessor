import fs from "fs-extra";
import path from "path";
import tpl from "@tryghost/tpl";
import errors from "@tryghost/errors";
import StorageBase from "ghost-storage-base";
import { urlUtils } from "./url-utils";

const messages = {
  notFound: "File not found",
  notFoundWithRef: "File not found: {file}",
  cannotRead: "Could not read file: {file}",
  invalidUrlParameter: `The URL "{url}" is not a valid URL for this site.`,
};

export class LocalStorageBase extends StorageBase {
  storagePath: string;
  staticFileURLPrefix: string;
  siteUrl: string;
  staticFileUrl: string;
  errorMessages: Record<string, string>;

  /**
   *
   * @param {Object} options
   * @param {String} options.storagePath
   * @param {String} options.siteUrl
   */
  constructor({ storagePath, staticFileURLPrefix, siteUrl }) {
    super();

    this.storagePath = storagePath;
    this.staticFileURLPrefix = staticFileURLPrefix;
    this.siteUrl = siteUrl;
    this.staticFileUrl = `${siteUrl}${staticFileURLPrefix}`;
    this.errorMessages = messages;
  }

  /**
   * Saves the file to storage (the file system)
   * - returns a promise which ultimately returns the full url to the uploaded file
   *
   * @param {StorageBase.Image} file
   * @param {String} targetDir
   * @returns {Promise<String>}
   */
  async save(file, targetDir) {
    let targetFilename;

    // NOTE: the base implementation of `getTargetDir` returns the format this.storagePath/YYYY/MM
    targetDir = targetDir || this.getTargetDir(this.storagePath);

    const filename = await this.getUniqueFileName(file, targetDir);

    targetFilename = filename;
    await fs.mkdirs(targetDir);

    await fs.copy(file.path, targetFilename);

    // The src for the image must be in URI format, not a file system path, which in Windows uses \
    // For local file system storage can use relative path so add a slash
    const fullUrl = urlUtils
      .urlJoin(
        "/",
        urlUtils.getSubdir(),
        this.staticFileURLPrefix,
        path.relative(this.storagePath, targetFilename)
      )
      .replace(new RegExp(`\\${path.sep}`, "g"), "/");

    return fullUrl;
  }

  /**
   *
   * @param {String} url full url under which the stored content is served, result of save method
   * @returns {String} path under which the content is stored
   */
  urlToPath(url) {
    let filePath;

    if (url.match(this.staticFileUrl)) {
      filePath = url.replace(this.staticFileUrl, "");
      filePath = path.join(this.storagePath, filePath);
    } else {
      throw new errors.IncorrectUsageError({
        message: tpl(messages.invalidUrlParameter, { url }),
      });
    }

    return filePath;
  }

  exists(fileName, targetDir) {
    const filePath = path.join(targetDir || this.storagePath, fileName);

    return fs
      .stat(filePath)
      .then(() => {
        return true;
      })
      .catch(() => {
        return false;
      });
  }

  /**
   * For some reason send divides the max age number by 1000
   * Fallthrough: false ensures that if an image isn't found, it automatically 404s
   * Wrap server static errors
   *
   * @returns {serveStaticContent}
   */
  serve() {
    return null;
  }

  /**
   * @param {String} filePath
   * @returns {Promise.<*>}
   */
  async delete(fileName, targetDir) {
    const filePath = path.join(targetDir, fileName);
    return await fs.remove(filePath);
  }

  /**
   * Reads bytes from disk for a target file
   * - path of target file (without content path!)
   *
   * @param options
   */
  read(options) {
    options = options || {};

    // remove trailing slashes
    options.path = (options.path || "").replace(/\/$|\\$/, "");

    const targetPath = path.join(this.storagePath, options.path);

    return new Promise<Buffer>((resolve, reject) => {
      fs.readFile(targetPath, (err, bytes) => {
        if (err) {
          if (err.code === "ENOENT" || err.code === "ENOTDIR") {
            return reject(
              new errors.NotFoundError({
                err: err,
                message: tpl(this.errorMessages.notFoundWithRef, {
                  file: options.path,
                }),
              })
            );
          }

          if (err.code === "ENAMETOOLONG") {
            return reject(new errors.BadRequestError({ err: err }));
          }

          if (err.code === "EACCES") {
            return reject(new errors.NoPermissionError({ err: err }));
          }

          return reject(
            new errors.InternalServerError({
              err: err,
              message: tpl(this.errorMessages.cannotRead, {
                file: options.path,
              }),
            })
          );
        }

        resolve(bytes);
      });
    });
  }
}
