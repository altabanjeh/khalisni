import clsx from 'clsx'

/**
 * An order number such as KH-2026-000005 rendered as one left-to-right,
 * non-breaking token. Inside right-to-left text the bidi algorithm would
 * otherwise reorder its segments, and the hyphens would let it wrap as
 * "KH-" / "2026-000005".
 */
function OrderNumber({ value, hash = false, className }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <bdi className={clsx('whitespace-nowrap [unicode-bidi:isolate]', className)} dir="ltr">
      {hash ? '#' : ''}
      {value}
    </bdi>
  )
}

export default OrderNumber
