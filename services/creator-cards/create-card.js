const validator = require('@app-core/validator');
const { appLogger } = require('@app-core/logger');
const { ERROR_CODE } = require('@app-core/errors');
const CreatorCardMessages = require('@app/messages/creator-card');
const CreatorCardRepository = require('@app/repository/creator-card');
const {
  throwBadRequest,
  isValidSlug,
  isValidAccessCode,
  slugifyTitle,
  withUniqueSuffix,
  serializeCard,
} = require('./helpers');

const spec = `root {
  title string<trim|lengthBetween:3,100>
  description? string<trim|maxLength:500>
  slug? string<trim>
  creator_reference string<length:20>
  links[]? {
    title string<trim|lengthBetween:1,100>
    url string<trim|maxLength:200>
  }
  service_rates {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<trim|lengthBetween:3,100>
      description? string<trim|maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string
}`;

const parsedSpec = validator.parse(spec);

const MAX_SLUG_GENERATION_ATTEMPTS = 5;

async function slugIsTaken(slug) {
  const existing = await CreatorCardRepository.findOne({ query: { slug } });
  return !!existing;
}

async function resolveSlug(providedSlug, title) {
  let slug;

  if (typeof providedSlug === 'string' && providedSlug.length) {
    if (!isValidSlug(providedSlug)) {
      throwBadRequest(CreatorCardMessages.INVALID_SLUG_FORMAT, 'SL01');
    }

    if (await slugIsTaken(providedSlug)) {
      throwBadRequest(CreatorCardMessages.SLUG_TAKEN, 'SL02');
    }

    slug = providedSlug;
  } else {
    slug = slugifyTitle(title);

    let attempts = 0;
    // eslint-disable-next-line no-await-in-loop
    while ((await slugIsTaken(slug)) && attempts < MAX_SLUG_GENERATION_ATTEMPTS) {
      slug = withUniqueSuffix(slugifyTitle(title));
      attempts += 1;
    }
  }

  return slug;
}

function validateLinks(links) {
  links.forEach((link) => {
    const url = link.url || '';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throwBadRequest(CreatorCardMessages.INVALID_LINK, 'LK01');
    }
  });
}

function validateAmounts(rates) {
  rates.forEach((rate) => {
    if (!Number.isInteger(rate.amount) || rate.amount < 1) {
      throwBadRequest(CreatorCardMessages.INVALID_AMOUNT, 'AM01');
    }
  });
}

function resolveAccess(data) {
  const accessType = data.access_type || 'public';
  const hasAccessCode = typeof data.access_code === 'string' && data.access_code.length > 0;

  if (hasAccessCode && !isValidAccessCode(data.access_code)) {
    throwBadRequest(CreatorCardMessages.INVALID_ACCESS_CODE_FORMAT, 'AC02');
  }

  if (accessType === 'private' && !hasAccessCode) {
    throwBadRequest(CreatorCardMessages.ACCESS_CODE_REQUIRED_FOR_PRIVATE, 'AC01');
  }

  if (accessType === 'public' && hasAccessCode) {
    throwBadRequest(CreatorCardMessages.ACCESS_CODE_NOT_ALLOWED_FOR_PUBLIC, 'AC05');
  }

  return {
    access_type: accessType,
    access_code: accessType === 'private' ? data.access_code : null,
  };
}

/**
 * Create a creator card.
 * @param {Object} serviceData
 * @returns {Promise<Object>}
 */
async function createCard(serviceData) {
  let response;

  const data = validator.validate(serviceData, parsedSpec);

  try {
    const links = Array.isArray(data.links) ? data.links : [];
    validateLinks(links);
    validateAmounts(data.service_rates.rates);

    const access = resolveAccess(data);
    const slug = await resolveSlug(data.slug, data.title);

    const cardToCreate = {
      title: data.title,
      description: data.description || '',
      slug,
      creator_reference: data.creator_reference,
      links,
      service_rates: data.service_rates,
      status: data.status,
      access_type: access.access_type,
      access_code: access.access_code,
    };

    let createdCard;
    try {
      createdCard = await CreatorCardRepository.create(cardToCreate);
    } catch (error) {
      // A unique-index collision on slug is surfaced as a duplicate-record error
      // by the repository; translate it into the assessment's SL02 (HTTP 400).
      if (error.errorCode === ERROR_CODE.DUPLRCRD) {
        throwBadRequest(CreatorCardMessages.SLUG_TAKEN, 'SL02');
      }
      throw error;
    }

    response = serializeCard(createdCard, { includeAccessCode: true });
  } catch (error) {
    appLogger.errorX(error, 'create-creator-card-error');
    throw error;
  }

  return response;
}

module.exports = createCard;
