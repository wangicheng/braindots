
const fs = require('fs');
const path = require('path');

// Simulate GitHub Context
process.env.GITHUB_TOKEN = 'mock-token';

const mockIssueBody = `
### Username
local-tester

### Action Type
update_profile

### Payload
{"avatar": "https://example.com/avatar.png"}
`;

// Mock @actions/github context
const github = require('@actions/github');
github.context = {
  payload: {
    issue: {
      number: 1,
      user: { login: 'local-tester' },
      body: mockIssueBody,
      labels: [{ name: 'data-submission' }]
    }
  },
  repo: { owner: 'mock', repo: 'mock' },
  issue: { number: 1 }
};

// Run the script
require('./process_issue.cjs');
