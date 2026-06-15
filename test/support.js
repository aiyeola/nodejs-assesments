const { expect } = require('chai');
const { MockModelStubs } = require('@app/mock-models');

const CreatorCardStubs = MockModelStubs.CreatorCard;

const VALID_REFERENCE = 'abcdefghij0123456789'; // exactly 20 chars

/**
 * Configure the CreatorCard repository mock for a single test and return a
 * revert function so the stub can be restored afterwards.
 * @param {Object} config See create-stubs-decorator StubConfigData
 * @returns {{ mockedDoc: Object, revert: Function }}
 */
function stubCreatorCard(config) {
  return CreatorCardStubs.configureStubs(config);
}

/**
 * Invoke an async service and capture the application error it throws.
 * Fails the test if the call unexpectedly succeeds.
 * @param {Function} fn
 * @returns {Promise<Error>}
 */
async function captureError(fn) {
  let caught;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }
  // eslint-disable-next-line no-unused-expressions
  expect(caught, 'expected the service to throw').to.exist;
  return caught;
}

/**
 * Assert that an error carries the expected business code + framework error code.
 * @param {Error} error
 * @param {String} businessCode e.g. NF01
 * @param {String} [frameworkErrorCode] e.g. RESOURCE_NOT_FOUND
 */
function expectBusinessError(error, businessCode, frameworkErrorCode) {
  expect(error.isApplicationError).to.equal(true);
  expect(error.context).to.have.property('code', businessCode);
  if (frameworkErrorCode) {
    expect(error.errorCode).to.equal(frameworkErrorCode);
  }
}

function validCardPayload(overrides = {}) {
  return {
    title: 'My Awesome Creator Page',
    description: 'A page about me',
    creator_reference: VALID_REFERENCE,
    links: [{ title: 'Website', url: 'https://example.com' }],
    service_rates: {
      currency: 'USD',
      rates: [{ name: 'Basic Plan', description: 'starter', amount: 5000 }],
    },
    status: 'published',
    ...overrides,
  };
}

module.exports = {
  stubCreatorCard,
  captureError,
  expectBusinessError,
  validCardPayload,
  VALID_REFERENCE,
};
