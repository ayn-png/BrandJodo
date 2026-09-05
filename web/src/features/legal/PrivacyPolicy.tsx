import { Card, PageHeader } from '@/components/ui'
import { LegalSection } from '@/features/legal/LegalSection'

// Static Privacy Policy for AInfluencer (v1). India-first, prices in ₹, and
// payments are a SIMULATED escrow — no real money is processed yet.
export function PrivacyPolicy() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Privacy Policy"
        subtitle="How AInfluencer collects, uses, and protects your information. Last updated 5 September 2026."
      />
      <Card className="space-y-6">
        <p className="text-sm leading-relaxed text-gray-600">
          AInfluencer is a price-first marketplace that connects local businesses (clients) with
          local content creators (influencers) in India. This policy explains what data we handle
          when you use the app. By using AInfluencer you agree to the practices described here.
        </p>

        <LegalSection heading="Information we collect">
          <p>We collect only what we need to run the marketplace:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Account and profile.</strong> Your email and a password (stored securely, never
              in plain text). Clients add a business name, business category, and location. Creators
              add a name, bio, location, niches, platforms, follower count, portfolio media, and a
              rate card of deliverables with fixed prices in ₹ (INR).
            </li>
            <li>
              <strong>Bookings.</strong> The deliverables you request or offer, agreed prices in ₹,
              deadlines, usage rights, and the status of each booking.
            </li>
            <li>
              <strong>Messages.</strong> Chat between a client and creator is tied to a specific
              booking so both sides have a shared record of the conversation.
            </li>
            <li>
              <strong>Reviews and ratings.</strong> After a booking is completed, a client can leave a
              1–5 rating and comment about the creator.
            </li>
            <li>
              <strong>Technical data.</strong> A login session token to keep you signed in, plus basic
              log data needed to operate and secure the service.
            </li>
          </ul>
        </LegalSection>

        <LegalSection heading="Payments and simulated escrow">
          <p>
            In this version (v1) payments are <strong>simulated</strong>. No real money changes hands
            and we do <strong>not</strong> collect card, UPI, or bank details. Prices shown in ₹ are
            the amounts you and the other party agree to — nothing is charged.
          </p>
          <p>
            The escrow flow is modelled with status flags only: a booking is marked funded, then
            delivered, then released. If a delivered booking is not disputed, it{' '}
            <strong>auto-releases 6 days after delivery</strong>. When real payments (for example
            Razorpay) are added later, we will update this policy before processing any money.
          </p>
        </LegalSection>

        <LegalSection heading="How we use your information">
          <ul className="list-disc space-y-1 pl-5">
            <li>Show creator profiles and rate cards so clients can search and sort by price.</li>
            <li>Create and manage bookings and their status through to completion.</li>
            <li>Let the two parties on a booking message each other and share deliverables.</li>
            <li>Display reviews and average ratings to help clients choose creators.</li>
            <li>Keep the service secure, prevent abuse, and fix problems.</li>
          </ul>
          <p>We do not sell your personal data, and we do not run third-party advertising.</p>
        </LegalSection>

        <LegalSection heading="What other people can see">
          <p>
            Creator profiles, rate cards, portfolio media, and reviews are public so clients can
            discover them. Client business details may be shown to a creator when a booking is made.
            Messages are visible only to the client and creator on that booking.
          </p>
        </LegalSection>

        <LegalSection heading="Where your data is stored and how we protect it">
          <p>
            Your data is stored in a managed Postgres database (Supabase). Access is enforced by
            row-level security so users can only read and change the records they are allowed to, and
            data is encrypted in transit. No system is perfectly secure, but we take reasonable steps
            to protect your information.
          </p>
        </LegalSection>

        <LegalSection heading="Data retention and your choices">
          <p>
            We keep your data for as long as your account is active or as needed to provide the
            service. You can view and update your profile at any time from within the app. To request
            correction or deletion of your account and associated data, contact us using the details
            below; some records tied to completed bookings or reviews may be retained where needed for
            integrity or to meet legal obligations.
          </p>
        </LegalSection>

        <LegalSection heading="Children">
          <p>
            AInfluencer is intended for users aged 18 and over. We do not knowingly collect data from
            children. If you believe a minor has created an account, please contact us.
          </p>
        </LegalSection>

        <LegalSection heading="Changes to this policy">
          <p>
            We may update this policy as the product grows — for example when real payments are
            introduced. We will change the “last updated” date above and, where appropriate, notify
            you in the app.
          </p>
        </LegalSection>

        <LegalSection heading="Contact and disputes">
          <p>
            For privacy questions or data requests, email{' '}
            <span className="font-medium text-gray-700">support@ainfluencer.app</span>. For issues
            with a specific booking, use the in-app dispute option on that booking so both parties and
            our team have the full context.
          </p>
        </LegalSection>
      </Card>
    </div>
  )
}
