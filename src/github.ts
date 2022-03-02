import {context as ghContext, getOctokit} from '@actions/github';
import {Context} from '@actions/github/lib/context';
import {Endpoints} from '@octokit/types';

export type Repository = Endpoints['GET /repos/{owner}/{repo}']['response']['data'];

export function getContext(): Context {
  return ghContext;
}

export async function getRepository(token: string): Promise<Repository> {
  const octokit = getOctokit(token);

  const repo = await octokit.rest.repos.get(ghContext.repo);

  if (!repo?.data) {
    throw new Error('Cannot get GitHub repository');
  }

  return repo.data;
}
