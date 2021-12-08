import constants from "@tryghost/constants";
import path from "path";

/**
 * At runtime, this file will be installed to content/adapters/storage/preprocessor/dist/index.js
 *
 * ../preprocessor
 * ../../storage
 * ../../../adapters
 * ../../../../content
 * ../../../../../core
 */
class FakeStorageBase {
  /**
   *
   * @param {Object} options
   * @param {String} options.storagePath
   * @param {String} options.siteUrl
   * @param {String} [options.staticFileURLPrefix]
   * @param {Object} [options.errorMessages]
   * @param {String} [options.errorMessages.notFound]
   * @param {String} [options.errorMessages.notFoundWithRef]
   * @param {String} [options.errorMessages.cannotRead]
   */
  constructor({ storagePath, staticFileURLPrefix, siteUrl }) {}
}

interface GhostConfig {
  url: string;
  paths: {
    contentPath: string;
  };
}

export const getLocalFilesStorage = () => {
  const config: GhostConfig = require("../../../../../config.production.json");
  const LocalStorageBase: typeof FakeStorageBase = require("../../../../../current/core/server/adapters/storage/LocalStorageBase");

  class LocalFilesStorage extends LocalStorageBase {
    constructor() {
      super({
        storagePath: path.join(config.paths.contentPath, "files/"),
        // siteUrl: config.getSiteUrl(),
        siteUrl: config.url,
        staticFileURLPrefix: constants.STATIC_FILES_URL_PREFIX,
      });
    }
  }

  return new LocalFilesStorage();
};
