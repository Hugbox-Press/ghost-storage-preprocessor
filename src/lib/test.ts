import { LocalImagesStorage } from "./LocalImagesStorage";
import * as path from "path";

const storage = new LocalImagesStorage();

storage.save({
  path: path.join(__dirname, "..", "..", "test", "coffee.jpg"),
  name: "coffee.jpg",
  type: "image/jpg",
});
