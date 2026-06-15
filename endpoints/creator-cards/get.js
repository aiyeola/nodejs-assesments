const { createHandler } = require('@app-core/server');
const getCard = require('@app/services/creator-cards/get-card');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'get',
  middlewares: [],
  async handler(rc, helpers) {
    const payload = {
      ...rc.query,
      ...rc.params,
    };

    const response = await getCard(payload);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'Creator card retrieved successfully',
      data: response,
    };
  },
});
