// Validates the URL field on req.body before the controller runs.
// Returns 400 immediately so the controller never sees bad input.
export function validateUrl(req, res, next) {
  const { url } = req.body;

  if (!url || typeof url !== "string" || !url.trim()) {
    return res.status(400).json({ error: "URL is required." });
  }

  if (url.length > 2048) {
    return res.status(400).json({ error: "URL is too long." });
  }

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    return res.status(400).json({ error: "Invalid URL format. Must start with http:// or https://" });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return res.status(400).json({ error: "Only HTTP and HTTPS URLs are allowed." });
  }

  // Normalise — strip fragment, overwrite with cleaned version
  req.body.url = url.trim();
  next();
}
