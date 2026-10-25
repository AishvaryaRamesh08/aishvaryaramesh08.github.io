/** Why I love data: story copy for the closing section before Contact. */
import type { StoryConfig } from "./types";

export const story = {
  // Owner-editable; initial value from Req 10.5, one entry per paragraph.
  quote: [
    "Data rarely shows up clean. It arrives from five systems, three formats and a dozen assumptions nobody wrote down. I like the work between that mess and a decision: figuring out what the data is supposed to mean, building the pipeline that makes it consistent, and checking it until people can rely on it.",
    "At Wells Fargo I spent four years doing that at scale, moving tables from on-premise systems into the cloud, automating loads that used to be manual, and working with product owners to turn vague asks into testable requirements. Now at Texas A&M, I'm pairing that engineering background with business and systems analysis, because the best pipeline is still wasted if it answers the wrong question.",
    "What keeps me interested is the whole chain: sourcing, modeling, governing, visualizing, and now making data ready for AI.",
  ],
} satisfies StoryConfig;
