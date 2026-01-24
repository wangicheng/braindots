
const fs = require('fs');
const path = require('path');
const core = require('@actions/core');
const github = require('@actions/github');
const { z } = require('zod');

const DATA_FILE = path.join(__dirname, '../public/db/data.json');

// --- Schemas ---

const PayloadSchemas = {
  update_profile: z.object({
    avatar: z.string().optional(),
  }),
  publish_level: z.object({
    id: z.string(),
    data: z.any(), // Allow any structure for level data for now, or refine if needed
  }),
  delete_level: z.object({
    id: z.string(),
  }),
};

// --- Helpers ---

// Simple parser for Issue Form Markdown
function parseIssueBody(body) {
  const lines = body.split('\n');
  const data = {};
  let currentKey = null;
  let buffer = [];

  for (const line of lines) {
    const headingMatch = line.match(/^###\s+(.+)$/);
    if (headingMatch) {
      if (currentKey) {
        data[currentKey] = buffer.join('\n').trim();
      }
      currentKey = headingMatch[1].trim();
      buffer = [];
    } else if (currentKey) {
      buffer.push(line);
    }
  }
  if (currentKey) {
    data[currentKey] = buffer.join('\n').trim();
  }
  return data;
}

// --- Main ---

async function run() {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN is missing');
    }

    // In a real action, standard 'github.context.payload.issue' works.
    // For local testing, we might mock it.
    const context = github.context;
    const issue = context.payload.issue;

    if (!issue) {
      throw new Error('No issue payload found');
    }

    console.log(`Processing Issue #${issue.number} by @${issue.user.login}`);

    const bodyData = parseIssueBody(issue.body);
    console.log('Parsed Body Data:', bodyData);

    const username = issue.user.login;
    const action = bodyData['Action Type'];
    const rawPayload = bodyData['Payload'];

    if (!action || !rawPayload) {
      throw new Error('Missing required fields (Action Type, Payload).');
    }

    // Parse Payload JSON
    let payload;
    try {
      payload = JSON.parse(rawPayload);
    } catch (e) {
      throw new Error('Invalid JSON in Payload field');
    }

    // Validate Payload
    const schema = PayloadSchemas[action];
    if (!schema) {
      throw new Error(`Unknown action type: ${action}`);
    }

    const validatedPayload = schema.parse(payload);

    // Load DB
    if (!fs.existsSync(DATA_FILE)) {
      // Should exist, but init if not
      fs.writeFileSync(DATA_FILE, JSON.stringify({ users: {} }, null, 2));
    }
    const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

    // Ensure User Exists
    if (!db.users[username]) {
      db.users[username] = { avatar: null, levels: [] };
    }
    const user = db.users[username];

    // Apply Changes
    switch (action) {
      case 'update_profile':
        if (validatedPayload.avatar !== undefined) {
          user.avatar = validatedPayload.avatar;
        }
        break;

      case 'publish_level':
        // Check if level exists, update it, or add new
        const existingLevelIndex = user.levels.findIndex(l => l.id === validatedPayload.id);
        const levelData = {
          id: validatedPayload.id,
          ...validatedPayload.data, // Spread the level content
          updatedAt: new Date().toISOString()
        };

        // Sanctitize: Remove prohibited fields if they somehow snuck in (though we only take what's in 'data' + id)
        // If 'data' contains metrics, we might want to strip them explicitly if the user requirements are strict.
        // For now, assuming 'data' is just the game level structure.

        if (existingLevelIndex >= 0) {
          user.levels[existingLevelIndex] = levelData;
        } else {
          user.levels.push(levelData);
        }
        break;

      case 'delete_level':
        user.levels = user.levels.filter(l => l.id !== validatedPayload.id);
        break;
    }

    // Save DB
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
    console.log('Database updated successfully');

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
