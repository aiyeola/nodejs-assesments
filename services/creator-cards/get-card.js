const validator = require('@app-core/validator');
const { appLogger } = require('@app-core/logger');
const CreatorCardMessages = require('@app/messages/creator-card');
const CreatorCardRepository = require('@app/repository/creator-card');
const { throwNotFound, throwForbidden, serializeCard } = require('./helpers');

const spec = `root {
  slug string<trim>
  access_code? string<trim>
}`;

const parsedSpec = validator.parse(spec);

/**
 * Retrieve a published creator card by slug, enforcing access control.
 * @param {Object} serviceData
 * @returns {Promise<Object>}
 */
async function getCard(serviceData) {
  let response;

  const data = validator.validate(serviceData, parsedSpec);

  try {
    const card = await CreatorCardRepository.findOne({ query: { slug: data.slug } });

    if (!card) {
      throwNotFound(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
    }

    if (card.status === 'draft') {
      throwNotFound(CreatorCardMessages.CARD_IS_DRAFT, 'NF02');
    }

    if (card.access_type === 'private') {
      const providedCode = typeof data.access_code === 'string' ? data.access_code : '';

      if (!providedCode) {
        throwForbidden(CreatorCardMessages.ACCESS_CODE_REQUIRED, 'AC03');
      }

      if (providedCode !== card.access_code) {
        throwForbidden(CreatorCardMessages.INVALID_ACCESS_CODE, 'AC04');
      }
    }

    response = serializeCard(card, { includeAccessCode: false });
  } catch (error) {
    appLogger.errorX(error, 'get-creator-card-error');
    throw error;
  }

  return response;
}

module.exports = getCard;
