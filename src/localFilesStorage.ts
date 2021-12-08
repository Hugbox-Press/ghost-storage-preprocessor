import StorageBase from "ghost-storage-base";

/**
 * At runtime, this file will be installed to content/adapters/storage/preprocessor/dist/index.js
 *
 * ../preprocessor
 * ../../storage
 * ../../../adapters
 * ../../../../content
 * ../../../../../core
 */
export const getLocalFilesStorage = () => {
  const LocalFilesStorage = require("../../../../../current/core/server/adapters/storage/LocalFilesStorage");
  return new LocalFilesStorage() as StorageBase;
};
