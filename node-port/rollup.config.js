import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

// External dependencies (don't bundle)
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  "date-fns/addSeconds",
  "date-fns/getISOWeek",
  "date-fns/getISOWeekYear",
  "date-fns/setISOWeek",
  "date-fns/startOfISOWeek",
  "date-fns/startOfISOWeekYear",
  "date-fns/subSeconds",
  "date-fns-tz/formatInTimeZone",
  "date-fns-tz/fromZonedTime",
  "date-fns-tz/toZonedTime",
];

// Common plugins
const commonPlugins = [
  resolve({
    preferBuiltins: true,
    exportConditions: ["node", "import", "require", "default"],
  }),
  commonjs(),
  typescript({
    tsconfig: "./tsconfig.build.json",
    declaration: false,
    declarationMap: false,
  }),
];

export default [
  // ESM Build (Modern, tree-shakeable)
  {
    input: "src/index.ts",
    output: {
      file: pkg.module || "dist/index.mjs",
      format: "esm",
      sourcemap: true,
      exports: "named",
    },
    external,
    plugins: commonPlugins,
  },

  // CommonJS Build (Node.js compatibility)
  {
    input: "src/index.ts",
    output: {
      file: pkg.main || "dist/index.cjs",
      format: "cjs",
      sourcemap: true,
      exports: "named",
      interop: "auto",
    },
    external,
    plugins: commonPlugins,
  },

  // Browser Build (UMD, for script tags)
  {
    input: "src/index.ts",
    output: {
      file: "dist/jcron.umd.js",
      format: "umd",
      name: "JCRON",
      sourcemap: true,
      exports: "named",
      globals: {
        "date-fns": "dateFns",
        "date-fns-tz": "dateFnsTz",
        dayjs: "dayjs",
        uuid: "uuid",
      },
    },
    external,
    plugins: commonPlugins,
  },

  // Browser Build Minified
  {
    input: "src/index.ts",
    output: {
      file: "dist/jcron.umd.min.js",
      format: "umd",
      name: "JCRON",
      sourcemap: true,
      exports: "named",
      globals: {
        "date-fns": "dateFns",
        "date-fns-tz": "dateFnsTz",
        dayjs: "dayjs",
        uuid: "uuid",
      },
    },
    external,
    plugins: [...commonPlugins, terser()],
  },
];
