const core = require('@actions/core');
const github = require('@actions/github');
import * as dotenv from 'dotenv';
import { Octokit } from '@octokit/rest';

try
{
  if (!dotenv) {
      throw new Error('dotenv is needed');
  }

  if (!Octokit) {
      throw new Error('@octokit/rest is needed');
  }
  dotenv.config();

  const octokit = new Octokit({
    auth: process.env['GITHUB_TOKEN'],
  });

  // `parameters` input defined 
  const owner = core.getInput('owner');
  const repository = core.getInput('repository');
  const base = core.getInput('base');
  const head = core.getInput('head');
}
catch (error) {
  core.setFailed(error.message);
}

async function execute() {
  // Acquire the commits between the head and base
  const { data: { commits } } = await octokit.repos.compareCommits({
    owner: owner,
    repo: repository,
    base: base,
    head: head,
  });

  // Process each commit and get the associated PR 
  const result = await Promise.all(commits.map(async (commit) => {
    const prs = [];
    const { data: associatedPulls } = await octokit.repos.listPullRequestsAssociatedWithCommit({
        owner: owner,
        repo: repository,
        commit_sha: commit.sha,
    });
    associatedPulls.forEach(associatedPull => {
        prs.push({
            url: associatedPull.html_url,
            number: associatedPull.number
        });
    });
    return {
        title: commit.commit.message.split('\n')[0],
        prs,
    };
  }));

  // Process each PRs details into a single string
  var out = 'Owner:' + owner +'\nRepository:' + repository + '\nBase:' + base + '\nHead:' + head + '\n';
  
  result.forEach((resultItem) => {
      const pr = resultItem.prs[resultItem.prs.length - 1];
      const url = (pr) ? pr.url : 'No PR';
      out = out + (`- ${resultItem.title} (${url})\n`)
  });

  // Write to the log
  console.log(out);
  // Return to the github action
  core.setOutput("output", out);

  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);
}

execute().catch((e) => core.setFailed(error.message));
