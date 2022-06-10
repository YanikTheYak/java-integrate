#!/usr/bin/env node

const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require("@octokit/rest");

if (!Octokit) {
    throw new Error('@octokit/rest is needed');
}

const octokit = new Octokit({
  auth: process.env['GITHUB_TOKEN'],
});

// `parameters` input defined 
const owner = core.getInput('owner');
const repository = core.getInput('repository');
const base = core.getInput('base');
const head = core.getInput('head');

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

  octokit.rest.pulls.create({
    owner: 'yaniktheyak',
    repo: 'java-integrate',
    base: 'main',
    head: 'jsdev',
    title: 'title',
    body: out
  });


  var latestCommitSHA = 'bob';
  const commits2 = await octokit.repos.listCommits({
    owner: 'yaniktheyak',
    repo: 'java-integrate',
  });
  latestCommitSHA = commits2.data[0].sha;

  //const {data: { sha: branchSHA },}
  const branches = await octokit.repos.listBranches({
    owner: 'yaniktheyak',
    repo: 'java-integrate',
  });

  // Write to the log
  console.log('\ndata = ' + branches.toString() + '\n' + branches[0].name + '\n' + latestCommitSHA);
}

execute().catch((e) => core.setFailed(e.message));

