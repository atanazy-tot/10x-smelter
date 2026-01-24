/**
 * Synthesis service.
 * Applies prompts to transcribed content to generate structured output.
 */

import { createCompletion, type CompletionOptions, type Message } from "@/lib/services/llm";
import { SynthesisError } from "@/lib/utils/errors";

/**
 * Single synthesis result for one prompt.
 */
export interface SynthesisResult {
  promptName: string;
  content: string;
  model: string;
}

/**
 * Applies a single prompt to the transcript content.
 */
export async function synthesizeWithPrompt(
  transcript: string,
  promptContent: string,
  promptName: string,
  options: CompletionOptions = {}
): Promise<SynthesisResult> {
  try {
    const messages: Message[] = [
      {
        role: "system",
        content: promptContent,
      },
      {
        role: "user",
        content: `Here is the content to process:\n\n${transcript}`,
      },
    ];

    const result = await createCompletion(messages, {
      ...options,
      temperature: 0.3, // Lower temperature for more consistent formatting
      maxTokens: 8192,
    });

    return {
      promptName,
      content: result.content,
      model: result.model,
    };
  } catch (error) {
    console.error(`[Synthesis] Error applying prompt "${promptName}":`, error);
    throw new SynthesisError(`SYNTHESIS FAILED FOR "${promptName}"`);
  }
}

/**
 * Applies multiple prompts to the transcript content.
 * Returns all results combined into a single formatted output.
 */
export async function synthesizeWithMultiplePrompts(
  transcript: string,
  prompts: { name: string; content: string }[],
  options: CompletionOptions = {}
): Promise<{ combined: string; results: SynthesisResult[] }> {
  if (prompts.length === 0) {
    // No prompts selected, return transcript as-is
    return {
      combined: transcript,
      results: [],
    };
  }

  const results: SynthesisResult[] = [];

  // Process prompts sequentially to avoid rate limiting
  for (const prompt of prompts) {
    const result = await synthesizeWithPrompt(transcript, prompt.content, prompt.name, options);
    results.push(result);
  }

  // Combine results with clear section headers
  const combined = formatCombinedResults(results);

  return { combined, results };
}

/**
 * Formats multiple synthesis results into a single combined document.
 */
function formatCombinedResults(results: SynthesisResult[]): string {
  if (results.length === 0) {
    return "";
  }

  if (results.length === 1) {
    return results[0].content;
  }

  // Multiple results: combine with separators
  const sections = results.map((result, index) => {
    const divider = index > 0 ? "\n\n---\n\n" : "";
    return `${divider}${result.content}`;
  });

  return sections.join("");
}

/**
 * Combines content from multiple files for combined mode.
 */
export function combineTranscripts(transcripts: { filename: string; transcript: string }[]): string {
  if (transcripts.length === 0) {
    return "";
  }

  if (transcripts.length === 1) {
    return transcripts[0].transcript;
  }

  // Multiple files: add filename headers
  const sections = transcripts.map(({ filename, transcript }) => {
    return `## ${filename}\n\n${transcript}`;
  });

  return sections.join("\n\n---\n\n");
}

/**
 * Creates a basic output when no prompts are selected.
 * Just wraps the transcript with a header.
 */
export function createBasicOutput(transcript: string, filename: string): string {
  return `# Transcript: ${filename}\n\n${transcript}`;
}
