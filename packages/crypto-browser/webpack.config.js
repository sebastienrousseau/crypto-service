const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
// const UglifyJsPlugin = require("uglifyjs-webpack-plugin");

module.exports = {
  mode: "production",
  entry: {
    "crypto-server": ["../crypto-server/lib/server.js"],
    "crypto-core": ["../crypto-core/lib/index.js"],
  },
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: 'bundle.js'
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 5,
          parse: {},
          compress: {passes: 2,},
          mangle: true, // Note `mangle.properties` is `false` by default.
          module: false,
        },
      }),
    ],
  },
  // optimization: {
  //   minimizer: [
  //     new UglifyJsPlugin({
  //       uglifyOptions: {
  //         ecma: 5,
  //         compress: {
  //           passes: 2,
  //         },
  //         output: {
  //           beautify: false,
  //         },
  //         mangle: true,
  //       },
  //     }),
  //   ],
  // },
  output: {
    library: "crypto-core",
    filename: "index.js",
    path: path.resolve(__dirname, "./lib"),
    libraryTarget: "umd",
    umdNamedDefine: true,
  },
  resolve: {
    alias: {
      "path": path.resolve(__dirname, "browser-mocks/path"),
      "fs": path.resolve(__dirname, "browser-mocks/fs"),
      "uglify-js": path.resolve(__dirname, "browser-mocks/uglify-js"),
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: path.join(__dirname, "node_modules"),
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: [
                [
                  "@babel/preset-env",
                  {
                    loose: true,
                  }
                ]
              ],
              plugins: [
                ["@babel/plugin-proposal-decorators", { "legacy": true }],
                ["@babel/plugin-proposal-class-properties", { "loose": true }],
                ["@babel/plugin-proposal-function-bind", { "loose": true }],
                ["@babel/plugin-proposal-export-default-from", { "loose": true }]
              ],
              babelrc: false,
            },
          },
        ],
      },
  	],
  },
};
