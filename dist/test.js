"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LocalImagesStorage_1 = require("./LocalImagesStorage");
const path = require("path");
const storage = new LocalImagesStorage_1.LocalImagesStorage();
storage.save({
    path: path.join(__dirname, "..", "test", "coffee.jpg"),
    name: "coffee.jpg",
    type: "image/jpg",
});
