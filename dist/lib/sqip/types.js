"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqipPlugin = void 0;
class SqipPlugin {
    sqipConfig;
    options;
    static cliOptions;
    constructor(options) {
        const { sqipConfig } = options;
        this.sqipConfig = sqipConfig || {};
        this.options = {};
    }
    apply(imageBuffer, metadata) {
        console.log(metadata);
        return imageBuffer;
    }
}
exports.SqipPlugin = SqipPlugin;
