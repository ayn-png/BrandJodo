import type { BookingStatus, Role } from '@/lib/types'

// Whose turn is it on a booking? Mirrors the booking state machine's RPC actions
// (respond_to_booking → REQUESTED, accept_counter → COUNTERED, pay_booking →
// ACCEPTED, deliver_booking → FUNDED, approve_booking → DELIVERED). Terminal
// states (COMPLETED / DECLINED / CANCELLED / DISPUTED) need no action. Keep this
// in sync with the booking-detail action buttons.
const ACTIONABLE: Partial<Record<BookingStatus, Role>> = {
  REQUESTED: 'INFLUENCER', // creator responds: accept / decline / counter
  COUNTERED: 'CLIENT', // client reviews the counter-offer
  ACCEPTED: 'CLIENT', // client funds (simulated escrow)
  FUNDED: 'INFLUENCER', // creator delivers
  DELIVERED: 'CLIENT', // client approves → releases payment
}

// True when `role` is the party who must act next on a booking in `status`.
export function isMyTurn(status: BookingStatus, role: Role): boolean {
  return ACTIONABLE[status] === role
}

// Short "what to do next" hint from the perspective of `role`.
export function nextStepHint(status: BookingStatus, role: Role): string {
  switch (status) {
    case 'REQUESTED':
      return role === 'INFLUENCER'
        ? 'New request — accept, decline, or counter.'
        : 'Waiting for the creator to respond.'
    case 'COUNTERED':
      return role === 'CLIENT'
        ? 'Counter-offer received — accept or renegotiate.'
        : 'Waiting for the client to review your counter-offer.'
    case 'ACCEPTED':
      return role === 'CLIENT'
        ? 'Accepted — fund the booking to get started.'
        : 'Accepted — waiting for the client to fund.'
    case 'FUNDED':
      return role === 'INFLUENCER'
        ? 'Funded — deliver the work (funds held in escrow).'
        : 'Funded — waiting for the creator to deliver.'
    case 'DELIVERED':
      return role === 'CLIENT'
        ? 'Delivered — review and approve to release payment.'
        : 'Delivered — waiting for the client to approve.'
    case 'COMPLETED':
      return 'Completed.'
    case 'DECLINED':
      return 'Declined.'
    case 'CANCELLED':
      return 'Cancelled.'
    case 'DISPUTED':
      return 'Under dispute — awaiting resolution.'
    case 'REFUND_OWED':
      return 'Resolved — refund owed to the client.'
    default:
      return ''
  }
}
