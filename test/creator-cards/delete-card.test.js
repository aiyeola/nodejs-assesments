const { expect } = require('chai');
const deleteCard = require('@app/services/creator-cards/delete-card');
const {
  stubCreatorCard,
  captureError,
  expectBusinessError,
  VALID_REFERENCE,
} = require('../support');

describe('deleteCard service', () => {
  let active;

  afterEach(() => {
    if (active) {
      active.revert();
      active = undefined;
    }
  });

  it('soft-deletes a card and returns it with a deleted timestamp', async () => {
    active = stubCreatorCard({
      method: 'findOne',
      docConfig: { status: 'published', access_type: 'public' },
    });

    const result = await deleteCard({ slug: 'my-card', creator_reference: VALID_REFERENCE });

    expect(result).to.have.property('id');
    expect(result.deleted).to.be.a('number');
    expect(result.deleted).to.be.greaterThan(0);
  });

  it('returns 404 NF01 when no card matches the slug + creator_reference', async () => {
    active = stubCreatorCard({ method: 'findOne', mockNull: true });

    const error = await captureError(() =>
      deleteCard({ slug: 'my-card', creator_reference: VALID_REFERENCE })
    );

    expectBusinessError(error, 'NF01', 'RESOURCE_NOT_FOUND');
  });

  it('rejects a creator_reference that is not exactly 20 characters (400 validation)', async () => {
    const error = await captureError(() =>
      deleteCard({ slug: 'my-card', creator_reference: 'too-short' })
    );

    expect(error.errorCode).to.equal('SPCL_VALIDATION');
  });
});
