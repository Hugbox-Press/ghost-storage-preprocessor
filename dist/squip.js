"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GhostStoragePreprocessorSqipTransform = void 0;
const fs = require("fs");
const sqip = require("sqip");
class GhostStoragePreprocessorSqipTransform {
    async save(image, targetDir) {
        const res = sqip({ filename: image.path });
        const sqipPath = image.path + ".sqip.svg";
        const sqipImage = Object.assign({}, image, {
            name: image.name + ".sqip.svg",
            path: sqipPath,
            mimetype: "image/svg",
            type: "image/svg",
        });
        await new Promise((resolve, reject) => fs.writeFile(sqipPath, res.final_svg, (err) => err ? reject(err) : resolve()));
        return [
            [image, targetDir],
            [sqipImage, targetDir],
        ];
    }
    async delete(image, targetDir) {
        return [];
    }
}
exports.GhostStoragePreprocessorSqipTransform = GhostStoragePreprocessorSqipTransform;
