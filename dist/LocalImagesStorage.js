"use strict";
// # Local File System Image Storage module
// The (default) module for storing images, using the local file system
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalImagesStorage = void 0;
const config_1 = require("./config");
const LocalStorageBase_1 = require("./LocalStorageBase");
const url_utils_1 = require("./url-utils");
const fs_1 = require("fs");
const sqip_1 = require("sqip");
const path = require("path");
let messages = {
    notFound: "Image not found",
    notFoundWithRef: "Image not found: {file}",
    cannotRead: "Could not read image: {file}",
};
class LocalImagesStorage extends LocalStorageBase_1.LocalStorageBase {
    storage = new LocalImagesStorage();
    constructor() {
        super({
            storagePath: path.join(config_1.default.paths.contentPath, "images/"),
            staticFileURLPrefix: url_utils_1.default.STATIC_IMAGE_URL_PREFIX,
            siteUrl: config_1.default.url,
            errorMessages: messages,
        });
    }
    /**
     * Saves the file to storage (the file system)
     * - returns a promise which ultimately returns the full url to the uploaded file
     */
    async save(image, targetDir = this.getTargetDir(this.storagePath)) {
        const imageFile = await fs_1.promises.readFile(image.path);
        const res = await (0, sqip_1.sqip)({ input: imageFile });
        const sqipResult = Array.isArray(res) ? res[0] : res;
        const targetFilename = (await this.getUniqueFileName(image, targetDir)) + ".sqip.svg";
        await this.saveRaw(sqipResult.content, targetFilename);
        return super.save(image, targetDir);
    }
    /**
     * Saves a buffer in the targetPath
     * @param {Buffer} buffer is an instance of Buffer
     * @param {String} targetPath path to which the buffer should be written
     * @returns {Promise<String>} a URL to retrieve the data
     */
    async saveRaw(buffer, targetPath) {
        const storagePath = path.join(this.storagePath, targetPath);
        const targetDir = path.dirname(storagePath);
        await fs_1.promises.mkdir(targetDir);
        await fs_1.promises.writeFile(storagePath, buffer);
        // For local file system storage can use relative path so add a slash
        const fullUrl = url_utils_1.default
            .urlJoin("/", url_utils_1.default.getSubdir(), this.staticFileURLPrefix, targetPath)
            .replace(new RegExp(`\\${path.sep}`, "g"), "/");
        return fullUrl;
    }
}
exports.LocalImagesStorage = LocalImagesStorage;
