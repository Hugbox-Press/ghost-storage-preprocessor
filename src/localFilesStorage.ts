import constants from "@tryghost/constants";
import path from "path";
import config from "./config";
import { LocalStorageBase } from "./LocalStorageBase";

export class LocalFilesStorage extends LocalStorageBase {
  constructor() {
    super({
      storagePath: path.join(config.paths.contentPath, "files/"),
      siteUrl: config.url,
      staticFileURLPrefix: constants.STATIC_FILES_URL_PREFIX,
    });
  }
}
