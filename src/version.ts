import packageJson from "../package.json" with { type: "json" };

export const TOOL_VERSION = packageJson.version;
