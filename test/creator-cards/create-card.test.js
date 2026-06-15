const { expect } = require('chai');
const createCard = require('@app/services/creator-cards/create-card');
const {
  stubCreatorCard,
  captureError,
  expectBusinessError,
  validCardPayload,
} = require('../support');

describe('createCard service', () => {
  let active;

  afterEach(() => {
    if (active) {
      active.revert();
      active = undefined;
    }
  });

  it('creates a public card, auto-generating a slug and returning id (not _id)', async () => {
    active = stubCreatorCard({ method: 'findOne', mockNull: true }); // slug is free

    const result = await createCard(validCardPayload());

    expect(result).to.have.property('id');
    expect(result).to.not.have.property('_id');
    expect(result.slug).to.match(/^[a-z0-9-]+$/);
    expect(result.slug.length).to.be.within(5, 50);
    expect(result.access_type).to.equal('public');
    expect(result.access_code).to.equal(null);
    expect(result.deleted).to.equal(null);
  });

  it('creates a private card and includes the access_code in the response', async () => {
    active = stubCreatorCard({ method: 'findOne', mockNull: true });

    const result = await createCard(
      validCardPayload({ access_type: 'private', access_code: 'sec123', slug: 'secret-page' })
    );

    expect(result.access_type).to.equal('private');
    expect(result.access_code).to.equal('sec123');
    expect(result.slug).to.equal('secret-page');
  });

  it('rejects a duplicate user-supplied slug with SL02 (400)', async () => {
    active = stubCreatorCard({ method: 'findOne' }); // findOne returns a doc => slug taken

    const error = await captureError(() => createCard(validCardPayload({ slug: 'taken-slug' })));

    expectBusinessError(error, 'SL02', 'VALIDATION_ERROR');
  });

  it('requires an access_code for private cards (AC01)', async () => {
    const error = await captureError(() =>
      createCard(validCardPayload({ access_type: 'private' }))
    );

    expectBusinessError(error, 'AC01', 'VALIDATION_ERROR');
  });

  it('forbids an access_code on public cards (AC05)', async () => {
    const error = await captureError(() =>
      createCard(validCardPayload({ access_type: 'public', access_code: 'abc123' }))
    );

    expectBusinessError(error, 'AC05', 'VALIDATION_ERROR');
  });

  it('rejects a non-integer rate amount (AM01)', async () => {
    const error = await captureError(() =>
      createCard(
        validCardPayload({
          service_rates: { currency: 'USD', rates: [{ name: 'Bad Plan', amount: 10.5 }] },
        })
      )
    );

    expectBusinessError(error, 'AM01', 'VALIDATION_ERROR');
  });

  it('rejects a link with a non-http url', async () => {
    const error = await captureError(() =>
      createCard(validCardPayload({ links: [{ title: 'Bad', url: 'ftp://example.com' }] }))
    );

    expect(error.isApplicationError).to.equal(true);
  });

  it('rejects a title shorter than 3 characters with a 400 validation error', async () => {
    const error = await captureError(() => createCard(validCardPayload({ title: 'ab' })));

    // The framework validator throws SPCL_VALIDATION which maps to HTTP 400.
    expect(error.errorCode).to.equal('SPCL_VALIDATION');
  });
});
