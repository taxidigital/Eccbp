const YOUTUBE_ID_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

function extractYouTubeId(url) {
  if (!url) return null;
  const m = String(url).match(YOUTUBE_ID_RE);
  return m ? m[1] : null;
}

function normalizeYouTubeUrl(url) {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

module.exports = { extractYouTubeId, normalizeYouTubeUrl };
