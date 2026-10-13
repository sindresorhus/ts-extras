import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const sourceDirectory = fileURLToPath(new URL('../source/', import.meta.url));
const rootDirectory = fileURLToPath(new URL('../', import.meta.url));

const sourceFiles = readdirSync(sourceDirectory).filter(file => file.endsWith('.ts'));

function exampleBlocks(text: string): Array<{line: number; code: string}> {
	return [...text.matchAll(/@example\n```\n(.*?)```/gsv)].map(match => ({
		line: text.slice(0, match.index).split('\n').length,
		code: match[1]!,
	}));
}

// Every check below iterates these, so a pattern that stopped matching would leave them all passing over nothing. One block is found per `@example` tag, and the tags are counted separately so a change to the doc format cannot quietly empty the list.
function allExampleBlocks(): Array<{file: string; line: number; code: string}> {
	const blocks: Array<{file: string; line: number; code: string}> = [];

	for (const file of sourceFiles) {
		const text = readFileSync(sourceDirectory + file, 'utf8');
		// Anchored to a line, so an address like `sindre@example.com` in a block of example code is not counted as a tag. The leading `*` is optional because this repo's doc comments do not carry one.
		const tags = [...text.matchAll(/^(?:\/\*\*|\s*\*)?\s*@example\b/gmv)].length;
		const found = exampleBlocks(text);
		assert.equal(found.length, tags, `${file} has ${tags} @example tags but ${found.length} blocks were found`);

		for (const block of found) {
			blocks.push({file, ...block});
		}
	}

	assert.ok(blocks.length > 0, 'no @example block was found in any source file');

	return blocks;
}

// The names the package exports, from the entry point.
const exportedNames = [...readFileSync(sourceDirectory + 'index.ts', 'utf8').matchAll(/^export (?:type )?\{(\w+)\}/gmv)].map(match => match[1]!);

test('every documented example imports what it uses', () => {
	assert.ok(exportedNames.length > 0, 'no export was found in the entry point');

	// A block that uses an exported name without importing it is a broken example, and it is the failure mode that is easiest to introduce and hardest to spot.
	for (const {file, line, code} of allExampleBlocks()) {
		const imported = new Set([...code.matchAll(/^import (?:type )?\{([^\}]*)\} from 'ts-extras';$/gmv)].flatMap(match => match[1]!.split(',').map(name => name.trim())));
		// Imports, comments and string literals are not uses.
		const body = code.replaceAll(/^import .*$/gmv, '').replaceAll(/\/\/.*$/gmv, '').replaceAll(/'[^\n']*'/gv, '\'\'');

		for (const name of exportedNames) {
			if (new RegExp(String.raw`(?<![.\w])${name}\b`, 'v').test(body)) {
				assert.ok(imported.has(name), `${file}:${line} uses \`${name}\` without importing it`);
			}
		}
	}
});

// A `//   ^? Type` line claims the exact type of the nearest `const` declared above it. Each claim becomes a declaration that only compiles when the two types are identical, so a wrong claim fails the type-check below.
function withTypeClaimsChecked(code: string, location: string): string {
	let latestConstant: string | undefined;
	let claimCount = 0;

	const lines = code.split('\n').map(line => {
		const declaration = /^const (\w+)\b/v.exec(line);
		if (declaration) {
			latestConstant = declaration[1];
			return line;
		}

		const claim = /^\/\/\s+\^\? (.+)$/v.exec(line);
		if (!claim) {
			return line;
		}

		assert.ok(latestConstant, `${location} has a type claim with no \`const\` above it`);
		claimCount++;
		return `const typeClaim${claimCount}: IsExactTypeClaim<typeof ${latestConstant}, ${claim[1]}> = true;`;
	});

	return [
		'type IsExactTypeClaim<Actual, Expected> = (<T>() => T extends Actual ? 1 : 2) extends (<T>() => T extends Expected ? 1 : 2) ? true : false;',
		...lines,
	].join('\n');
}

test('every documented example type-checks', () => {
	// The examples are compiled in memory against the source, with `ts-extras` mapped to the entry point.
	const examples = new Map(allExampleBlocks().map(({file, line, code}) => [
		path.join(rootDirectory, 'examples', `${file.replace(/\.ts$/v, '')}-${line}.ts`),
		`export {};\n${withTypeClaimsChecked(code, `${file}:${line}`)}`,
	]));

	// The claim check must not silently match nothing.
	assert.match([...examples.values()].join('\n'), /const typeClaim1:/v, 'no `^?` type claim was found in any example');

	const {config} = ts.readConfigFile(path.join(rootDirectory, 'tsconfig.json'), ts.sys.readFile) as {config: unknown};
	const {options} = ts.parseJsonConfigFileContent(config, ts.sys, rootDirectory);
	const compilerOptions: ts.CompilerOptions = {
		...options,
		noEmit: true,
		// An example declares values to show their types, and does not always read them.
		noUnusedLocals: false,
		skipLibCheck: true,
		rootDir: rootDirectory,
		types: ['node'],
		paths: {'ts-extras': [path.join(sourceDirectory, 'index.ts')]},
	};

	const host = ts.createCompilerHost(compilerOptions);
	const {getSourceFile, fileExists, readFile} = host;
	host.getSourceFile = (fileName, languageVersion, ...rest) => {
		const code = examples.get(fileName);
		return code === undefined ? getSourceFile(fileName, languageVersion, ...rest) : ts.createSourceFile(fileName, code, languageVersion);
	};

	host.fileExists = fileName => examples.has(fileName) || fileExists(fileName);
	host.readFile = fileName => examples.get(fileName) ?? readFile(fileName);

	const program = ts.createProgram([...examples.keys()], compilerOptions, host);
	const diagnostics = ts.getPreEmitDiagnostics(program);

	assert.equal(ts.formatDiagnostics(diagnostics, host), '');
});

test('every documented example is non-empty', () => {
	for (const {file, line, code} of allExampleBlocks()) {
		assert.ok(code.trim().length > 0, `${file}:${line} is empty`);
	}
});
