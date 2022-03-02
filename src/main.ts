import {getInputs} from './context';
import {getContext, getRepository} from './github';
import {Meta} from './meta';
import {endGroup, info, setFailed, setOutput, startGroup} from '@actions/core';

async function run() {
  try {
    const inputs = await getInputs();
    if (!inputs.images.length) {
      throw new Error(`images input required`);
    }

    const context = getContext();
    const repo = await getRepository(inputs.githubToken);
    startGroup(`Context info`);
    info(`eventName: ${context.eventName}`);
    info(`sha: ${context.sha}`);
    info(`ref: ${context.ref}`);
    info(`workflow: ${context.workflow}`);
    info(`action: ${context.action}`);
    info(`actor: ${context.actor}`);
    info(`runNumber: ${context.runNumber}`);
    info(`runId: ${context.runId}`);
    endGroup();

    const meta = new Meta(inputs, context, repo);

    const version = meta.version;
    startGroup(`Docker image version`);
    info(version.main || '');
    endGroup();
    setOutput('version', version.main || '');

    // Docker tags
    const tags = meta.tags();
    startGroup(`Docker tags`);
    for (let tag of tags) {
      info(tag);
    }
    endGroup();
    setOutput('tags', tags.join(inputs.sepTags));

    // Docker labels
    const labels = meta.labels();
    startGroup(`Docker labels`);
    for (let label of labels) {
      info(label);
    }
    endGroup();
    setOutput('labels', labels.join(inputs.sepLabels));
  }
  catch (error: any) {
    setFailed(error.message);
  }
}

run().then();
