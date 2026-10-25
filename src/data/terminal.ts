/**
 * Terminal_Widget copy (Req 24). Command responses for whoami, skills, projects, certs and contact
 * are generated from the other Content_Config files (site, skills, projects, certifications,
 * contact) by `src/lib/terminal.ts`, so they never drift from what the page shows.
 */
import type { TerminalConfig } from "./types";

export const terminal = {
  heading: "Explore from the terminal",
  inputLabel: "Type a command (try help)",
  prompt: "visitor@aishvarya:~$",
  help: {
    whoami: "who I am and what I do",
    skills: "skill clusters and the skills in each",
    projects: "featured case studies",
    certs: "cloud certifications",
    contact: "email, LinkedIn, GitHub and resume links",
    help: "list the supported commands",
    clear: "clear the terminal output",
  },
  unknown: (cmd, supported) => `command not found: ${cmd}. Supported commands: ${supported.join(", ")}`,
  maxHistory: 50,
} satisfies TerminalConfig;
