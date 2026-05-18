import '@testing-library/jest-dom'
import { createElement } from 'react'
import { vi } from 'vitest'
import { ToastProvider } from '../context/ToastContext'

vi.mock('@testing-library/react', async () => {
  const actual = await vi.importActual('@testing-library/react')

  return {
    ...actual,
    render: (ui, options) => actual.render(createElement(ToastProvider, null, ui), options),
  }
})
