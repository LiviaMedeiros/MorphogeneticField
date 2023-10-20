const postDiscord = async (webhook, content) =>
  webhook && content && fetch(new URL(webhook, 'https://discord.com/api/webhooks/'), {
    method: 'POST',
    headers: {
      'User-Agent': 'MorphogeneticField',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      ...typeof content === 'string' ? { content } : content,
      username: 'MorphogeneticField',
    }),
  });

export default async (
  { isUrgent, videoId, authorName, publishedDate, updatedDate },
  { MESSAGE = '|', WEBHOOK_REAL = null, WEBHOOK_REST = null },
) =>
  postDiscord(
    isUrgent ? WEBHOOK_REAL : WEBHOOK_REST,
    `${authorName} via MorphogeneticField ${MESSAGE} ${new URL(videoId, 'https://youtu.be')} [<t:${publishedDate/1e3|0}:R>|<t:${updatedDate/1e3|0}:R>]`
  );
