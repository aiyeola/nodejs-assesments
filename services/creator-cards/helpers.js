const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { randomBytes } = require('@app-core/randomness');

const SLUG_ALLOWED = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
const ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Throw a business-rule error.
 * The custom business code (e.g. NF01) is exposed in the response `data.code`
 * and `errors[].code`, while `errorCode` controls the HTTP status returned by
 * the framework (via ERROR_STATUS_CODE_MAPPING).
 *
 * @param {String} message Human readable message
 * @param {String} code Assessment business code (SL02, NF01, AC03, ...)
 * @param {String} errorCode Framework ERROR_CODE used to resolve the HTTP status
 */
function throwBusinessError(message, code, errorCode) {
  throwAppError(message, errorCode, {
    context: { code },
    details: [{ code, message }],
  });
}

/** HTTP 400 business error */
function throwBadRequest(message, code) {
  throwBusinessError(message, code, ERROR_CODE.VALIDATIONERR);
}

/** HTTP 403 business error */
function throwForbidden(message, code) {
  throwBusinessError(message, code, ERROR_CODE.INVLDREQ);
}

/** HTTP 404 business error */
function throwNotFound(message, code) {
  throwBusinessError(message, code, ERROR_CODE.NOTFOUND);
}

/**
 * Checks that every character of a string belongs to an allowed character set.
 * @param {String} value
 * @param {String} allowed
 * @returns {Boolean}
 */
function hasOnlyAllowedChars(value, allowed) {
  for (let i = 0; i < value.length; i++) {
    if (!allowed.includes(value[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Validate slug format: 5-50 chars, letters/numbers/hyphens/underscores.
 * @param {String} slug
 * @returns {Boolean}
 */
function isValidSlug(slug) {
  if (typeof slug !== 'string') return false;
  if (slug.length < 5 || slug.length > 50) return false;
  return hasOnlyAllowedChars(slug, SLUG_ALLOWED);
}

/**
 * Validate access code: exactly 6 alphanumeric chars.
 * @param {String} code
 * @returns {Boolean}
 */
function isValidAccessCode(code) {
  if (typeof code !== 'string') return false;
  if (code.length !== 6) return false;
  return hasOnlyAllowedChars(code, ALPHANUMERIC);
}

/**
 * Generate a URL friendly slug from a title.
 * Lowercases, replaces any non-alphanumeric run with a single hyphen and
 * guarantees the 5-50 character length constraint.
 * @param {String} title
 * @returns {String}
 */
function slugifyTitle(title) {
  const lowered = String(title).toLowerCase().trim();
  let slug = '';
  let lastWasHyphen = false;

  for (let i = 0; i < lowered.length; i++) {
    const char = lowered[i];
    if (ALPHANUMERIC.includes(char)) {
      slug += char;
      lastWasHyphen = false;
    } else if (!lastWasHyphen) {
      slug += '-';
      lastWasHyphen = true;
    }
  }

  // Trim leading/trailing hyphens.
  while (slug.startsWith('-')) slug = slug.slice(1);
  while (slug.endsWith('-')) slug = slug.slice(0, -1);

  // Enforce maximum length, leaving room for a uniqueness suffix.
  if (slug.length > 50) {
    slug = slug.slice(0, 50);
    while (slug.endsWith('-')) slug = slug.slice(0, -1);
  }

  // Enforce minimum length.
  if (slug.length < 5) {
    slug = `${slug}${slug.length ? '-' : ''}${randomBytes(6).toLowerCase()}`.slice(0, 50);
  }

  return slug;
}

/**
 * Append a short random suffix to a slug while keeping it within 50 chars.
 * @param {String} slug
 * @returns {String}
 */
function withUniqueSuffix(slug) {
  const suffix = `-${randomBytes(4).toLowerCase()}`;
  const base = slug.slice(0, 50 - suffix.length);
  return `${base}${suffix}`;
}

/**
 * Serialize a stored creator card document into the public API shape.
 * Maps `_id` -> `id`, normalises `deleted` (0 -> null) and optionally strips
 * the `access_code`.
 * @param {Object} card
 * @param {{ includeAccessCode?: Boolean }} [options]
 * @returns {Object}
 */
function serializeCard(card, options = {}) {
  const { includeAccessCode = false } = options;

  const serialized = {
    id: card._id,
    title: card.title,
    description: card.description ?? '',
    slug: card.slug,
    creator_reference: card.creator_reference,
    links: Array.isArray(card.links) ? card.links : [],
    service_rates: card.service_rates,
    status: card.status,
    access_type: card.access_type,
    created: card.created,
    updated: card.updated,
    deleted: card.deleted ? card.deleted : null,
  };

  if (includeAccessCode) {
    serialized.access_code = card.access_code ?? null;
  }

  return serialized;
}

module.exports = {
  throwBadRequest,
  throwForbidden,
  throwNotFound,
  isValidSlug,
  isValidAccessCode,
  slugifyTitle,
  withUniqueSuffix,
  serializeCard,
};
