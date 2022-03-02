import {compile as hbCompile} from 'handlebars';
import {parse as semParse, prerelease as semPreRelease, valid as semValid} from 'semver';
import {Inputs} from './context';
import {warning} from '@actions/core';
import {Context} from '@actions/github/lib/context';
import {Repository} from './github';

export interface Version {
  main: string | undefined;
  partial: string[];
  latest: boolean;
}

export class Meta {

  public readonly version: Version;
  private readonly date: Date;

  constructor(
      private readonly inputs: Inputs,
      private readonly context: Context,
      private readonly repo: Repository
  ) {
    if (!this.inputs.tagEdgeBranch) {
      this.inputs.tagEdgeBranch = repo.default_branch;
    }
    this.date = new Date();
    this.version = this.getVersion();
  }

  public tags(): string[] {
    if (!this.version.main) {
      return [];
    }

    let flavor = this.inputs.flavor;
    let main = !flavor || this.inputs.mainFlavor;

    let tags: string[] = [];

    for (const image of this.inputs.images) {
      const imageLc = image.toLowerCase();
      if (main) {
        tags.push(`${imageLc}:${this.version.main}`);
      }
      if (flavor) {
        tags.push(`${imageLc}:${this.version.main}-${flavor}`);
      }
      for (const partial of this.version.partial) {
        if (main) {
          tags.push(`${imageLc}:${partial}`);
        }
        if (flavor) {
          tags.push(`${imageLc}:${partial}-${flavor}`);
        }
      }
      if (this.version.latest) {
        if (main) {
          tags.push(`${imageLc}:latest`);
        }
        if (flavor) {
          tags.push(`${imageLc}:${flavor}`);
        }
      }
    }
    return tags;
  }

  public labels(): string[] {
    let labels = [
      `org.opencontainers.image.title=${this.repo.name || ''}`,
      `org.opencontainers.image.description=${this.repo.description || ''}`,
      `org.opencontainers.image.url=${this.repo.html_url || ''}`,
      `org.opencontainers.image.source=${this.repo.html_url || ''}`,
      `org.opencontainers.image.version=${this.version.main || ''}`,
      `org.opencontainers.image.created=${this.date.toISOString()}`,
      `org.opencontainers.image.revision=${this.context.sha || ''}`,
      `org.opencontainers.image.licenses=${this.repo.license?.spdx_id || ''}`
    ];
    labels.push(...this.inputs.labelCustom);
    return labels;
  }

  private getVersion(): Version {
    const currentDate = this.date;

    let version: Version = {
      main: undefined,
      partial: [],
      latest: false
    };

    if (/schedule/.test(this.context.eventName)) {
      version.main = this.inputs.tagSchedule;
    }
    else if (/^refs\/tags\//.test(this.context.ref)) {
      version.main = this.context.ref.replace(/^refs\/tags\//g, '').replace(/\//g, '-');
      if (this.inputs.tagSemver.length > 0 && !semValid(version.main)) {
        warning(`${version.main} is not a valid semver. More info: https://semver.org/`);
      }
      if (this.inputs.tagSemver.length > 0 && semValid(version.main)) {
        const sver = semParse(version.main, {
          includePrerelease: true
        });
        if (semPreRelease(version.main)) {
          version.main = hbCompile('{{version}}')(sver);
        }
        else {
          version.latest = this.inputs.tagLatest;
          version.main = hbCompile(this.inputs.tagSemver[0])(sver);
          for (const semverTpl of this.inputs.tagSemver) {
            const partial = hbCompile(semverTpl)(sver);
            if (partial == version.main) {
              continue;
            }
            version.partial.push(partial);
          }
        }
      }
      else {
        version.latest = this.inputs.tagLatest;
      }
    }
    else if (/^refs\/heads\//.test(this.context.ref)) {
      version.main = this.context.ref.replace(/^refs\/heads\//g, '').replace(/[^a-zA-Z0-9._-]+/g, '-');
      if (this.inputs.tagEdge && this.inputs.tagEdgeBranch === version.main) {
        version.main = 'edge';
      }
    }
    else if (/^refs\/pull\//.test(this.context.ref)) {
      version.main = `pr-${this.context.ref.replace(/^refs\/pull\//g, '').replace(/\/merge$/g, '')}`;
    }

    if (this.inputs.tagCustom.length > 0) {
      if (this.inputs.tagCustomOnly) {
        version = {
          main: this.inputs.tagCustom.shift(),
          partial: this.inputs.tagCustom,
          latest: false
        };
      }
      else {
        version.partial.push(...this.inputs.tagCustom);
      }
    }

    version.partial = version.partial.filter((item, index) => version.partial.indexOf(item) === index);
    return version;
  }
}
