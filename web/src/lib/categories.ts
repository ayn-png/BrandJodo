// Controlled vocabularies (Tier 3: categories as a controlled vocab). Use these
// everywhere niches/platforms/business categories are selected so search filters
// and profiles stay consistent.
export const NICHES = [
  'Food & Dining',
  'Fashion & Style',
  'Beauty & Skincare',
  'Fitness & Health',
  'Travel',
  'Technology',
  'Gaming',
  'Lifestyle',
  'Parenting',
  'Education',
  'Comedy & Entertainment',
  'Music & Dance',
  'Art & Design',
  'Business & Finance',
  'Home & Decor',
  'Automotive',
  'Sports',
  'Photography',
] as const

export const PLATFORMS = [
  'Instagram',
  'YouTube',
  'TikTok',
  'Facebook',
  'X (Twitter)',
  'LinkedIn',
  'Snapchat',
  'Pinterest',
] as const

export const BUSINESS_CATEGORIES = [
  'Restaurant / Cafe',
  'Retail Shop',
  'Gym / Fitness Studio',
  'Salon / Spa',
  'Clothing / Boutique',
  'Electronics',
  'Health / Wellness',
  'Education / Coaching',
  'Real Estate',
  'Events / Photography',
  'Other',
] as const

export type Niche = (typeof NICHES)[number]
export type Platform = (typeof PLATFORMS)[number]
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number]
