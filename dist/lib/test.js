"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const LocalImagesStorage_1 = require("./LocalImagesStorage");
const path = (0, tslib_1.__importStar)(require("path"));
const storage = new LocalImagesStorage_1.LocalImagesStorage();
storage.save({
    path: path.join(__dirname, "..", "..", "test", "coffee.jpg"),
    name: "coffee.jpg",
    type: "image/jpg",
});
