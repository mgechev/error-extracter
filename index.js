/** @ts-check */

const ts = require("typescript");
const { writeFileSync, readFileSync, readdirSync, statSync } = require("fs");
const { convertArrayToCSV } = require('convert-array-to-csv');

const { join } = require("path");
const dir = process.argv.pop();

function* traverseTree(currentDir) {
  const content = readdirSync(currentDir);
  for (const node of content) {
    if (node.startsWith(".")) {
      continue;
    }
    const nodePath = join(currentDir, node);
    if (statSync(nodePath).isDirectory()) {
      yield* traverseTree(nodePath);
      continue;
    }
    if (nodePath.endsWith(".ts")) {
      yield nodePath;
      continue;
    }
  }
}

/**
 *
 * @param {ts.NewExpression} node
 */
const parseErrorMessage = (node, sourceFile) => {
  if (node.arguments && node.arguments[0]) {
    return node.arguments[0].getFullText(sourceFile);
  }
  // Here we're rethrowing an error
  // throw error;
  if (
    !node.expression &&
    node.kind === ts.SyntaxKind.Identifier
  ) {
    return null;
  }
  return node.getFullText(sourceFile);
};

/**
 *
 * @param {ts.Node} node
 */
const generateErrorStrings = (node, sourceFile = node, result = []) => {
  if (node.kind === ts.SyntaxKind.ThrowStatement) {
    const message = parseErrorMessage(node.expression, sourceFile);
    if (message) {
      result.push([message, sourceFile.fileName]);
    }
    return result;
  }
  ts.forEachChild(node, (current) => {
    generateErrorStrings(current, sourceFile, result);
  });
  return result;
};

function* extractErrors(dir) {
  for (const file of traverseTree(dir)) {
    const sourceFile = ts.createSourceFile(
      file,
      readFileSync(file).toString(),
      ts.ScriptTarget.ES2015
    );
    for (const error of generateErrorStrings(sourceFile)) {
      yield error;
    }
  }
}

const result = [];
for (const error of extractErrors(dir)) {
  result.push(`"${error[0].trim().replace('\n', '').replace('"', '')}","${error[1]}"`);
}

writeFileSync('out.csv', result.join('\n'));
