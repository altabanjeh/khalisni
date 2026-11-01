import { Link } from 'react-router-dom'
import { consentSegments, ORDER_CONSENT_VERSION } from '../utils/orderConsent'

// The exact consent statement the server records (ORDER_CONSENT_VERSION), with
// its "Terms of Use" and "Privacy Policy" phrases linking to the legal pages.
// The links open in a new tab so the request form keeps what was entered.
function OrderConsentStatement({ language = 'ar' }) {
  return (
    <span data-consent-version={ORDER_CONSENT_VERSION}>
      {consentSegments(language).map((segment, index) =>
        segment.to ? (
          <Link className="font-extrabold text-brand-700 underline" key={`${segment.to}-${index}`} rel="noopener noreferrer" target="_blank" to={segment.to}>
            {segment.text}
          </Link>
        ) : (
          <span key={`text-${index}`}>{segment.text}</span>
        ),
      )}
    </span>
  )
}

export default OrderConsentStatement
