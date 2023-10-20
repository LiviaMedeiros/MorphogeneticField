import report from '../alt/discord.mjs';

const headers = new Headers({
  'User-Agent': 'MorphogeneticField',
  'Content-Type': 'application/x-www-form-urlencoded',
});

const sub = async (mode, type, id, { ORIGIN, CALLBACK, VERIFY_TOKEN }) => {
  const hubCallback = new URL(CALLBACK, ORIGIN);
  const hubTopic = new URL('xml/feeds/videos.xml', 'https://www.youtube.com');
  hubTopic.searchParams.append(`${type}_id`, id);
  return fetch(new URL(mode, 'https://pubsubhubbub.appspot.com'), {
    method: 'POST',
    headers,
    body: new URLSearchParams({
      'hub.callback': hubCallback.href,
      'hub.topic': hubTopic.href,
      'hub.verify': 'async',
      'hub.mode': mode,
      'hub.verify_token': VERIFY_TOKEN,
      'hub.secret': '',
      'hub.lease_numbers': '',
    }),
  }).then(({ status }) => status);
};

const listVideos = async ({ DATABASE }) => {
  const { results } = await DATABASE.prepare('SELECT * FROM videos;').all();
  return results;
};

const listChannels = async ({ DATABASE }) => {
  const { results } = await DATABASE.prepare('SELECT channelId FROM channels;').all();
  return results.map(({ channelId }) => channelId);
};

const refreshSubscriptions = async env => {
  const { results } = await env.DATABASE.prepare('SELECT channelId FROM channels;').all();
  return Promise.all(results.map(({ channelId }) => sub('subscribe', 'channel', channelId, env)));
};

const getEntries = text =>
  [...text.matchAll(
    /<entry>.*<yt:videoId>(?<videoId>[\w-]{11})<\/yt:videoId>.*<yt:channelId>(?<channelId>[\w-]{24})<\/yt:channelId>.*<author>.*<name>(?<authorName>[^<]*)<\/name>.*<\/author>.*<published>(?<published>[^<]*)<\/published>.*<updated>(?<updated>[^<]*)<\/updated>.*<\/entry>/gs
  )].map(({ groups }) => groups);

const processRequest = async (request, env) => {
  const url = new URL(request.url);
  const [, action, ...options] = url.pathname.split('/');
  switch (action) {
    case 'callback': switch (request.method) {
      case 'POST': {
        const text = await request.text();
        const entries = getEntries(text);
        const currentDate = +new Date;
        return void await Promise.all(entries.map(async ({ videoId, channelId, authorName, published, updated }) => {
          const publishedDate = +new Date(published);
          const updatedDate = +new Date(updated);
          const isUrgent = currentDate - publishedDate < 36e4 && !await env.DATABASE.prepare('SELECT 1 FROM videos WHERE videoId = ?;').bind(videoId).first();
          await env.DATABASE.prepare('REPLACE INTO videos (videoId, channelId, authorName, published, updated) VALUES (?, ?, ?, ?, ?);').bind(videoId, channelId, authorName, published, updated).run();
          return report({ isUrgent, videoId, authorName, publishedDate, updatedDate }, env);
        }));
      }
      case 'GET': {
        if (url.searchParams.get('hub.verify_token') !== env.VERIFY_TOKEN)
          return new Response(null, { status: 401 });
        return new Response(url.searchParams.get('hub.challenge'));
      }
      default: return new Response(null, { status: 405 });
    }
    case 'subscribe':
    case 'unsubscribe': {
      const [type, ...channels] = options;
      const statement = env.DATABASE.prepare(action === 'subscribe'
        ? 'REPLACE INTO channels (channelId, prefix) VALUES (?, \'\');'
        : 'DELETE FROM channels WHERE channelId = ?;'
      );
      return Promise.all(channels.map(async channelId => {
        await statement.bind(channelId).run();
        return sub(action, type, channelId, env);
      }));
    }
    case 'listVideos': return listVideos(env);
    case 'listChannels': return listChannels(env);
    case 'refreshSubscriptions': return refreshSubscriptions(env);
    default: return new Response(null, { status: 404 });
  }
};

export {
  processRequest as default,
  refreshSubscriptions,
};
