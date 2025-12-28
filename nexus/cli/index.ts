#!/usr/bin/env node

/**
 * Marketing Nexus CLI
 * Command-line interface for managing content and publications
 */

import { Command } from "commander";
import { postCommand } from "./commands/post";
import { generateCommand } from "./commands/generate";
import { statusCommand } from "./commands/status";

const program = new Command();

program
  .name("nexus")
  .description("Marketing Nexus - Multi-platform content management CLI")
  .version("1.0.0");

// Register commands
program.addCommand(postCommand);
program.addCommand(generateCommand);
program.addCommand(statusCommand);

// Global error handler
program.exitOverride((err) => {
  if (err.code === "commander.help") {
    process.exit(0);
  }
  if (err.code === "commander.version") {
    process.exit(0);
  }
  console.error(`Error: ${err.message}`);
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
