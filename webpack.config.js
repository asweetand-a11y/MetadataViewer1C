const path = require('path');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const shared = {
  mode: 'production',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.m?js$/,
        include: /node_modules[\\/](@vscode-elements|@lit)[\\/]/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.webview.json',
              compilerOptions: {
                module: 'esnext',
                target: 'es2020',
              }
            }
          }
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fullySpecified: false,
  },
  optimization: {
    minimize: true,
    minimizer: ['...'],
    usedExports: true,
    // Lit custom elements регистрируются через side effects
    sideEffects: true,
    splitChunks: false,
    moduleIds: 'deterministic',
    runtimeChunk: false,
  },
  experiments: {
    topLevelAwait: true,
  },
};

module.exports = [
  {
    ...shared,
    entry: './src/webview/index.tsx',
    plugins: [
      new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
      ...(process.env.ANALYZE ? [new BundleAnalyzerPlugin()] : [])
    ],
    output: {
      filename: 'metadataEditor.bundle.js',
      path: path.resolve(__dirname, 'media'),
      library: 'MetadataEditor',
      libraryTarget: 'umd',
    },
    externals: {
      vscode: 'commonjs vscode',
      'fast-glob': 'commonjs fast-glob',
    },
  },
  {
    ...shared,
    entry: './src/webview/configWebview.ts',
    plugins: [
      new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
    ],
    output: {
      filename: 'configWebview.bundle.js',
      path: path.resolve(__dirname, 'media'),
    },
    externals: {
      vscode: 'commonjs vscode',
    },
  },
];
