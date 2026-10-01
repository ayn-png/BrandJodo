import { Card, PageHeader } from '@/components/ui'
import { LegalSection } from '@/features/legal/LegalSection'

// Static Terms of Service for BrandJodo (v1). India-first marketplace; prices
// in ₹; payments are a SIMULATED escrow with auto-release 6 days after delivery.
export function TermsOfService() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Terms of Service"
        subtitle="The rules for using BrandJodo. Last updated 5 September 2026."
      />
      <Card className="space-y-6">
        <p className="text-sm leading-relaxed text-gray-600">
          Welcome to BrandJodo, a price-first marketplace that connects local businesses (clients)
          with local content creators (influencers) in India. By creating an account or using the
          app, you agree to these terms. If you do not agree, please do not use BrandJodo.
        </p>

        <LegalSection heading="What BrandJodo is">
          <p>
            BrandJodo is a platform that helps clients and creators find each other and agree on
            paid content bookings at transparent, fixed prices in ₹ (INR). The agreement for any
            piece of work is between the client and the creator. BrandJodo is not a party to that
            agreement and does not act as an agent, employer, or guarantor of either side.
          </p>
        </LegalSection>

        <LegalSection heading="Eligibility and your account">
          <p>
            You must be at least 18 years old to use BrandJodo. Provide accurate information, keep
            your login credentials safe, and take responsibility for activity under your account. You
            may hold a client or a creator profile; enforcement of what each role can do is handled
            on the server, not just in the app.
          </p>
        </LegalSection>

        <LegalSection heading="Bookings and the escrow flow">
          <p>Each booking moves through a defined set of statuses:</p>
          <p className="rounded-md bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700">
            REQUESTED → (COUNTERED) → ACCEPTED → FUNDED → DELIVERED → COMPLETED
          </p>
          <p>
            A request can be declined, and a booking can be cancelled or disputed. Prices are agreed
            up front from the creator’s rate card, so both sides know the total before committing.
          </p>
        </LegalSection>

        <LegalSection heading="Simulated payments (v1)">
          <p>
            In this version, payments are <strong>simulated</strong>. No real money is collected,
            held, or transferred, and we do not process cards, UPI, or bank transfers. “Funding” and
            “release” are status flags used to model an escrow-style flow so both sides can trust the
            process.
          </p>
          <p>
            When a booking is marked delivered, it{' '}
            <strong>automatically releases 6 days after delivery</strong> unless it is disputed
            first. Because no real money moves in v1, you must settle any actual payment between
            yourselves until real payments (for example Razorpay) are added. We will update these
            terms before any real money is handled.
          </p>
        </LegalSection>

        <LegalSection heading="Prices and fees">
          <p>
            Creators set fixed prices per deliverable on their rate card, shown in ₹. Totals are
            displayed clearly before a booking is confirmed, with no hidden platform fees in v1. If we
            introduce platform fees or featured listings in future, we will disclose them before they
            apply to you.
          </p>
        </LegalSection>

        <LegalSection heading="Your content and conduct">
          <p>
            You are responsible for the content you add — profile details, portfolio media, messages,
            and reviews. You must have the right to share what you upload, and you grant BrandJodo
            permission to display it as needed to operate the marketplace. Do not post content that is
            illegal, infringing, misleading, hateful, harassing, or otherwise harmful, and do not
            misrepresent your identity, following, or work.
          </p>
        </LegalSection>

        <LegalSection heading="Reviews">
          <p>
            A client may leave a review only after a booking is completed. Reviews must be honest and
            based on a genuine engagement. Fake, incentivised, or retaliatory reviews are not allowed
            and may be removed.
          </p>
        </LegalSection>

        <LegalSection heading="Prohibited use">
          <ul className="list-disc space-y-1 pl-5">
            <li>Fraud, scams, or impersonating another person or business.</li>
            <li>Harassment, threats, or abusive behaviour toward other users.</li>
            <li>Spamming, scraping, or trying to bypass the platform’s security or access controls.</li>
            <li>Using the service for anything unlawful under applicable Indian law.</li>
          </ul>
        </LegalSection>

        <LegalSection heading="Disputes and cancellations">
          <p>
            If something goes wrong with a booking, raise a dispute using the in-app option on that
            booking. We may review the booking history and messages to help both sides reach a fair
            outcome, but we do not guarantee any particular result. Bookings may be cancelled in line
            with the status flow, and a disputed booking will not auto-release while the dispute is
            open.
          </p>
        </LegalSection>

        <LegalSection heading="Disclaimers and liability">
          <p>
            BrandJodo is provided on an “as is” and “as available” basis. We do not guarantee the
            quality, timing, legality, or outcome of any engagement between a client and a creator. To
            the extent permitted by law, BrandJodo is not liable for disputes between users or for
            indirect or consequential losses arising from your use of the service.
          </p>
        </LegalSection>

        <LegalSection heading="Suspension and changes">
          <p>
            We may suspend or remove accounts that break these terms or put other users at risk. We
            may also update these terms as the product evolves; continued use after an update means
            you accept the revised terms.
          </p>
        </LegalSection>

        <LegalSection heading="Governing law and contact">
          <p>
            These terms are governed by the laws of India. For questions about these terms, email{' '}
            <span className="font-medium text-gray-700">support@brandjodo.app</span>.
          </p>
        </LegalSection>
      </Card>
    </div>
  )
}
