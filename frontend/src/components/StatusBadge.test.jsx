import { render, screen } from '@testing-library/react'
import StatusBadge from './StatusBadge'

test('status badge displays correctly', () => {
  render(<StatusBadge status="COMPLETED" />)
  expect(screen.getByText('مكتمل')).toBeInTheDocument()
})
