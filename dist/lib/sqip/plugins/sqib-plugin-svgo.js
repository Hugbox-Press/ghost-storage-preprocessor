"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../types");
const svgo_1 = require("svgo");
// SVGO with settings for maximum compression to optimize the Primitive-generated SVG
class SVGOPlugin extends types_1.SqipPlugin {
    constructor(options) {
        super(options);
        const { pluginOptions } = options;
        this.options = {
            multipass: true,
            floatPrecision: 1,
            plugins: [
                "preset-default",
                "cleanupListOfValues",
                "convertStyleToAttrs",
                "prefixIds",
                "removeDimensions",
                "removeOffCanvasPaths",
                "removeRasterImages",
                "removeScriptElement",
                "removeStyleElement",
                "reusePaths",
                "sortAttrs",
            ],
            ...pluginOptions,
        };
    }
    apply(svg) {
        const result = (0, svgo_1.optimize)(svg.toString(), this.options);
        return Buffer.from(result.data);
    }
}
exports.default = SVGOPlugin;
