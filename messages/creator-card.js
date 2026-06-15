module.exports = {
  // Validation (HTTP 400)
  TITLE_REQUIRED: 'Title is required and must be between 3 and 100 characters',
  INVALID_SLUG_FORMAT:
    'Slug must be 5-50 characters and contain only letters, numbers, hyphens and underscores',
  CREATOR_REFERENCE_LENGTH: 'creator_reference must be exactly 20 characters',
  INVALID_LINK: 'Each link must have a title (1-100 chars) and a url starting with http/https',
  SERVICE_RATES_REQUIRED: 'service_rates must contain a currency and a non-empty rates array',
  INVALID_AMOUNT: 'Each service rate amount must be a positive integer in minor units',
  INVALID_ACCESS_CODE_FORMAT: 'access_code must be exactly 6 alphanumeric characters',

  // Slug uniqueness (SL02 - HTTP 400)
  SLUG_TAKEN: 'The provided slug is already taken',

  // Access code business rules on create (AC01 / AC05 - HTTP 400)
  ACCESS_CODE_REQUIRED_FOR_PRIVATE: 'access_code is required when access_type is private',
  ACCESS_CODE_NOT_ALLOWED_FOR_PUBLIC: 'access_code cannot be set on a public card',

  // Retrieval (NF01 / NF02 - HTTP 404)
  CARD_NOT_FOUND: 'Creator card not found',
  CARD_IS_DRAFT: 'Creator card not found',

  // Access control on retrieval (AC03 / AC04 - HTTP 403)
  ACCESS_CODE_REQUIRED: 'An access_code is required to view this card',
  INVALID_ACCESS_CODE: 'The provided access_code is invalid',
};
