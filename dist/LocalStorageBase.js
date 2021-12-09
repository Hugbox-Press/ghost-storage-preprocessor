"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageBase = void 0;
// # Local File Base Storage module
// The (default) module for storing files using the local file system
const serveStatic = require("express").static;
const fs_1 = require("fs");
const path = require("path");
const StorageBase = require("ghost-storage-base");
const url_utils_1 = require("./url-utils");
const moment = require("moment");
const errors = require("@tryghost/errors");
const tpl = require("@tryghost/tpl");
const logging = require("@tryghost/logging");
const constants = require("@tryghost/constants");
const messages = {
    notFound: "File not found",
    notFoundWithRef: "File not found: {file}",
    cannotRead: "Could not read file: {file}",
    invalidUrlParameter: `The URL "{url}" is not a valid URL for this site.`,
};
class LocalStorageBase extends StorageBase {
    storagePath;
    staticFileURLPrefix;
    siteUrl;
    staticFileUrl;
    errorMessages;
    constructor({ storagePath, staticFileURLPrefix, siteUrl, errorMessages, }) {
        super();
        this.storagePath = storagePath;
        this.staticFileURLPrefix = staticFileURLPrefix;
        this.siteUrl = siteUrl;
        this.staticFileUrl = `${siteUrl}${staticFileURLPrefix}`;
        this.errorMessages = errorMessages || messages;
    }
    /**
     * Saves the file to storage (the file system)
     * - returns a promise which ultimately returns the full url to the uploaded file
     */
    async save(file, targetDir) {
        let targetFilename;
        // NOTE: the base implementation of `getTargetDir` returns the format this.storagePath/YYYY/MM
        targetDir = targetDir || this.getTargetDir(this.storagePath);
        const filename = await this.getUniqueFileName(file, targetDir);
        targetFilename = filename;
        await fs_1.promises.mkdir(targetDir);
        await fs_1.promises.copyFile(file.path, targetFilename);
        // The src for the image must be in URI format, not a file system path, which in Windows uses \
        // For local file system storage can use relative path so add a slash
        const fullUrl = url_utils_1.default
            .urlJoin("/", url_utils_1.default.getSubdir(), this.staticFileURLPrefix, path.relative(this.storagePath, targetFilename))
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
        }
        else {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.invalidUrlParameter, { url }),
            });
        }
        return filePath;
    }
    exists(fileName, targetDir) {
        const filePath = path.join(targetDir || this.storagePath, fileName);
        return fs_1.promises
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
                    logging.info("LocalStorageBase.serve", req.path, moment().diff(startedAtMoment, "ms") + "ms");
                },
            })(req, res, (err) => {
                if (err) {
                    if (err.statusCode === 404) {
                        return next(new errors.NotFoundError({
                            message: tpl(errorMessages.notFound),
                            code: "STATIC_FILE_NOT_FOUND",
                            property: err.path,
                        }));
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
    async delete(fileName, targetDir) {
        const filePath = path.join(targetDir, fileName);
        await fs_1.promises.rm(filePath);
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
        return new Promise((resolve, reject) => {
            fs_1.promises.readFile(targetPath)
                .then(resolve)
                .catch((err) => {
                if (err.code === "ENOENT" || err.code === "ENOTDIR") {
                    return reject(new errors.NotFoundError({
                        err: err,
                        message: tpl(this.errorMessages.notFoundWithRef, {
                            file: options.path,
                        }),
                    }));
                }
                if (err.code === "ENAMETOOLONG") {
                    return reject(new errors.BadRequestError({ err: err }));
                }
                if (err.code === "EACCES") {
                    return reject(new errors.NoPermissionError({ err: err }));
                }
                return reject(new errors.InternalServerError({
                    err: err,
                    message: tpl(this.errorMessages.cannotRead, {
                        file: options.path,
                    }),
                }));
            });
        });
    }
}
exports.LocalStorageBase = LocalStorageBase;
