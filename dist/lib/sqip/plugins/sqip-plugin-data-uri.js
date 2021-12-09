"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mini_svg_data_uri_1 = (0, tslib_1.__importDefault)(require("mini-svg-data-uri"));
const types_1 = require("../types");
class DataUriPlugin extends types_1.SqipPlugin {
    encodeBase64(rawSVGBuffer) {
        const base64 = rawSVGBuffer.toString("base64");
        return `data:image/svg+xml;base64,${base64}`;
    }
    apply(imageBuffer, metadata) {
        metadata.dataURI = (0, mini_svg_data_uri_1.default)(imageBuffer.toString());
        metadata.dataURIBase64 = this.encodeBase64(imageBuffer);
        return imageBuffer;
    }
}
exports.default = DataUriPlugin;
