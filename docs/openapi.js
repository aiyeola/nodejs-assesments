/**
 * OpenAPI 3.0 specification for the Creator Card microservice API.
 * Served as interactive Swagger UI at `/docs` and as raw JSON at `/openapi.json`.
 */

const VALID_REFERENCE = 'abcdefghij0123456789';

const errorResponse = (description, code, message) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
      example: {
        status: 'error',
        message,
        errors: [{ code, message }],
        data: { code },
      },
    },
  },
});

const cardExample = {
  id: '01KV6A7F3RECG1RBRGJ6BKJYW5',
  title: 'My Awesome Creator Page',
  description: 'A page about me',
  slug: 'my-awesome-creator-page',
  creator_reference: VALID_REFERENCE,
  links: [{ title: 'Website', url: 'https://example.com' }],
  service_rates: {
    currency: 'USD',
    rates: [{ name: 'Basic Plan', description: 'Starter tier', amount: 5000 }],
  },
  status: 'published',
  access_type: 'public',
  created: 1781549743224,
  updated: 1781549743224,
  deleted: null,
};

/**
 * Build the OpenAPI document, pointing the `servers` entry at the base URL the
 * app is actually being served from (so Swagger UI "Try it out" targets the
 * right host on localhost, Railway, Render, etc.).
 * @param {String} [baseUrl] e.g. https://my-app.up.railway.app
 * @returns {Object}
 */
module.exports = function buildOpenApiDocument(
  baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'
) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Creator Card Microservice API',
      version: '1.0.0',
      description:
        'Manage shareable creator profile cards displaying links and service rates. ' +
        'No authentication and no URL versioning. Business-rule failures return a custom ' +
        'code (e.g. `NF01`) in both `data.code` and `errors[].code`.',
    },
    servers: [{ url: baseUrl, description: 'Current server' }],
    tags: [{ name: 'Creator Cards', description: 'Create, retrieve and delete creator cards' }],
    paths: {
      '/creator-cards': {
        post: {
          tags: ['Creator Cards'],
          summary: 'Create a creator card',
          description:
            'Creates a card. The slug is auto-generated from the title when omitted. ' +
            'Returns the created card with the identifier as `id`. The `access_code` IS ' +
            'included in the create response.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateCardRequest' },
                examples: {
                  publicCard: {
                    summary: 'Public published card (auto slug)',
                    value: {
                      title: 'My Awesome Creator Page',
                      description: 'A page about me',
                      creator_reference: VALID_REFERENCE,
                      links: [{ title: 'Website', url: 'https://example.com' }],
                      service_rates: {
                        currency: 'USD',
                        rates: [{ name: 'Basic Plan', amount: 5000 }],
                      },
                      status: 'published',
                    },
                  },
                  privateCard: {
                    summary: 'Private card with access code',
                    value: {
                      title: 'Secret Coaching Page',
                      creator_reference: VALID_REFERENCE,
                      slug: 'secret-page',
                      service_rates: {
                        currency: 'GHS',
                        rates: [{ name: 'Gold Plan', amount: 250000 }],
                      },
                      status: 'published',
                      access_type: 'private',
                      access_code: 'sec123',
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Card created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CardResponse' },
                  example: {
                    status: 'success',
                    message: 'Creator card created successfully',
                    data: { ...cardExample, access_code: null },
                  },
                },
              },
            },
            400: errorResponse(
              'Validation or business-rule error (SL02 slug taken, AC01 access_code required ' +
                'for private, AC05 access_code not allowed on public, or field validation).',
              'SL02',
              'The provided slug is already taken'
            ),
          },
        },
      },
      '/creator-cards/{slug}': {
        get: {
          tags: ['Creator Cards'],
          summary: 'Retrieve a creator card by slug',
          description:
            'Public retrieval with access control. For private cards, supply the `access_code` ' +
            'as a query parameter. The `access_code` field is never returned.',
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              example: 'my-awesome-creator-page',
            },
            {
              name: 'access_code',
              in: 'query',
              required: false,
              description: 'Required only for private cards.',
              schema: { type: 'string', minLength: 6, maxLength: 6 },
              example: 'sec123',
            },
          ],
          responses: {
            200: {
              description: 'Card retrieved (access_code omitted)',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CardResponse' },
                  example: {
                    status: 'success',
                    message: 'Creator card retrieved successfully',
                    data: cardExample,
                  },
                },
              },
            },
            403: errorResponse(
              'Access denied for a private card (AC03 access_code required, AC04 invalid access_code).',
              'AC03',
              'An access_code is required to view this card'
            ),
            404: errorResponse(
              'Card not found (NF01) or card is a draft (NF02).',
              'NF01',
              'Creator card not found'
            ),
          },
        },
        delete: {
          tags: ['Creator Cards'],
          summary: 'Soft-delete a creator card',
          description:
            'Soft-deletes a card after verifying ownership. The card is matched on both the ' +
            'slug and the supplied `creator_reference`; a non-owner receives NF01. Returns the ' +
            'card with a `deleted` timestamp; deleted cards can no longer be retrieved.',
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              example: 'my-awesome-creator-page',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['creator_reference'],
                  properties: {
                    creator_reference: {
                      type: 'string',
                      minLength: 20,
                      maxLength: 20,
                      example: VALID_REFERENCE,
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Card soft-deleted',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CardResponse' },
                  example: {
                    status: 'success',
                    message: 'Creator card deleted successfully',
                    data: { ...cardExample, access_code: null, deleted: 1781549743409 },
                  },
                },
              },
            },
            400: errorResponse(
              'Validation error (e.g. creator_reference not exactly 20 characters).',
              'ERR',
              'Passed creator_reference length 5 should be 20'
            ),
            404: errorResponse(
              'No card matches the slug + creator_reference (NF01).',
              'NF01',
              'Creator card not found'
            ),
          },
        },
      },
    },
    components: {
      schemas: {
        Link: {
          type: 'object',
          required: ['title', 'url'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 100, example: 'Website' },
            url: {
              type: 'string',
              maxLength: 200,
              description: 'Must start with http:// or https://',
              example: 'https://example.com',
            },
          },
        },
        ServiceRate: {
          type: 'object',
          required: ['name', 'amount'],
          properties: {
            name: { type: 'string', minLength: 3, maxLength: 100, example: 'Basic Plan' },
            description: { type: 'string', maxLength: 250, example: 'Starter tier' },
            amount: {
              type: 'integer',
              minimum: 1,
              description: 'Positive integer in minor units (no decimals)',
              example: 5000,
            },
          },
        },
        ServiceRates: {
          type: 'object',
          required: ['currency', 'rates'],
          properties: {
            currency: { type: 'string', enum: ['NGN', 'USD', 'GBP', 'GHS'], example: 'USD' },
            rates: {
              type: 'array',
              minItems: 1,
              items: { $ref: '#/components/schemas/ServiceRate' },
            },
          },
        },
        CreateCardRequest: {
          type: 'object',
          required: ['title', 'creator_reference', 'service_rates', 'status'],
          properties: {
            title: { type: 'string', minLength: 3, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            slug: {
              type: 'string',
              minLength: 5,
              maxLength: 50,
              description: 'Letters, numbers, hyphens, underscores. Auto-generated if omitted.',
            },
            creator_reference: { type: 'string', minLength: 20, maxLength: 20 },
            links: { type: 'array', items: { $ref: '#/components/schemas/Link' } },
            service_rates: { $ref: '#/components/schemas/ServiceRates' },
            status: { type: 'string', enum: ['draft', 'published'] },
            access_type: { type: 'string', enum: ['public', 'private'], default: 'public' },
            access_code: {
              type: 'string',
              minLength: 6,
              maxLength: 6,
              description: 'Exactly 6 alphanumeric chars. Required when access_type is private.',
            },
          },
        },
        CreatorCard: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ULID identifier (serialized from _id)' },
            title: { type: 'string' },
            description: { type: 'string' },
            slug: { type: 'string' },
            creator_reference: { type: 'string' },
            links: { type: 'array', items: { $ref: '#/components/schemas/Link' } },
            service_rates: { $ref: '#/components/schemas/ServiceRates' },
            status: { type: 'string', enum: ['draft', 'published'] },
            access_type: { type: 'string', enum: ['public', 'private'] },
            access_code: {
              type: 'string',
              nullable: true,
              description: 'Returned on create/delete only; never on retrieval.',
            },
            created: { type: 'integer', description: 'Unix epoch milliseconds' },
            updated: { type: 'integer', description: 'Unix epoch milliseconds' },
            deleted: {
              type: 'integer',
              nullable: true,
              description: 'Null unless soft-deleted',
            },
          },
        },
        CardResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            message: { type: 'string' },
            data: { $ref: '#/components/schemas/CreatorCard' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'NF01' },
                  message: { type: 'string' },
                },
              },
            },
            data: {
              type: 'object',
              properties: { code: { type: 'string', example: 'NF01' } },
            },
          },
        },
      },
    },
  };
};
