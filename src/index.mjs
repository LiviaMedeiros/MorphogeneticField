import { default as processRequest, refreshSubscriptions } from './lib/websub.mjs';

export default {
  async fetch(request, env) {
    const response = await processRequest(request, env);
    return response instanceof Response ? response : Response.json({ response });
  },
  async scheduled(event, env) {
    return refreshSubscriptions(env);
  },
};
