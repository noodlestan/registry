#!/usr/bin/env node
/**
 * Inventory Registry Inputs — read-only inventory generator.
 *
 * Discovers every checkout under `$WORKSPACE/checkouts/`, cross-checks each one
 * against the registered checkout and repository records under
 * `$WORKSPACE/_records/`, reads every root and nested `package.json` plus the
 * repository, project, package, and `Package Dependency Set` records that
 * describe those manifests, and writes one `inputs.json` per checkout plus the
 * data dictionary (`README.md`) into `$REGISTRY/temp/data/`.
 *
 * The script is strictly read-only with respect to checkouts, manifests, and
 * records. The only files it creates or replaces are the per-checkout
 * `inputs.json` outputs and the `README.md` under this repository's `temp/data`
 * directory.
 *
 * Blocker conditions (an unmatched checkout, an unresolved or unsafe repository
 * canonical, or two checkouts resolving to the same output path) abort the run
 * with exit code 2 and write nothing.
 *
 * The generator lays its outputs out with the repository's own Prettier (when
 * installed) so a fresh run stays `npm run lint`-clean; formatting never
 * changes observed values.
 *
 * Usage (from `$WORKSPACE`):
 *   node checkouts/registry/scripts/inventory-registry-inputs.mjs
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 1;
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_PATH);
const REGISTRY_ROOT = resolve(SCRIPT_DIR, '..');
const WORKSPACE_ROOT = resolve(REGISTRY_ROOT, '..', '..');
const CHECKOUTS_ROOT = join(WORKSPACE_ROOT, 'checkouts');
const WORKSPACE_RECORDS = join(WORKSPACE_ROOT, '_records');
const CHECKOUT_RECORDS_DIR = join(WORKSPACE_RECORDS, 'checkouts');
const REPOSITORY_RECORDS_DIR = join(WORKSPACE_RECORDS, 'repositories');
const DATA_DIR = join(REGISTRY_ROOT, 'temp', 'data');
const README_PATH = join(DATA_DIR, 'README.md');

/** Generated/vendor and tool directories that never hold inventory sources. */
const EXCLUDED_DIR_NAMES = new Set([
	'.git',
	'node_modules',
	'dist',
	'build',
	'coverage',
	'generated',
	'vendor',
]);

const CANONICAL_PATTERN = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

// ---------------------------------------------------------------------------
// Small parsing helpers
// ---------------------------------------------------------------------------

/**
 * Removes the backticks that fully enclose a scalar value, as written in the
 * record. Values are never otherwise rewritten.
 */
function stripOuterBackticks(value) {
	const trimmed = value.trim();
	const match = /^`([\s\S]*)`$/.exec(trimmed);
	return match ? match[1] : trimmed;
}

function toPosix(relativePath) {
	return relativePath.split(sep).join('/');
}

function isBulletLine(line) {
	return /^[ \t]*-([ \t]|$)/.test(line);
}

/**
 * Parses a record file into sections. Every heading is a section; headings
 * shaped `{Kind}: {Name}` also carry `kind` and `name`. Fields are the
 * `**Name:** value` declarations inside a section; the lines that follow a
 * field (until the next field or heading) are its content. Blank lines are not
 * preserved.
 */
function parseRecordSections(text) {
	const lines = text.replace(/^﻿/, '').split(/\r?\n/);
	const sections = [];
	let current = null;
	let currentField = null;

	for (const line of lines) {
		const heading = /^(#{1,6})[ \t]+(.*?)\s*$/.exec(line);
		if (heading) {
			const headingText = heading[2];
			const resource = /^(.+?):[ \t]+(.+)$/.exec(headingText);
			current = {
				level: heading[1].length,
				heading: headingText,
				kind: resource ? resource[1].trim() : null,
				name: resource ? resource[2].trim() : null,
				fields: [],
			};
			sections.push(current);
			currentField = null;
			continue;
		}
		if (!current) continue;
		const field = /^\*\*(.+?):\*\*[ \t]*(.*)$/.exec(line);
		if (field) {
			currentField = {
				name: field[1].trim(),
				inline: field[2].trim(),
				lines: [],
			};
			current.fields.push(currentField);
			continue;
		}
		if (currentField && line.trim() !== '') {
			currentField.lines.push(line);
		}
	}
	return sections;
}

function findSection(sections, kind) {
	return sections.find(section => section.kind === kind) || null;
}

function findField(section, fieldName) {
	if (!section) return null;
	return section.fields.find(field => field.name === fieldName) || null;
}

/**
 * Reads a record field as an identity/locator value.
 *
 * - field absent: `null`
 * - field with bullet lines (and no inline text): the bullet contents as a
 *   list, with the marker and indentation removed and enclosing backticks
 *   stripped
 * - any other field: the text as written, with enclosing backticks stripped
 *
 * When a field carries both inline text and bullets the whole block is kept as
 * scalar text (this shape does not occur in the inventoried records).
 */
function identityValue(section, fieldName) {
	const field = findField(section, fieldName);
	if (!field) return null;
	const contentLines = field.lines.filter(line => line.trim() !== '');
	const bulletLines = contentLines.filter(line => isBulletLine(line));
	if (bulletLines.length > 0 && field.inline === '') {
		return bulletLines.map(line => stripOuterBackticks(line.replace(/^[ \t]*-[ \t]*/, '')));
	}
	const rest = contentLines.join('\n').trim();
	const full = field.inline ? (rest ? `${field.inline}\n${rest}` : field.inline) : rest;
	return stripOuterBackticks(full);
}

/**
 * Reads a record boolean. Values written as `true`/`false` (optionally
 * backticked) become JSON booleans; any other observed text stays text.
 */
function identityBoolean(section, fieldName) {
	const value = identityValue(section, fieldName);
	if (value === null || Array.isArray(value)) return value;
	if (value === 'true') return true;
	if (value === 'false') return false;
	return value;
}

/** Reads the raw bullet lines of a record field, verbatim, or `null`. */
function rawListLines(section, fieldName) {
	const field = findField(section, fieldName);
	if (!field) return null;
	return field.lines;
}

/**
 * Builds the `fields` object of a `Package Dependency Set` declaration.
 * List fields keep the record's bullet lines verbatim (indentation included);
 * scalar fields keep the text as written with enclosing backticks stripped.
 */
function buildDeclarationFields(section) {
	const fields = {};
	for (const field of section.fields) {
		const contentLines = field.lines.filter(line => line.trim() !== '');
		const hasBullets = contentLines.some(line => isBulletLine(line));
		if (hasBullets && field.inline === '') {
			fields[field.name] = field.lines;
		} else {
			const rest = field.lines.join('\n').trim();
			fields[field.name] = stripOuterBackticks(
				field.inline ? (rest ? `${field.inline}\n${rest}` : field.inline) : rest,
			);
		}
	}
	return fields;
}

// ---------------------------------------------------------------------------
// Identity builders (the identity and locator fields of each record kind)
// ---------------------------------------------------------------------------

function repositoryIdentity(section) {
	return {
		name: section ? section.name : null,
		canonical: identityValue(section, 'Canonical'),
		remote: identityValue(section, 'Remote'),
		owner: identityValue(section, 'Owner'),
		packageFile: identityValue(section, 'PackageFile'),
		private: identityBoolean(section, 'Private'),
		workspaces: identityValue(section, 'Workspaces'),
	};
}

function projectIdentity(section) {
	return {
		name: section ? section.name : null,
		owner: identityValue(section, 'Owner'),
		repository: identityValue(section, 'Repository'),
		code: identityValue(section, 'Code'),
		private: identityBoolean(section, 'Private'),
	};
}

function packageIdentity(section) {
	return {
		name: section ? section.name : null,
		canonicalName: identityValue(section, 'Canonical Name'),
		path: identityValue(section, 'Path'),
		packageFile: identityValue(section, 'PackageFile'),
		namespace: identityValue(section, 'Namespace'),
		owner: identityValue(section, 'Owner'),
		private: identityBoolean(section, 'Private'),
		published: identityBoolean(section, 'Published'),
	};
}

// ---------------------------------------------------------------------------
// Checkout walking: manifest and record discovery
// ---------------------------------------------------------------------------

function shouldSkipDirectory(name) {
	return name.startsWith('.') || EXCLUDED_DIR_NAMES.has(name);
}

/**
 * Walks one checkout without following symlinks and without descending into
 * generated/vendor directories. Returns:
 * - `manifests`: every root and nested `package.json`, checkout-relative
 * - `recordFiles`: every file under any `_records/` directory, checkout-relative
 */
function walkCheckout(checkoutAbs) {
	const manifests = [];
	const recordFiles = [];

	const collectRecordFiles = (recordAbs, recordRel) => {
		const stack = [[recordAbs, recordRel]];
		while (stack.length > 0) {
			const [dirAbs, dirRel] = stack.pop();
			let entries;
			try {
				entries = readdirSync(dirAbs, { withFileTypes: true });
			} catch {
				continue;
			}
			for (const entry of entries) {
				if (entry.isSymbolicLink()) continue;
				const childRel = `${dirRel}/${entry.name}`;
				if (entry.isDirectory()) {
					if (shouldSkipDirectory(entry.name)) continue;
					stack.push([join(dirAbs, entry.name), childRel]);
				} else if (entry.isFile()) {
					recordFiles.push(childRel);
				}
			}
		}
	};

	const visit = (dirAbs, dirRel) => {
		let entries;
		try {
			entries = readdirSync(dirAbs, { withFileTypes: true });
		} catch {
			return;
		}
		entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
		for (const entry of entries) {
			if (entry.isSymbolicLink()) continue;
			const childRel = dirRel ? `${dirRel}/${entry.name}` : entry.name;
			if (entry.isDirectory()) {
				if (entry.name === '_records') {
					collectRecordFiles(join(dirAbs, entry.name), childRel);
					continue;
				}
				if (shouldSkipDirectory(entry.name)) continue;
				visit(join(dirAbs, entry.name), childRel);
			} else if (entry.isFile() && entry.name === 'package.json') {
				manifests.push(childRel);
			}
		}
	};

	visit(checkoutAbs, '');
	manifests.sort();
	recordFiles.sort();
	return { manifests, recordFiles };
}

// ---------------------------------------------------------------------------
// Source snapshot
// ---------------------------------------------------------------------------

function gitOutput(checkoutAbs, args) {
	try {
		return execFileSync('git', ['-C', checkoutAbs, ...args], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		});
	} catch {
		return null;
	}
}

/** Captures `HEAD` and the dirty paths of a source checkout as observed. */
function captureSourceSnapshot(checkoutAbs, issues) {
	const capturedAt = new Date().toISOString();

	const rev = gitOutput(checkoutAbs, ['rev-parse', 'HEAD']);
	const commit = rev !== null && rev.trim() !== '' ? rev.trim() : null;

	const dirtyPaths = [];
	const status = gitOutput(checkoutAbs, ['status', '--porcelain', '-z']);
	if (status !== null) {
		const tokens = status.split('\0');
		for (let index = 0; index < tokens.length; index += 1) {
			const entry = tokens[index];
			if (!entry) continue;
			const code = entry.slice(0, 2);
			const path = entry.slice(3);
			if (code.includes('R') || code.includes('C')) {
				index += 1; // rename/copy: the original path follows as the next token
			}
			dirtyPaths.push(path);
		}
		dirtyPaths.sort();
	}

	if (commit === null || status === null) {
		issues.push({
			sourcePath: null,
			code: 'source-snapshot-unavailable',
			message:
				'git could not report the full source snapshot for this checkout ' +
				`(commit: ${commit === null ? 'unavailable' : 'reported'}).`,
		});
	}

	return { capturedAt, commit, dirtyPaths };
}

// ---------------------------------------------------------------------------
// Registered workspace records
// ---------------------------------------------------------------------------

function loadRegisteredCheckoutRecords() {
	const records = [];
	const files = readdirSync(CHECKOUT_RECORDS_DIR, { withFileTypes: true })
		.filter(entry => entry.isFile() && !entry.name.startsWith('.'))
		.map(entry => entry.name)
		.sort();
	for (const file of files) {
		const abs = join(CHECKOUT_RECORDS_DIR, file);
		const sections = parseRecordSections(readFileSync(abs, 'utf8'));
		const section = findSection(sections, 'Checkout');
		if (!section) continue;
		records.push({
			abs,
			file,
			name: section.name,
			repository: identityValue(section, 'Repository'),
			location: identityValue(section, 'Location'),
		});
	}
	return records;
}

function loadRegisteredRepositoryRecords() {
	const byName = new Map();
	const files = readdirSync(REPOSITORY_RECORDS_DIR, { withFileTypes: true })
		.filter(entry => entry.isFile() && !entry.name.startsWith('.'))
		.map(entry => entry.name)
		.sort();
	for (const file of files) {
		const abs = join(REPOSITORY_RECORDS_DIR, file);
		const sections = parseRecordSections(readFileSync(abs, 'utf8'));
		const section = findSection(sections, 'Repository');
		if (!section || !section.name) continue;
		const stem = file.replace(/\.[^.]+$/, '');
		const canonicalRaw = identityValue(section, 'Canonical');
		const canonical =
			canonicalRaw === null || Array.isArray(canonicalRaw)
				? null
				: canonicalRaw === ''
					? null
					: canonicalRaw;
		const list = byName.get(section.name) || [];
		list.push({ abs, file, stem, canonical });
		byName.set(section.name, list);
	}
	return byName;
}

// ---------------------------------------------------------------------------
// Cross-check: checkouts, checkout records, repository canonicals
// ---------------------------------------------------------------------------

const blockers = [];

function addBlocker(code, message) {
	blockers.push({ code, message });
}

function workspaceRelative(absPath) {
	return toPosix(relative(WORKSPACE_ROOT, absPath));
}

function resolveCheckoutTargets() {
	const checkoutRecords = loadRegisteredCheckoutRecords();
	const repositoryRecords = loadRegisteredRepositoryRecords();

	const checkoutDirs = readdirSync(CHECKOUTS_ROOT, { withFileTypes: true })
		.filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && !entry.isSymbolicLink())
		.map(entry => entry.name)
		.sort();

	const targets = [];
	const canonicalOwners = new Map();
	const matchedRecordFiles = new Set();

	for (const dirName of checkoutDirs) {
		const matches = checkoutRecords.filter(record => record.location === dirName);
		if (matches.length === 0) {
			addBlocker(
				'unmatched-checkout',
				`Checkout \`checkouts/${dirName}\` has no registered checkout record ` +
					`in \`_records/checkouts/\` declaring \`Location:\` \`${dirName}\`.`,
			);
			continue;
		}
		if (matches.length > 1) {
			addBlocker(
				'duplicate-checkout-record',
				`Checkout \`checkouts/${dirName}\` matches more than one registered ` +
					`checkout record: ${matches.map(record => `_records/checkouts/${record.file}`).join(', ')}.`,
			);
			continue;
		}
		const checkoutRecord = matches[0];
		matchedRecordFiles.add(checkoutRecord.file);

		if (!checkoutRecord.repository) {
			addBlocker(
				'unresolved-repository-canonical',
				`Checkout record \`_records/checkouts/${checkoutRecord.file}\` ` +
					'declares no `Repository:` field; the checkout has no resolvable canonical.',
			);
			continue;
		}

		const candidates = repositoryRecords.get(checkoutRecord.repository) || [];
		if (candidates.length === 0) {
			addBlocker(
				'unresolved-repository-canonical',
				`Checkout \`checkouts/${dirName}\` references repository ` +
					`\`${checkoutRecord.repository}\` but no registered repository record ` +
					'in `_records/repositories/` declares that name.',
			);
			continue;
		}

		const canonicals = [...new Set(candidates.map(candidate => candidate.canonical))];
		if (canonicals.length !== 1 || canonicals[0] === null) {
			addBlocker(
				'unresolved-repository-canonical',
				`Repository \`${checkoutRecord.repository}\` (checkout \`checkouts/${dirName}\`) ` +
					`has unresolved or disagreeing canonicals ` +
					`(${canonicals.map(value => (value === null ? 'missing' : `\`${value}\``)).join(', ')}) ` +
					`across ${candidates.map(candidate => `_records/repositories/${candidate.file}`).join(', ')}.`,
			);
			continue;
		}
		const canonical = canonicals[0];
		if (
			!CANONICAL_PATTERN.test(canonical) ||
			canonical.split('/').some(part => part === '.' || part === '..')
		) {
			addBlocker(
				'unsafe-repository-canonical',
				`Repository \`${checkoutRecord.repository}\` (checkout \`checkouts/${dirName}\`) ` +
					`resolves to canonical \`${canonical}\`, which is not a safe \`owner/repository\` slug.`,
			);
			continue;
		}

		const primary = candidates.find(candidate => candidate.stem === dirName) || candidates[0];

		let workspaceIssue = null;
		if (candidates.length > 1) {
			workspaceIssue = {
				sourcePath: null, // filled in relative to the checkout when building
				code: 'duplicate-repository-record',
				message:
					`Registered repository records for \`${checkoutRecord.repository}\` are ` +
					`duplicated (${candidates
						.map(candidate => `_records/repositories/${candidate.file}`)
						.join(', ')}); all declare canonical \`${canonical}\`. ` +
					`\`coverage.repositoryRecordPath\` cites \`_records/repositories/${primary.file}\`.`,
			};
		}

		const previousOwner = canonicalOwners.get(canonical);
		if (previousOwner) {
			addBlocker(
				'duplicate-repository-canonical',
				`Checkouts \`${previousOwner}\` and \`${dirName}\` both resolve to canonical ` +
					`\`${canonical}\`; the inventories would overwrite each other at ` +
					`\`temp/data/${canonical}/inputs.json\`.`,
			);
			continue;
		}
		canonicalOwners.set(canonical, dirName);

		targets.push({
			dirName,
			checkoutRecord,
			canonical,
			primaryRepositoryFile: primary.file,
			workspaceIssue,
		});
	}

	for (const record of checkoutRecords) {
		if (record.location && matchedRecordFiles.has(record.file)) continue;
		if (checkoutDirs.includes(record.location || '')) continue;
		addBlocker(
			'unmatched-checkout-record',
			`Registered checkout record \`_records/checkouts/${record.file}\` ` +
				(record.location
					? `declares \`Location:\` \`${record.location}\` but \`checkouts/${record.location}\` does not exist.`
					: 'declares no `Location:` field.'),
		);
	}

	return targets;
}

// ---------------------------------------------------------------------------
// Per-checkout inventory
// ---------------------------------------------------------------------------

function readRecordSection(absPath, kind) {
	const sections = parseRecordSections(readFileSync(absPath, 'utf8'));
	return findSection(sections, kind);
}

function normalizePackagePath(value) {
	if (value === null || Array.isArray(value)) return null;
	let normalized = value.trim();
	if (normalized.startsWith('./')) normalized = normalized.slice(2);
	while (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
	return normalized;
}

function manifestDirectoryOf(manifestPath) {
	const cut = manifestPath.lastIndexOf('/');
	return cut === -1 ? '' : manifestPath.slice(0, cut);
}

function buildInventory(target) {
	const checkoutAbs = join(CHECKOUTS_ROOT, target.dirName);
	const issues = [];

	const checkoutRelative = absPath => toPosix(relative(checkoutAbs, absPath));
	const pushIssue = issue => {
		issues.push(issue);
	};

	if (target.workspaceIssue) {
		pushIssue({
			...target.workspaceIssue,
			sourcePath: checkoutRelative(join(REPOSITORY_RECORDS_DIR, target.primaryRepositoryFile)),
		});
	}

	const { manifests: discovered, recordFiles } = walkCheckout(checkoutAbs);
	const sourceSnapshot = captureSourceSnapshot(checkoutAbs, issues);

	// --- registered records cited in coverage -------------------------------
	const checkoutRecordPath = checkoutRelative(target.checkoutRecord.abs);
	const repositoryRecordPath = checkoutRelative(
		join(REPOSITORY_RECORDS_DIR, target.primaryRepositoryFile),
	);

	// --- co-located repository record ---------------------------------------
	let repositoryRecord = null;
	let repositorySection = null;
	const repositoryRecordAbs = join(checkoutAbs, '_records', 'repository.art');
	const repositoryRecordPathLocal = '_records/repository.art';
	if (existsSync(repositoryRecordAbs)) {
		const section = readRecordSection(repositoryRecordAbs, 'Repository');
		repositorySection = section;
		if (!section) {
			pushIssue({
				sourcePath: repositoryRecordPathLocal,
				code: 'malformed-record',
				message: `\`${repositoryRecordPathLocal}\` has no \`## Repository:\` section.`,
			});
		}
		const identity = repositoryIdentity(section);
		repositoryRecord = { path: repositoryRecordPathLocal, identity };
		if (
			identity.canonical !== null &&
			!Array.isArray(identity.canonical) &&
			identity.canonical !== target.canonical
		) {
			pushIssue({
				sourcePath: repositoryRecordPathLocal,
				code: 'repository-canonical-conflict',
				message:
					`\`${repositoryRecordPathLocal}\` declares canonical ` +
					`\`${identity.canonical}\` but the registered repository record ` +
					`resolves to \`${target.canonical}\`. Both values are preserved as observed.`,
			});
		}
	} else {
		pushIssue({
			sourcePath: repositoryRecordPathLocal,
			code: 'missing-checkout-repository-record',
			message:
				`Checkout has no \`${repositoryRecordPathLocal}\`; manifests carry ` +
				'`repositoryRecord: null` and ' +
				'`coverage.repositoryRecordPath` cites the registered workspace record.',
		});
	}

	// --- co-located project record ------------------------------------------
	let projectRecord = null;
	const projectRecordAbs = join(checkoutAbs, '_records', 'project.art');
	const projectRecordPathLocal = '_records/project.art';
	if (existsSync(projectRecordAbs)) {
		const section = readRecordSection(projectRecordAbs, 'Project');
		if (!section) {
			pushIssue({
				sourcePath: projectRecordPathLocal,
				code: 'malformed-record',
				message: `\`${projectRecordPathLocal}\` has no \`## Project:\` section.`,
			});
		}
		projectRecord = { path: projectRecordPathLocal, identity: projectIdentity(section) };
	} else {
		pushIssue({
			sourcePath: projectRecordPathLocal,
			code: 'missing-project-record',
			message: `Checkout has no \`${projectRecordPathLocal}\`; manifests carry \`projectRecord: null\`.`,
		});
	}

	// --- dependency set declarations ----------------------------------------
	const declarationsByName = new Map();
	for (const recordPath of recordFiles) {
		const absPath = join(checkoutAbs, recordPath);
		let sections;
		try {
			sections = parseRecordSections(readFileSync(absPath, 'utf8'));
		} catch (error) {
			pushIssue({
				sourcePath: recordPath,
				code: 'malformed-record',
				message: `Record file could not be read (${error.message}).`,
			});
			continue;
		}
		for (const section of sections) {
			if (section.kind !== 'Package Dependency Set' || !section.name) continue;
			const declaration = {
				name: section.name,
				path: recordPath,
				fields: buildDeclarationFields(section),
			};
			const list = declarationsByName.get(section.name) || [];
			list.push(declaration);
			declarationsByName.set(section.name, list);
		}
	}
	for (const [name, declarations] of declarationsByName) {
		if (declarations.length < 2) continue;
		pushIssue({
			sourcePath: declarations[1].path,
			code: 'duplicate-dependency-set-declaration',
			message:
				`Multiple \`## Package Dependency Set: ${name}\` declarations ` +
				`(${declarations.map(declaration => declaration.path).join(', ')}); ` +
				'all are preserved as observed.',
		});
	}

	// --- package records ------------------------------------------------------
	const packageRecords = [];
	for (const recordPath of recordFiles) {
		if (!/(^|\/)_records\/package\.art$/.test(recordPath)) continue;
		let sections;
		try {
			sections = parseRecordSections(readFileSync(join(checkoutAbs, recordPath), 'utf8'));
		} catch (error) {
			pushIssue({
				sourcePath: recordPath,
				code: 'malformed-record',
				message: `Record file could not be read (${error.message}).`,
			});
			continue;
		}
		const packageSections = sections.filter(section => section.kind === 'Package');
		if (packageSections.length === 0) {
			pushIssue({
				sourcePath: recordPath,
				code: 'malformed-record',
				message: `\`${recordPath}\` has no \`## Package:\` section.`,
			});
			continue;
		}
		if (packageSections.length > 1) {
			pushIssue({
				sourcePath: recordPath,
				code: 'multiple-package-records-in-file',
				message:
					`\`${recordPath}\` declares ${packageSections.length} \`## Package:\` ` +
					'sections; only the first is inventoried, the rest are reported here.',
			});
		}
		const section = packageSections[0];
		const cut = recordPath.indexOf('/_records/');
		const dir = cut === -1 ? '' : recordPath.slice(0, cut);
		packageRecords.push({
			recordPath,
			dir,
			section,
			name: section.name,
			declaredPath: normalizePackagePath(identityValue(section, 'Path')),
			used: false,
			reported: false,
		});
	}
	packageRecords.sort((a, b) => (a.recordPath < b.recordPath ? -1 : 1));

	const packageRecordsByDir = new Map();
	const packageRecordsByPath = new Map();
	for (const record of packageRecords) {
		if (!packageRecordsByDir.has(record.dir)) {
			packageRecordsByDir.set(record.dir, record);
		}
		if (record.declaredPath !== null && !packageRecordsByPath.has(record.declaredPath)) {
			packageRecordsByPath.set(record.declaredPath, record);
		}
	}

	// --- manifests ------------------------------------------------------------
	const rootRecordFiles = recordFiles.filter(path => path.startsWith('_records/'));
	const manifests = [];
	const manifestPathsInventoried = [];

	const resolveEntitySection = record => (record ? record.section : null);

	for (const manifestPath of discovered) {
		const absPath = join(checkoutAbs, manifestPath);
		let text;
		try {
			text = readFileSync(absPath, 'utf8');
		} catch (error) {
			pushIssue({
				sourcePath: manifestPath,
				code: 'malformed-manifest',
				message: `Manifest could not be read (${error.message}).`,
			});
			continue;
		}
		let parsed;
		try {
			parsed = JSON.parse(text.replace(/^﻿/, ''));
		} catch (error) {
			pushIssue({
				sourcePath: manifestPath,
				code: 'malformed-manifest',
				message: `Manifest is not parseable JSON (${error.message}).`,
			});
			continue;
		}
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			pushIssue({
				sourcePath: manifestPath,
				code: 'malformed-manifest',
				message: 'Manifest top-level value is not a JSON object.',
			});
			continue;
		}

		const manifestDir = manifestDirectoryOf(manifestPath);

		let canonical = null;
		if (!('name' in parsed)) {
			pushIssue({
				sourcePath: manifestPath,
				code: 'missing-manifest-name',
				message: 'Manifest declares no `name` field; `canonical` is null.',
			});
		} else if (typeof parsed.name === 'string') {
			canonical = parsed.name;
		} else {
			pushIssue({
				sourcePath: manifestPath,
				code: 'malformed-manifest-field',
				message: 'Manifest `name` is not a string; `canonical` is null.',
			});
		}

		let version = null;
		if ('version' in parsed && typeof parsed.version === 'string') {
			version = parsed.version;
		} else if ('version' in parsed) {
			pushIssue({
				sourcePath: manifestPath,
				code: 'malformed-manifest-field',
				message: 'Manifest `version` is not a string; `version` is null.',
			});
		}

		let isPrivate = null;
		if ('private' in parsed && typeof parsed.private === 'boolean') {
			isPrivate = parsed.private;
		} else if ('private' in parsed) {
			pushIssue({
				sourcePath: manifestPath,
				code: 'malformed-manifest-field',
				message: 'Manifest `private` is not a boolean; `private` is null.',
			});
		}

		// dependency maps: exact declarations only, no inference
		const dependencyMaps = {};
		for (const key of ['dependencies', 'peerDependencies', 'devDependencies']) {
			let value = null;
			if (
				key in parsed &&
				typeof parsed[key] === 'object' &&
				parsed[key] !== null &&
				!Array.isArray(parsed[key])
			) {
				value = parsed[key];
			} else if (key in parsed) {
				pushIssue({
					sourcePath: manifestPath,
					code: 'malformed-manifest-field',
					message: `Manifest \`${key}\` is not an object; \`${key}\` is null.`,
				});
			}
			dependencyMaps[key] = value;
		}

		// package record resolution
		let packageRecord = null;
		const colocated = packageRecordsByDir.get(manifestDir) || null;
		const claimed = packageRecordsByPath.get(manifestDir) || null;
		let selected = null;
		if (colocated && claimed && colocated !== claimed) {
			claimed.reported = true;
			pushIssue({
				sourcePath: claimed.recordPath,
				code: 'duplicate-package-record-claim',
				message:
					`\`${claimed.recordPath}\` declares \`Path:\` \`${manifestDir}/\` while ` +
					`\`${colocated.recordPath}\` sits on the same directory; both claim ` +
					`\`${manifestPath}\`. The co-located record is inventoried.`,
			});
		}
		if (colocated) {
			selected = colocated;
			if (colocated.declaredPath !== null && colocated.declaredPath !== manifestDir) {
				pushIssue({
					sourcePath: colocated.recordPath,
					code: 'package-record-path-conflict',
					message:
						`\`${colocated.recordPath}\` declares \`Path:\` ` +
						`\`${colocated.declaredPath}/\` but sits with \`${manifestPath}\` ` +
						'(directory `' +
						`${manifestDir}/` +
						'`); both values are preserved as observed.',
				});
			}
		} else if (claimed) {
			selected = claimed;
		} else if (manifestDir !== '') {
			pushIssue({
				sourcePath: manifestPath,
				code: 'missing-package-record',
				message:
					`\`${manifestPath}\` is nested but no package record was resolved ` +
					`for directory \`${manifestDir}/\`; \`packageRecord\` is null.`,
			});
		}
		if (selected) {
			selected.used = true;
			packageRecord = {
				path: selected.recordPath,
				identity: packageIdentity(selected.section),
			};
		}

		// dependency set declarations referenced by the manifest's entity record
		const entityRecordPath = selected
			? selected.recordPath
			: repositoryRecord
				? repositoryRecord.path
				: null;
		const entitySection = selected ? selected.section : repositorySection;
		const dependencySetDeclarations = [];
		const referencedLines = entitySection ? rawListLines(entitySection, 'Dependencies') : null;
		const seenNames = new Set();
		if (referencedLines) {
			for (const line of referencedLines) {
				const match = /^[ \t]*-[ \t]*Package Dependency Set:[ \t]*(.+?)\s*$/.exec(line);
				if (!match) continue;
				const setName = match[1];
				if (seenNames.has(setName)) continue;
				seenNames.add(setName);
				const declarations = declarationsByName.get(setName);
				if (!declarations || declarations.length === 0) {
					pushIssue({
						sourcePath: entityRecordPath,
						code: 'unresolved-dependency-set-reference',
						message:
							`\`${entityRecordPath}\` references ` +
							`\`Package Dependency Set: ${setName}\` but this checkout declares ` +
							`no \`## Package Dependency Set: ${setName}\` section. The reference ` +
							'remains unresolved as observed.',
					});
					continue;
				}
				for (const declaration of declarations) {
					dependencySetDeclarations.push({
						path: declaration.path,
						fields: declaration.fields,
					});
				}
			}
		}

		// record files describing this manifest's repository/package entity
		const localRecordFiles = manifestDir
			? recordFiles.filter(path => path.startsWith(`${manifestDir}/_records/`))
			: [];
		const recordFilesForManifest = [...new Set([...rootRecordFiles, ...localRecordFiles])].sort();

		manifests.push({
			path: manifestPath,
			canonical,
			version,
			private: isPrivate,
			dependencies: dependencyMaps.dependencies,
			peerDependencies: dependencyMaps.peerDependencies,
			devDependencies: dependencyMaps.devDependencies,
			repositoryRecord,
			projectRecord,
			packageRecord,
			dependencySetDeclarations,
			recordFiles: recordFilesForManifest,
		});
		manifestPathsInventoried.push(manifestPath);
	}

	// package records that describe no manifest
	for (const record of packageRecords) {
		if (record.used || record.reported) continue;
		pushIssue({
			sourcePath: record.recordPath,
			code: 'package-record-without-manifest',
			message:
				`\`${record.recordPath}\` (package \`${record.name}\`) describes ` +
				`\`${record.declaredPath === null ? record.dir : record.declaredPath}/\` ` +
				'but no `package.json` was discovered there.',
		});
	}

	return {
		inventory: {
			schemaVersion: SCHEMA_VERSION,
			repositoryCanonical: target.canonical,
			checkout: {
				name: target.dirName,
				path: `checkouts/${target.dirName}`,
			},
			sourceSnapshot,
			coverage: {
				checkoutRecordPath,
				repositoryRecordPath,
				manifestPathsDiscovered: discovered,
				manifestPathsInventoried,
				recordPaths: recordFiles,
			},
			issues,
			manifests,
		},
		discoveredCount: discovered.length,
	};
}

// ---------------------------------------------------------------------------
// Data dictionary (README.md)
// ---------------------------------------------------------------------------

function buildReadme() {
	return `# Registry Inventory Inputs

**Status:** temporary planning input — not a published Registry endpoint.

\`$REGISTRY/temp/data/\` holds one source-cited JSON snapshot per workspace checkout: every root and nested \`package.json\` found in that checkout, plus the repository, project, package, and \`Package Dependency Set\` records that describe those manifests. The snapshot exists so the Packages and Dependency Sets iterations of \`plan-poc-manifest-registry\` consume one durable input instead of rescanning checkouts.

This directory sits beside the published Registry views (\`data/\`, \`schema/\`) but is **not** one of them: it is never served as an endpoint, and it is removed only by the \`Clean Up Registry\` iteration.

## Path rule

- Every inventory lives at \`$REGISTRY/temp/data/{owner}/{repository}/inputs.json\`, where \`{owner}/{repository}\` is that checkout's registered repository canonical slug.
- Worked example: canonical \`noodlestan/art-md\` maps to \`temp/data/noodlestan/art-md/inputs.json\`.
- One file per checkout: each checkout resolves to exactly one registered canonical, so each repository owns exactly one snapshot that consumers can read, diff, and check for staleness on its own. Generation aborts — writing nothing — when a checkout has no registered canonical, two checkouts resolve to the same canonical, or a canonical is not a safe \`owner/repository\` slug, so no repository can overwrite another's inventory.
- \`$REGISTRY/temp/data/README.md\` (this file) sits beside the per-checkout directories and is the data dictionary for all of them.
- Checkouts with missing, malformed, or conflicting sources still get exactly one \`inputs.json\`; their conditions are reported in that file's \`issues\` array rather than by omission.

## Keys of \`schemaVersion: 1\`

Every \`inputs.json\` contains exactly these top-level keys:

| Key                  | Type            | Meaning                                                                                       |
| -------------------- | --------------- | --------------------------------------------------------------------------------------------- |
| \`schemaVersion\`     | integer         | Contract version of this layout; currently \`1\`.                                              |
| \`repositoryCanonical\` | string        | Registered canonical slug observed for the checkout (\`owner/repository\`).                    |
| \`checkout\`          | object          | Which checkout this file describes.                                                           |
| \`sourceSnapshot\`    | object          | When and from which git state the snapshot was captured.                                      |
| \`coverage\`          | object          | Which records and manifests were covered while building the file.                             |
| \`issues\`            | array           | Missing, malformed, conflicting, or unresolved source data observed while building the file.  |
| \`manifests\`         | array           | One entry per inventoried root or nested \`package.json\`.                                     |

### \`checkout\`

| Key    | Type   | Meaning                                                                     |
| ------ | ------ | --------------------------------------------------------------------------- |
| \`name\`  | string | Checkout directory name under \`$WORKSPACE/checkouts\`.                     |
| \`path\`  | string | Checkout directory relative to \`$WORKSPACE\` (example: \`checkouts/art-md\`). |

### \`sourceSnapshot\`

| Key          | Type            | Meaning                                                                                                                                              |
| ------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| \`capturedAt\` | string        | ISO 8601 UTC timestamp of the run.                                                                                                                   |
| \`commit\`    | string \\| null | \`HEAD\` of the source checkout at capture time; \`null\` when git could not report it (also recorded as an issue).                                   |
| \`dirtyPaths\` | string[]      | Uncommitted and untracked paths reported by git at capture time, relative to the source checkout, sorted; empty when the checkout was clean.          |

### \`coverage\`

| Key                       | Type            | Meaning                                                                                                                                                                              |
| ------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| \`checkoutRecordPath\`    | string \\| null  | Registered checkout record under \`$WORKSPACE/_records/checkouts\`, written relative to the source checkout (example: \`../../_records/checkouts/art-md-checkout.art\`).               |
| \`repositoryRecordPath\`  | string \\| null  | Registered repository record under \`$WORKSPACE/_records/repositories\`, written relative to the source checkout (example: \`../../_records/repositories/art-md.art\`).               |
| \`manifestPathsDiscovered\` | string[]      | Every root and nested \`package.json\` found in the checkout (source-checkout-relative, sorted), including malformed ones.                                                             |
| \`manifestPathsInventoried\` | string[]      | The discovered manifests that have a \`manifests\` entry; malformed manifests are discovered but not inventoried.                                                                     |
| \`recordPaths\`           | string[]        | Every record file present anywhere in the checkout under a \`_records/\` directory (source-checkout-relative, sorted).                                                                  |

### \`issues[]\`

| Key          | Type            | Meaning                                                                                                                                              |
| ------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| \`sourcePath\` | string \\| null | Source-checkout-relative path of the affected (or expected but absent) source data; \`null\` only when no path applies.                               |
| \`code\`      | string          | Stable issue code; see "Issue codes" below.                                                                                                          |
| \`message\`   | string          | What was observed, citing the source paths involved.                                                                                                 |

### \`manifests[]\`

| Key                        | Type            | Meaning                                                                                                                                                                      |
| -------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| \`path\`                   | string          | Manifest path relative to the source checkout.                                                                                                                               |
| \`canonical\`              | string \\| null  | The observed manifest \`name\`.                                                                                                                                              |
| \`version\`                | string \\| null  | The observed manifest \`version\`.                                                                                                                                           |
| \`private\`                | boolean \\| null | The observed manifest \`private\`.                                                                                                                                           |
| \`dependencies\`           | object \\| null  | The exact \`dependencies\` map as declared (direct declarations only).                                                                                                       |
| \`peerDependencies\`       | object \\| null  | The exact \`peerDependencies\` map as declared.                                                                                                                              |
| \`devDependencies\`        | object \\| null  | The exact \`devDependencies\` map as declared.                                                                                                                               |
| \`repositoryRecord\`       | object \\| null  | \`{ path, identity }\` for the checkout's co-located \`_records/repository.art\`, or \`null\` when that record is absent.                                                     |
| \`projectRecord\`          | object \\| null  | \`{ path, identity }\` for the checkout's co-located \`_records/project.art\`, or \`null\` when that record is absent.                                                        |
| \`packageRecord\`          | object \\| null  | \`{ path, identity }\` for the package record resolved to this manifest, or \`null\` (root manifests and nested manifests without a resolved record; the latter raise an issue). |
| \`dependencySetDeclarations\` | array        | \`{ path, fields }\` per distinct \`Package Dependency Set\` referenced by the manifest's entity record (its package record, or the checkout repository record when there is no package record); \`[]\` when none. |
| \`recordFiles\`            | string[]        | Record files describing this manifest's repository/package entity: the checkout's root \`_records/**\` plus, when present, the manifest directory's own \`_records/**\`.       |

### Record references (\`repositoryRecord\`, \`projectRecord\`, \`packageRecord\`)

Each record reference is \`{ "path": string, "identity": object }\`; \`path\` is source-checkout-relative. \`identity\` carries the parsed identity and locator fields of the record, each \`null\` when the record does not declare it:

| Reference           | \`identity\` keys                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| \`repositoryRecord\` | \`name\`, \`canonical\`, \`remote\`, \`owner\`, \`packageFile\`, \`private\`, \`workspaces\`                         |
| \`projectRecord\`    | \`name\`, \`owner\`, \`repository\`, \`code\`, \`private\`                                                            |
| \`packageRecord\`    | \`name\`, \`canonicalName\`, \`path\`, \`packageFile\`, \`namespace\`, \`owner\`, \`private\`, \`published\`          |

Value handling: scalar values keep the text as written with the backticks that fully enclose them removed; \`workspaces\` and other list values are the bullet contents without the marker; \`private\` and \`published\` become JSON booleans when the record writes \`true\`/\`false\` and stay text otherwise.

### \`dependencySetDeclarations[]\`

| Key      | Type   | Meaning                                                                                                     |
| -------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| \`path\`  | string | Source-checkout-relative path of the record file declaring the set.                                          |
| \`fields\` | object | The declaration's parsed content: each \`**Field:**\` name of the \`## Package Dependency Set:\` section.      |

In \`fields\`, a scalar field maps to its text as written (enclosing backticks stripped); a list field maps to the record's bullet lines verbatim, indentation included, so nested kind groups survive exactly as authored.

### Path rules

- \`checkout.path\` is relative to \`$WORKSPACE\`.
- Manifest paths, record paths, \`issues[].sourcePath\`, and \`sourceSnapshot.dirtyPaths\` are relative to the source checkout they describe.
- \`coverage.checkoutRecordPath\` and \`coverage.repositoryRecordPath\` cite workspace-level records through the same source-checkout-relative rule, which resolves to \`../../_records/...\`.
- \`repositoryCanonical\` is a slug, not a path; the output directory is derived from it.

### \`null\` versus \`{}\`

- A missing scalar (manifest \`name\`, \`version\`, \`private\`, an undeclared identity field, an absent record reference) is \`null\`; the key is always present.
- A dependency map that the manifest does not declare is \`null\`; a map the manifest declares as empty is preserved as \`{}\`. The two are never collapsed into each other.
- \`dependencySetDeclarations\` and the \`coverage\` lists are always present; an empty array means "present but empty", which is different from \`null\`.

## Worked example

A checkout \`noodlestan/example\` with a root manifest, one nested package manifest, one malformed manifest, and a root repository record that references \`Package Dependency Set: Build Tools\`:

\`\`\`json
{
  "schemaVersion": 1,
  "repositoryCanonical": "noodlestan/example",
  "checkout": {
    "name": "example",
    "path": "checkouts/example"
  },
  "sourceSnapshot": {
    "capturedAt": "2026-11-06T09:00:00.000Z",
    "commit": "9f2c1ab7d4e6f5a3b2c1d0e9f8a7b6c5d4e3f2a1",
    "dirtyPaths": [
      "libs/widget/package.json"
    ]
  },
  "coverage": {
    "checkoutRecordPath": "../../_records/checkouts/example-checkout.art",
    "repositoryRecordPath": "../../_records/repositories/example.art",
    "manifestPathsDiscovered": [
      "libs/widget/package.json",
      "package.json",
      "tools/broken/package.json"
    ],
    "manifestPathsInventoried": [
      "libs/widget/package.json",
      "package.json"
    ],
    "recordPaths": [
      "_records/dependencies/build-tools.art",
      "_records/project.art",
      "_records/repository.art",
      "libs/widget/_records/package.art"
    ]
  },
  "issues": [
    {
      "sourcePath": "tools/broken/package.json",
      "code": "malformed-manifest",
      "message": "Manifest is not parseable JSON (Unexpected token } in JSON at position 42)."
    }
  ],
  "manifests": [
    {
      "path": "package.json",
      "canonical": "example",
      "version": "0.1.0",
      "private": true,
      "dependencies": null,
      "peerDependencies": null,
      "devDependencies": {
        "prettier": "^3.0.0"
      },
      "repositoryRecord": {
        "path": "_records/repository.art",
        "identity": {
          "name": "Example",
          "canonical": "noodlestan/example",
          "remote": "git@github.com:noodlestan/example.git",
          "owner": "Project: Example",
          "packageFile": "package.json",
          "private": false,
          "workspaces": "None"
        }
      },
      "projectRecord": {
        "path": "_records/project.art",
        "identity": {
          "name": "Example",
          "owner": "Project: Tooling",
          "repository": "Repository: Example",
          "code": "https://github.com/noodlestan/example",
          "private": false
        }
      },
      "packageRecord": null,
      "dependencySetDeclarations": [
        {
          "path": "_records/dependencies/build-tools.art",
          "fields": {
            "Dependencies": [
              "- Package Dependency: Turbo",
              "- Package Dependency: Lefthook"
            ]
          }
        }
      ],
      "recordFiles": [
        "_records/dependencies/build-tools.art",
        "_records/project.art",
        "_records/repository.art"
      ]
    },
    {
      "path": "libs/widget/package.json",
      "canonical": "@example/widget",
      "version": "1.2.3",
      "private": false,
      "dependencies": {
        "turbo": "^2.9.18"
      },
      "peerDependencies": {},
      "devDependencies": null,
      "repositoryRecord": {
        "path": "_records/repository.art",
        "identity": {
          "name": "Example",
          "canonical": "noodlestan/example",
          "remote": "git@github.com:noodlestan/example.git",
          "owner": "Project: Example",
          "packageFile": "package.json",
          "private": false,
          "workspaces": "None"
        }
      },
      "projectRecord": {
        "path": "_records/project.art",
        "identity": {
          "name": "Example",
          "owner": "Project: Tooling",
          "repository": "Repository: Example",
          "code": "https://github.com/noodlestan/example",
          "private": false
        }
      },
      "packageRecord": {
        "path": "libs/widget/_records/package.art",
        "identity": {
          "name": "Widget",
          "canonicalName": "@example/widget",
          "path": "libs/widget/",
          "packageFile": "package.json",
          "namespace": "@example",
          "owner": "Project: Example",
          "private": false,
          "published": true
        }
      },
      "dependencySetDeclarations": [],
      "recordFiles": [
        "_records/dependencies/build-tools.art",
        "_records/project.art",
        "_records/repository.art",
        "libs/widget/_records/package.art"
      ]
    }
  ]
}
\`\`\`

## Observed values and issue reporting

Values are copied as observed: nothing is inferred, reconciled, or normalized.

- Missing data becomes \`null\` (or an empty array where the contract says "always an array"), never a guessed value.
- Malformed data is reported as an issue; a malformed manifest keeps its place in \`manifestPathsDiscovered\` and is left out of \`manifests\` and \`manifestPathsInventoried\`.
- Conflicting data (two records claiming different canonicals, a package record whose \`Path:\` disagrees with its location) is reported with every source path and both values stay in the file as observed.
- Unresolved references (a record naming a \`Package Dependency Set\` that this checkout never declares) stay unresolved and are reported; names are matched exactly, never fuzzily.
- Record data is parsed without rewriting: field text keeps its wording, list lines keep their markers and indentation where the contract says "verbatim".

### Issue codes

Recorded in the \`issues\` array of the affected checkout:

| Code                                  | Meaning                                                                                                            |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| \`duplicate-repository-record\`        | More than one registered repository record resolves the checkout's repository name; all agree on the canonical.     |
| \`source-snapshot-unavailable\`        | git could not report the checkout's commit and/or dirty state.                                                      |
| \`missing-checkout-repository-record\` | The checkout has no co-located \`_records/repository.art\`.                                                          |
| \`repository-canonical-conflict\`      | The co-located repository record and the registered repository record declare different canonicals.                 |
| \`missing-project-record\`             | The checkout has no co-located \`_records/project.art\`.                                                             |
| \`malformed-record\`                   | A record file is unreadable or lacks its expected \`## {Kind}:\` section.                                           |
| \`multiple-package-records-in-file\`   | A \`package.art\` file declares more than one \`## Package:\` section; only the first is inventoried.               |
| \`duplicate-dependency-set-declaration\` | Two record files declare the same \`## Package Dependency Set:\` name within one checkout.                         |
| \`malformed-manifest\`                 | A discovered \`package.json\` is unreadable or not a JSON object; it is reported, never omitted silently.           |
| \`missing-manifest-name\`              | The manifest declares no \`name\`; \`canonical\` is \`null\`.                                                        |
| \`malformed-manifest-field\`           | \`name\`, \`version\`, \`private\`, or a dependency map has the wrong JSON type; the value is \`null\`.             |
| \`missing-package-record\`             | A nested manifest has no resolvable package record.                                                                 |
| \`package-record-path-conflict\`       | A package record's \`Path:\` disagrees with the directory it sits in.                                               |
| \`duplicate-package-record-claim\`     | Two package records claim the same manifest directory.                                                              |
| \`package-record-without-manifest\`    | A package record describes a directory where no \`package.json\` was discovered.                                    |
| \`unresolved-dependency-set-reference\` | An entity record references a set name this checkout never declares.                                               |

### Blockers (generation aborts, nothing is written)

| Code                          | Meaning                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| \`unmatched-checkout\`         | A checkout directory has no registered checkout record.                                                    |
| \`unmatched-checkout-record\`  | A registered checkout record names a location with no checkout directory (or declares no \`Location:\`).   |
| \`duplicate-checkout-record\`  | More than one registered checkout record matches the same checkout directory.                              |
| \`unresolved-repository-canonical\` | The checkout's repository record, canonical, or canonical agreement cannot be resolved.                   |
| \`unsafe-repository-canonical\` | The canonical is not a safe \`owner/repository\` slug (would allow overwriting another path).              |
| \`duplicate-repository-canonical\` | Two checkouts resolve to the same canonical (would overwrite one inventory with another).                |

## Schema version policy

Increment \`schemaVersion\` whenever a key is added or removed, a type changes, the \`null\`/\`{}\` semantics change, or a field's meaning changes. Consumers must stop when they meet a \`schemaVersion\` they do not support. Data-value changes alone (new manifests, new issues, different versions) never bump the schema version.

## Regeneration ownership

Only the maintained inventory generator — \`$REGISTRY/scripts/inventory-registry-inputs.mjs\`, run as part of the \`inventory-registry-inputs\` iteration of \`plan-poc-manifest-registry\` — may create or replace this README and the \`inputs.json\` files.

Consumers that find the snapshot stale, incomplete, or missing report it and wait for that iteration to regenerate it. Consumers must not edit these files and must not regenerate them independently.

## Consumer obligations

- Read this README first, then the \`inputs.json\` files.
- Check \`schemaVersion\`, the checkout coverage (exactly one file per checkout), and each file's \`sourceSnapshot\` before trusting the data; stop on an unsupported version or a stale snapshot and request regeneration.
- Do not rescan manifests and do not read lockfiles; this snapshot is the sole manifest-discovery input.
- Use only direct dependencies from the three manifest maps (\`dependencies\`, \`peerDependencies\`, \`devDependencies\`); never infer transitive dependencies.
- Preserve observed values; surface conflicts and issues instead of guessing a winner.

## Regenerating

From \`$WORKSPACE\`:

\`\`\`bash
node checkouts/registry/scripts/inventory-registry-inputs.mjs
\`\`\`

The run is read-only outside \`$REGISTRY/temp/data/\`: it reads checkout records, repository/project/package records, dependency-set declarations, and \`package.json\` files, then replaces the \`inputs.json\` outputs and this README. On a blocker it writes nothing and exits with a non-zero status. The generator lays the outputs out with the repository's Prettier when it is installed, so a fresh run stays \`npm run lint\`-clean; after a run without Prettier, run \`npm run lint:fix\` from \`$REGISTRY\` before committing.
`;
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

/**
 * Lays the generated outputs out with the repository's own Prettier so a fresh
 * run stays `npm run lint`-clean. Only the files under `$REGISTRY/temp/data/`
 * are touched; formatting never changes observed values.
 */
function formatOutputs() {
	const prettierBin = join(REGISTRY_ROOT, 'node_modules', '.bin', 'prettier');
	if (!existsSync(prettierBin)) {
		console.warn(
			'inventory-registry-inputs: Prettier is not installed; outputs were written ' +
				'unformatted. Run `npm run lint:fix` from $REGISTRY before committing.',
		);
		return;
	}
	try {
		execFileSync(prettierBin, ['--write', DATA_DIR], {
			cwd: REGISTRY_ROOT,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
	} catch (error) {
		console.warn(
			`inventory-registry-inputs: Prettier could not format the outputs (${error.message}). ` +
				'Run `npm run lint:fix` from $REGISTRY before committing.',
		);
	}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
	if (!existsSync(CHECKOUTS_ROOT) || !existsSync(WORKSPACE_RECORDS)) {
		console.error(
			'inventory-registry-inputs: cannot find `checkouts/` or `_records/` in the resolved workspace root.',
		);
		process.exit(1);
	}

	const targets = resolveCheckoutTargets();

	if (blockers.length > 0) {
		console.error('inventory-registry-inputs: blocker(s) found; nothing was written.');
		for (const blocker of blockers) {
			console.error(`  [${blocker.code}] ${blocker.message}`);
		}
		process.exit(2);
	}

	const results = [];
	for (const target of targets) {
		const { inventory, discoveredCount } = buildInventory(target);
		results.push({ target, inventory, discoveredCount });
	}
	results.sort((a, b) =>
		a.inventory.repositoryCanonical < b.inventory.repositoryCanonical ? -1 : 1,
	);

	if (!resolve(DATA_DIR).startsWith(REGISTRY_ROOT + sep)) {
		console.error('inventory-registry-inputs: refusing to write outside $REGISTRY.');
		process.exit(1);
	}
	rmSync(DATA_DIR, { recursive: true, force: true });
	mkdirSync(DATA_DIR, { recursive: true });

	let inventoried = 0;
	let issueCount = 0;
	for (const { target, inventory } of results) {
		const [owner, repository] = inventory.repositoryCanonical.split('/');
		const outputDir = join(DATA_DIR, owner, repository);
		mkdirSync(outputDir, { recursive: true });
		const outputPath = join(outputDir, 'inputs.json');
		writeFileSync(outputPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
		inventoried += inventory.manifests.length;
		issueCount += inventory.issues.length;
	}
	writeFileSync(README_PATH, buildReadme(), 'utf8');
	formatOutputs(DATA_DIR);

	console.log(
		`inventory-registry-inputs: ${results.length} checkouts, ` +
			`${results.reduce((sum, result) => sum + result.discoveredCount, 0)} manifests discovered, ` +
			`${inventoried} inventoried, ${issueCount} issues recorded.`,
	);
	for (const { inventory, discoveredCount } of results) {
		console.log(
			`  ${inventory.repositoryCanonical.padEnd(32)} ` +
				`${String(inventory.manifests.length).padStart(2)}/${String(discoveredCount).padEnd(2)} manifests  ` +
				`${String(inventory.issues.length).padStart(2)} issues  ${inventory.checkout.path}`,
		);
	}
	console.log(
		`  outputs: ${workspaceRelative(DATA_DIR)}/{owner}/{repository}/inputs.json + README.md`,
	);
}

main();
