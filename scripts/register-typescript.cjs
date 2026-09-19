const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function(name, parent, ...args) {
  if (name.startsWith('.') && name.endsWith('.js') && parent?.filename) {
    const source = path.resolve(path.dirname(parent.filename), name.slice(0, -3) + '.ts');
    if (fs.existsSync(source)) return source;
  }
  return resolveFilename.call(this, name, parent, ...args);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
