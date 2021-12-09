"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GhostStoragePreprocessorSqipTransform = void 0;
const fs_1 = require("fs");
const sqip_1 = require("sqip");
class GhostStoragePreprocessorSqipTransform {
    async save(image, targetDir) {
        const imageFile = await fs_1.promises.readFile(image.path);
        const res = await (0, sqip_1.sqip)({ input: imageFile });
        const sqipResult = Array.isArray(res) ? res[0] : res;
        const sqipPath = image.path + ".sqip.svg";
        await fs_1.promises.writeFile(sqipPath, sqipResult.content);
        const sqipImage = {
            name: image.name + ".sqip.svg",
            path: sqipPath,
            type: "image/svg",
        };
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
