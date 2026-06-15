const validator = require('@app-core/validator');
const { appLogger } = require('@app-core/logger');
const CreatorCardMessages = require('@app/messages/creator-card');
const CreatorCardRepository = require('@app/repository/creator-card');
const { throwNotFound, serializeCard } = require('./helpers');

const spec = `root {
  slug string<trim>
  creator_reference string<length:20>
}`;

const parsedSpec = validator.parse(spec);

/**
 * Soft-delete a creator card, verifying ownership via creator_reference.
 * @param {Object} serviceData
 * @returns {Promise<Object>}
 */
async function deleteCard(serviceData) {
  let response;

  const data = validator.validate(serviceData, parsedSpec);

  try {
    // The card must match BOTH the slug and the supplied creator_reference.
    // A mismatch (or a missing card) is reported uniformly as NF01 so the
    // endpoint never reveals the existence of a card to a non-owner.
    const card = await CreatorCardRepository.findOne({
      query: { slug: data.slug, creator_reference: data.creator_reference },
    });

    if (!card) {
      throwNotFound(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
    }

    await CreatorCardRepository.deleteOne({ query: { _id: card._id } });

    const deletedTimestamp = Date.now();
    response = serializeCard({ ...card, deleted: deletedTimestamp }, { includeAccessCode: true });
  } catch (error) {
    // Expected business rejections (NF01) are normal control flow.
    if (!error.isApplicationError) {
      appLogger.errorX(error, 'delete-creator-card-error');
    }
    throw error;
  }

  return response;
}

module.exports = deleteCard;
