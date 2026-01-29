const decodeHtmlEntities = (value: string): string => {
  const named = value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  return named.replace(/&#(\d+);/g, (_match, code) => {
    const parsed = Number.parseInt(code, 10);
    if (Number.isNaN(parsed)) {
      return _match;
    }
    return String.fromCharCode(parsed);
  });
};

export const stripHtml = (value: string): string => {
  const noTags = value.replace(/<[^>]*>/g, "");
  return decodeHtmlEntities(noTags);
};
