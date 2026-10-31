import type { TerminalConfig } from "./types";

export const terminal = {
  windowLabel: "aishvarya.sh",
  inputLabel: "Terminal command",
  outputLabel: "Interactive terminal",
  banner: [
    "Welcome to aishvarya.sh",
    'Type "help" for commands, or ask: bigquery, texas a&m, certifications',
  ],
  prompt: "visitor@aishvarya:~$",
  interruptOutput: "^C",
  resultTitle: (number, title) => `${number}. ${title}`,
  whoami:
    "Aishvarya Ramesh, Data Engineer. MS Management Information Systems student at Texas A&M (Mays Business School). Four years in data engineering at Wells Fargo.",
  experience: [
    "Wells Fargo, Senior Software Engineer, Data Engineering (Senior AVP), Aug 2022 to Aug 2026.",
    "Kimberly-Clark, Graduate Engineer Trainee Intern, Application Operations, Jan 2022 to Jul 2022.",
  ],
  education: [
    "Texas A&M University, MS Management Information Systems, Jul 2026 to May 2028, GPA 4.0/4.0.",
    "M S Ramaiah Institute of Technology, B.E. Electronics & Telecommunication Engineering, Aug 2018 to Jul 2022, GPA 9.19/10.",
  ],
  help: {
    whoami: "name and professional summary",
    experience: "work experience",
    education: "education",
    skills: "skill clusters and the skills in each",
    projects: "featured projects",
    certs: "certifications",
    contact: "LinkedIn, GitHub and public email",
    resume: "open the resume",
    help: "list all commands",
    goto: "scroll to work, skills, journey or contact",
    clear: "clear the terminal output",
  },
  aliases: {
    "who are you": "whoami",
    cv: "resume",
    email: "contact",
    school: "education",
    job: "experience",
  },
  gotoConfirmation: (section) => `Navigating to ${section}.`,
  gotoUnknown: (section) => `Cannot navigate to ${section}. Use work, skills, journey or contact.`,
  gotoHint: "goto",
  resumeUnavailable: "Resume not available yet.",
  projectsHint: "Hint: goto work",
  contactLabels: { email: "Email", linkedin: "LinkedIn", github: "GitHub" },
  noResults: (query) => `No results for '${query}'. Try: help`,
  stopWords: ["the", "a", "of", "what", "is", "about", "and", "in", "to", "my"],
  maxHistory: 50,
} satisfies TerminalConfig;
