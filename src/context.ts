import {parse as csvParse} from "../node_modules/csv-parse/dist/esm/sync";
import {getInput} from '@actions/core';
import {mkdtempSync} from 'fs';
import {tmpdir} from 'os';
import {join as joinPath, posix, sep as pathSep} from 'path';

let _tmpDir: string;

export interface Inputs {
  images: string[];
  tagEdge: boolean;
  tagEdgeBranch: string;
  tagSemver: string[];
  tagLatest: boolean;
  tagSchedule: string;
  tagCustom: string[];
  tagCustomOnly: boolean;
  labelCustom: string[];
  sepTags: string;
  sepLabels: string;
  githubToken: string;
  flavor: string;
  mainFlavor: boolean;
}

export function tmpDir(): string {
  if (!_tmpDir) {
    _tmpDir = mkdtempSync(joinPath(tmpdir(), 'ghaction-docker-meta-')).split(pathSep).join(posix.sep);
  }
  return _tmpDir;
}

export function getInputs(): Inputs {
  return {
    images: getInputList('images'),
    tagEdge: /true/i.test(getInput('tag-edge') || 'false'),
    tagEdgeBranch: getInput('tag-edge-branch'),
    tagSemver: getInputList('tag-semver'),
    tagLatest: /true/i.test(getInput('tag-latest') || 'true'),
    tagSchedule: getInput('tag-schedule') || 'nightly',
    tagCustom: getInputList('tag-custom'),
    tagCustomOnly: /true/i.test(getInput('tag-custom-only') || 'false'),
    labelCustom: getInputList('label-custom', true),
    sepTags: getInput('sep-tags') || `\n`,
    sepLabels: getInput('sep-labels') || `\n`,
    githubToken: getInput('github-token'),
    flavor: getInput('flavor'),
    mainFlavor: /true/i.test(getInput('main-flavor') || 'true')
  };
}

export function getInputList(name: string, ignoreComma?: boolean): string[] {
  let res: string[] = [];

  const items = getInput(name);
  if (!items.length) {
    return res;
  }

  const options: string[][] = csvParse(items, {
    columns: false,
    relaxColumnCount: true,
    skipEmptyLines: true,
    skipRecordsWithEmptyValues: true
  });

  for (let output of options) {
    if (output.length == 1) {
      res.push(output[0]);
      continue;
    }
    else if (!ignoreComma) {
      res.push(...output);
      continue;
    }
    res.push(output.join(','));
  }

  return res.filter(item => item).map(pat => pat.trim());
}

export async function asyncForEach<T>(array: T[], callback: (ele: T, index: number, arr: T[]) => Promise<void>) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}
