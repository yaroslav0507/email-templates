const fs = require('fs');
const ejs = require('ejs');
const juice = require('juice');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');

class PreflightPlugin {
  constructor(options) {
    this.options = Object.assign({
      template: './src/index.ejs',
      directories: ['./src/templates'],
      inlinePseudoElements: true,
    }, options);

    this.templates = {};

    this.options.directories.forEach((dir) => {
      fs.readdirSync(dir).forEach(fileName => {
        this.templates[fileName] = path.resolve('.', dir, fileName);
      });
    });
  }

  apply(compiler) {
    new HtmlWebpackInlineSourcePlugin().apply(compiler);

    Object.entries(this.templates).forEach(([filename, path]) => {
      const fileContent = fs.readFileSync(path, {encoding: 'utf-8'});

      return new HtmlWebpackPlugin({
        template: this.options.template,
        filename: filename.replace('ejs', 'html'),
        body: ejs.render(fileContent, {filename}),
        inlineSource: '.css$',
        minify: true,
      }).apply(compiler);
    });

    compiler.plugin('emit', (compilation, done) => {
      Object.entries(compilation.assets).forEach(([filename, asset]) => {
        if (filename.endsWith('.html')) {
          let compiled = filename.replace('.html', '') + '_compiled.html';
          let source = juice(asset.source(), {
            inlinePseudoElements: this.options.inlinePseudoElements,
          });

          compilation.assets[filename] = {
            source: () => source,
            size: () => Buffer.byteLength(source, 'utf8')
          };
        }
      });

      done();
    });
  }
}

module.exports = PreflightPlugin;
