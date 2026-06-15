const { expect } = require('chai');
const {
  isValidSlug,
  isValidAccessCode,
  slugifyTitle,
  serializeCard,
} = require('@app/services/creator-cards/helpers');

describe('creator-card helpers', () => {
  describe('isValidSlug', () => {
    it('accepts 5-50 char slugs of letters, numbers, hyphens, underscores', () => {
      expect(isValidSlug('my-slug')).to.equal(true);
      expect(isValidSlug('My_Slug-123')).to.equal(true);
    });

    it('rejects slugs that are too short, too long, or contain invalid characters', () => {
      expect(isValidSlug('abcd')).to.equal(false); // 4 chars
      expect(isValidSlug('a'.repeat(51))).to.equal(false); // 51 chars
      expect(isValidSlug('has spaces')).to.equal(false);
      expect(isValidSlug('has!bang')).to.equal(false);
    });
  });

  describe('isValidAccessCode', () => {
    it('accepts exactly 6 alphanumeric characters', () => {
      expect(isValidAccessCode('abc123')).to.equal(true);
      expect(isValidAccessCode('ABCDEF')).to.equal(true);
    });

    it('rejects wrong length or non-alphanumeric codes', () => {
      expect(isValidAccessCode('abc12')).to.equal(false);
      expect(isValidAccessCode('abc1234')).to.equal(false);
      expect(isValidAccessCode('abc-12')).to.equal(false);
    });
  });

  describe('slugifyTitle', () => {
    it('lowercases, hyphenates and trims to a valid slug', () => {
      expect(slugifyTitle('My Awesome Page!!')).to.equal('my-awesome-page');
    });

    it('always produces a slug within the 5-50 character bounds', () => {
      const short = slugifyTitle('Hi');
      expect(short.length).to.be.within(5, 50);

      const long = slugifyTitle('a'.repeat(120));
      expect(long.length).to.be.within(5, 50);
    });
  });

  describe('serializeCard', () => {
    const stored = {
      _id: '01ABCDEF',
      title: 'Card',
      slug: 'a-card',
      creator_reference: 'abcdefghij0123456789',
      service_rates: { currency: 'USD', rates: [] },
      status: 'published',
      access_type: 'private',
      access_code: 'sec123',
      created: 1,
      updated: 2,
      deleted: 0,
    };

    it('maps _id to id and normalises deleted (0 -> null)', () => {
      const result = serializeCard(stored);
      expect(result.id).to.equal('01ABCDEF');
      expect(result).to.not.have.property('_id');
      expect(result.deleted).to.equal(null);
    });

    it('omits access_code by default and includes it when requested', () => {
      expect(serializeCard(stored)).to.not.have.property('access_code');
      expect(serializeCard(stored, { includeAccessCode: true }).access_code).to.equal('sec123');
    });
  });
});
