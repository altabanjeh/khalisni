import { Clock3, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { hasPublishedContact, localizedContact, NO_CONTACT_TEXT, telHref, whatsappHref } from '../../utils/publicContact'

const DEFAULT_LINK =
  'kh-focusable inline-flex min-h-6 items-center gap-2 rounded-[var(--radius-sm)] py-0.5 hover:text-[var(--khalsni-public-primary)]'
const ICON = 'h-4 w-4 shrink-0 text-[var(--khalsni-public-primary)]'

// Renders only the contact details the CMS publishes (D05): phone (tel:),
// WhatsApp (wa.me, digits only), email (mailto:), address and office hours.
// With none published it says so.
function PublishedContactDetails({ content, isArabic, linkClassName = DEFAULT_LINK, className = 'grid gap-3' }) {
  const contact = localizedContact(content, isArabic)
  if (!hasPublishedContact(contact)) {
    return <p className="text-sm leading-7 text-[var(--khalsni-public-text-secondary)]">{isArabic ? NO_CONTACT_TEXT.ar : NO_CONTACT_TEXT.en}</p>
  }
  const whatsapp = whatsappHref(contact.whatsapp)
  return (
    <div className={className}>
      {contact.phone ? (
        <a className={linkClassName} href={`tel:${telHref(contact.phone)}`}>
          <Phone aria-hidden="true" className={ICON} />
          <span dir="ltr">{contact.phone}</span>
        </a>
      ) : null}
      {whatsapp ? (
        <a
          aria-label={`${isArabic ? 'واتساب' : 'WhatsApp'} ${contact.whatsapp}`}
          className={linkClassName}
          href={whatsapp}
          rel="noopener noreferrer"
          target="_blank"
        >
          <MessageCircle aria-hidden="true" className={ICON} />
          <span dir="ltr">{contact.whatsapp}</span>
        </a>
      ) : null}
      {contact.email ? (
        <a className={linkClassName} href={`mailto:${contact.email}`}>
          <Mail aria-hidden="true" className={ICON} />
          <span>{contact.email}</span>
        </a>
      ) : null}
      {contact.address ? (
        <p className="flex items-center gap-2">
          <MapPin aria-hidden="true" className={ICON} />
          <span>{contact.address}</span>
        </p>
      ) : null}
      {contact.hours ? (
        <p className="flex items-center gap-2">
          <Clock3 aria-hidden="true" className={ICON} />
          <span>
            <span className="sr-only">{isArabic ? 'ساعات العمل: ' : 'Office hours: '}</span>
            {contact.hours}
          </span>
        </p>
      ) : null}
    </div>
  )
}

export default PublishedContactDetails
