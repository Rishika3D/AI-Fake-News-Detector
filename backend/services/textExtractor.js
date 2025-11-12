import { extract } from "@extractus/article-extractor";

export const extractTextFromLink = async (url) => {
  try {
    const article = await extract(url);
    if (!article || !article.content) {
      throw new Error("Could not extract article content from the URL.");
    }
    return (article.title || "") + "\n" + article.content;
    
  } catch (err) {
    console.error(`Error extracting text from ${url}:`, err.message);
    throw new Error("Failed to extract text from link.");
  }
};