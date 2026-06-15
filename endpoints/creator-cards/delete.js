const { createHandler } = require('@app-core/server');
const deleteCard = require('@app/services/creator-cards/delete-card');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'delete',
  middlewares: [],
  async handler(rc, helpers) {
    const payload = {
      ...rc.body,
      ...rc.params,
    };

    const response = await deleteCard(payload);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'Creator card deleted successfully',
      data: response,
    };
  },
});
