import { NICHES, PLATFORMS, BUSINESS_CATEGORIES } from '@/lib/categories'

const vocabs: Array<[string, readonly string[]]> = [
  ['NICHES', NICHES],
  ['PLATFORMS', PLATFORMS],
  ['BUSINESS_CATEGORIES', BUSINESS_CATEGORIES],
]

describe.each(vocabs)('%s controlled vocabulary', (name, vocab) => {
  it('is non-empty', () => {
    expect(vocab.length).toBeGreaterThan(0)
  })

  it('contains only non-empty strings', () => {
    for (const value of vocab) {
      expect(typeof value).toBe('string')
      expect(value.trim().length).toBeGreaterThan(0)
    }
  })

  it('contains no duplicate values', () => {
    expect(new Set(vocab).size).toBe(vocab.length)
  })
})
