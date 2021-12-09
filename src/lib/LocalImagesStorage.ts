// # Local File Base Storage module
// The (default) module for storing files using the local file system
const serveStatic = require("express").static;

import { promises as fs } from "fs";
import * as path from "path";
import StorageBase from "ghost-storage-base";
import urlUtils from "./url-utils";
import { sqip } from "./sqip";
import getConfig from "./config";

const moment = require("moment");
const errors = require("@tryghost/errors");
const tpl = require("@tryghost/tpl");
const logging = require("@tryghost/logging");
const constants = require("@tryghost/constants");

const messages = {
  notFound: "Image not found",
  notFoundWithRef: "Image not found: {file}",
  cannotRead: "Could not read image: {file}",
  invalidUrlParameter: `The URL "{url}" is not a valid URL for this site.`,
};

interface ImageLike extends StorageBase.Image {
  buffer?: Buffer;
}

export class LocalImagesStorage extends StorageBase {
  storagePath: string;
  staticFileURLPrefix: string;
  siteUrl: string;
  staticFileUrl: string;
  errorMessages: Record<string, string>;

  constructor() {
    super();

    const config = getConfig();

    this.storagePath = path.join(config.paths.contentPath, "images/");
    this.staticFileURLPrefix = urlUtils.STATIC_IMAGE_URL_PREFIX;
    this.siteUrl = config.url;
    this.staticFileUrl = `${this.siteUrl}${this.staticFileURLPrefix}`;

    this.errorMessages = messages;
  }

  /**
   * Saves the file to storage (the file system)
   * - returns a promise which ultimately returns the full url to the uploaded file
   */
  async save(
    image: ImageLike,
    // NOTE: the base implementation of `getTargetDir` returns the format this.storagePath/YYYY/MM
    targetDir: string = this.getTargetDir(this.storagePath)
  ): Promise<string> {
    image.name = await this.getUniqueFileName(image, targetDir);

    // First, save original.
    const savedImagePath = await this._save(image, targetDir);

    // Create sqip image...
    const sqipImage: ImageLike = {
      ...image,
      name: image.name + ".sqip.svg",
    };

    const imageFile = await fs.readFile(image.path);
    const sqipResults = await sqip({
      input: imageFile,
      outputFileName: sqipImage.name,
    });

    for (const sqipResult of [sqipResults].flat()) {
      // Save results
      await this._save(
        {
          ...sqipImage,
          buffer: sqipResult.content,
        },
        targetDir
      );
    }

    return savedImagePath;
  }

  /**
   * Saves the file to storage (the file system)
   * - returns a promise which ultimately returns the full url to the uploaded file
   */
  async _save(file: ImageLike, targetDir: string): Promise<string> {
    await fs.mkdir(targetDir, { recursive: true });

    if (file.buffer) {
      await fs.writeFile(file.name, file.buffer);
    } else {
      await fs.copyFile(file.path, file.name);
    }

    // The src for the image must be in URI format, not a file system path, which in Windows uses \
    // For local file system storage can use relative path so add a slash
    const fullUrl = urlUtils
      .urlJoin(
        "/",
        urlUtils.getSubdir(),
        this.staticFileURLPrefix,
        path.relative(this.storagePath, file.name)
      )
      .replace(new RegExp(`\\${path.sep}`, "g"), "/");

    return fullUrl;
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

    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(storagePath, buffer);

    // For local file system storage can use relative path so add a slash
    const fullUrl = urlUtils
      .urlJoin("/", urlUtils.getSubdir(), this.staticFileURLPrefix, targetPath)
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
    const { storagePath, errorMessages } = this;

    return function serveStaticContent(req, res, next) {
      const startedAtMoment = moment();

      return serveStatic(storagePath, {
        maxAge: constants.ONE_YEAR_MS,
        fallthrough: false,
        onEnd: () => {
          logging.info(
            "LocalStorageBase.serve",
            req.path,
            moment().diff(startedAtMoment, "ms") + "ms"
          );
        },
      })(req, res, (err) => {
        if (err) {
          if (err.statusCode === 404) {
            return next(
              new errors.NotFoundError({
                message: tpl(errorMessages.notFound),
                code: "STATIC_FILE_NOT_FOUND",
                property: err.path,
              })
            );
          }

          if (err.statusCode === 400) {
            return next(new errors.BadRequestError({ err: err }));
          }

          if (err.statusCode === 403) {
            return next(new errors.NoPermissionError({ err: err }));
          }

          return next(new errors.InternalServerError({ err: err }));
        }

        next();
      });
    };
  }
  async delete(fileName: string, targetDir: string): Promise<boolean> {
    const filePath = path.join(targetDir, fileName);
    await fs.rm(filePath);

    return true;
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
      fs.readFile(targetPath)
        .then(resolve)
        .catch((err) => {
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
        });
    });
  }
}
