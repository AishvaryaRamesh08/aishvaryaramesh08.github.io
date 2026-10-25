// Terminal-style pull quote for the Story_Section (Req 10.5, 10.6).
// Renders the Owner's story paragraphs verbatim, in order, in a bordered monospace block.
// When the story text is a Placeholder (missing/empty), a PlaceholderAsset stands in for the quote.
import { PlaceholderAsset } from "../../components/PlaceholderAsset";
import { story } from "../../data/story";
import { isPlaceholder } from "../../data/types";

/** Expected-asset label used when the story text is not supplied. */
const EXPECTED = "story text";

/**
 * The story quote block. Paragraphs are rendered verbatim and in their original order (Req 10.5):
 * each entry becomes its own line so Property 45 can assert identical text per paragraph.
 */
export function TerminalQuote() {
  const quote = story.quote;

  if (isPlaceholder(quote) || quote.length === 0) {
    return (
      <div className="rounded-md border border-border bg-surface p-4">
        <PlaceholderAsset expected={EXPECTED} variant="text" />
      </div>
    );
  }

  return (
    <blockquote className="rounded-md border border-border bg-surface p-4 font-mono text-sm leading-6 text-text">
      {quote.map((paragraph, index) => (
        // Story paragraphs are a fixed ordered list from the config; index keys are stable here.
        <p key={index} className={index > 0 ? "mt-4" : undefined}>
          {paragraph}
        </p>
      ))}
    </blockquote>
  );
}
