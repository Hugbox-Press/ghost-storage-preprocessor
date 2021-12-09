"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalFilesStorage = void 0;
const constants = require("@tryghost/constants");
const path = require("path");
const config_1 = require("./config");
const LocalStorageBase_1 = require("./LocalStorageBase");
class LocalFilesStorage extends LocalStorageBase_1.LocalStorageBase {
    constructor() {
        super({
            storagePath: path.join(config_1.default.paths.contentPath, "files/"),
            siteUrl: config_1.default.url,
            staticFileURLPrefix: constants.STATIC_FILES_URL_PREFIX,
        });
    }
}
exports.LocalFilesStorage = LocalFilesStorage;
