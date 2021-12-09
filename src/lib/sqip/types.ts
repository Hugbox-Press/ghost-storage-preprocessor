import { Palette } from "@vibrant/color";
import { OptionDefinition } from "command-line-args";

export interface SqipResult {
  content: Buffer;
  metadata: SqipImageMetadata;
}

export interface SqipCliOptionDefinition extends OptionDefinition {
  description?: string;
  required?: boolean;
  default?: boolean;
}

export interface PluginOptions {
  [key: string]: unknown;
}

export interface SqipImageMetadata {
  originalWidth: number;
  originalHeight: number;
  palette: Palette;
  height: number;
  width: number;
  type: "unknown" | "pixel" | "svg";
  [key: string]: unknown;
}

export interface PluginResolver {
  name: string;
  options?: PluginOptions;
}

export interface SqipConfig {
  input: string | Buffer;
  outputFileName?: string;
  output?: string;
  silent?: boolean;
  parseableOutput?: boolean;
  plugins: PluginType[];
  width?: number;
}

export type PluginType = PluginResolver | string;

export interface SqipPluginOptions {
  pluginOptions: PluginOptions;
  options: PluginOptions;
  sqipConfig: SqipConfig;
}
interface SqipPluginInterface {
  sqipConfig: SqipConfig;
  apply(
    imageBuffer: Buffer,
    metadata?: SqipImageMetadata
  ): Promise<Buffer> | Buffer;
}
export class SqipPlugin implements SqipPluginInterface {
  public sqipConfig: SqipConfig;
  public options: PluginOptions;
  static cliOptions: SqipCliOptionDefinition[];

  constructor(options: SqipPluginOptions) {
    const { sqipConfig } = options;
    this.sqipConfig = sqipConfig || ({} as SqipConfig);
    this.options = {};
  }
  apply(
    imageBuffer: Buffer,
    metadata: SqipImageMetadata
  ): Promise<Buffer> | Buffer {
    console.log(metadata);
    return imageBuffer;
  }
}
