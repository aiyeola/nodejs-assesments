const { expect } = require('chai');
const getCard = require('@app/services/creator-cards/get-card');
const { stubCreatorCard, captureError, expectBusinessError } = require('../support');

describe('getCard service', () => {
  let active;

  afterEach(() => {
    if (active) {
      active.revert();
      active = undefined;
    }
  });

  it('returns 404 NF01 when the card does not exist', async () => {
    active = stubCreatorCard({ method: 'findOne', mockNull: true });

    const error = await captureError(() => getCard({ slug: 'missing' }));

    expectBusinessError(error, 'NF01', 'RESOURCE_NOT_FOUND');
  });

  it('returns 404 NF02 when the card is a draft', async () => {
    active = stubCreatorCard({ method: 'findOne', docConfig: { status: 'draft' } });

    const error = await captureError(() => getCard({ slug: 'draft-card' }));

    expectBusinessError(error, 'NF02', 'RESOURCE_NOT_FOUND');
  });

  it('returns 403 AC03 when a private card is accessed without an access_code', async () => {
    active = stubCreatorCard({
      method: 'findOne',
      docConfig: { status: 'published', access_type: 'private', access_code: 'abc123' },
    });

    const error = await captureError(() => getCard({ slug: 'private-card' }));

    expectBusinessError(error, 'AC03', 'INVALID_REQUEST');
  });

  it('returns 403 AC04 when a private card is accessed with the wrong access_code', async () => {
    active = stubCreatorCard({
      method: 'findOne',
      docConfig: { status: 'published', access_type: 'private', access_code: 'abc123' },
    });

    const error = await captureError(() =>
      getCard({ slug: 'private-card', access_code: 'wrong1' })
    );

    expectBusinessError(error, 'AC04', 'INVALID_REQUEST');
  });

  it('returns a private card with the correct access_code and never exposes access_code', async () => {
    active = stubCreatorCard({
      method: 'findOne',
      docConfig: { status: 'published', access_type: 'private', access_code: 'abc123' },
    });

    const result = await getCard({ slug: 'private-card', access_code: 'abc123' });

    expect(result).to.have.property('id');
    expect(result).to.not.have.property('access_code');
    expect(result.access_type).to.equal('private');
  });

  it('returns a published public card without an access_code field', async () => {
    active = stubCreatorCard({
      method: 'findOne',
      docConfig: { status: 'published', access_type: 'public' },
    });

    const result = await getCard({ slug: 'public-card' });

    expect(result).to.not.have.property('access_code');
    expect(result.deleted).to.equal(null);
  });
});
