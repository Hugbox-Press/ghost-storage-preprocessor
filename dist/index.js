"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const StorageBase = require("ghost-storage-base");
const LocalImagesStorage_1 = require("./LocalImagesStorage");
const squip_1 = require("./squip");
module.exports = class GhostStoragePreprocessor extends StorageBase {
    storage;
    preprocessors;
    constructor() {
        super();
        this.storage = new LocalImagesStorage_1.LocalImagesStorage();
        this.preprocessors = [new squip_1.GhostStoragePreprocessorSqipTransform()];
    }
    exists(...args) {
        return this.storage.exists(...args);
    }
    read(...args) {
        return this.storage.read(...args);
    }
    serve(...args) {
        return this.storage.serve(...args);
    }
    async save(image, targetDir) {
        return await this.applyPreprocessors("save", image, targetDir);
    }
    async delete(fileName, targetDir) {
        return await this.applyPreprocessors("delete", { path: fileName, type: "image", name: "" }, targetDir);
    }
    async applyPreprocessors(method, image, targetDir) {
        let images = [[image, targetDir]];
        for (const preprocessor of this.preprocessors) {
            const processed = await Promise.all(images.map((args) => preprocessor[method](...args)));
            images = processed.flat();
        }
        const [res] = await Promise.all(images.map((args) => this.storage[method](...args)));
        return res;
    }
};
