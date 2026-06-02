/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const HelpGuideContext = createContext(null)

const defaultPageHelp = {
  workflowStatus: '',
}

export function HelpGuideProvider({ children }) {
  const [pageHelp, setPageHelpState] = useState(defaultPageHelp)
  const setPageHelp = useCallback((nextValue) => {
    setPageHelpState((current) => ({ ...current, ...nextValue }))
  }, [])
  const clearPageHelp = useCallback(() => {
    setPageHelpState(defaultPageHelp)
  }, [])

  const value = useMemo(
    () => ({
      pageHelp,
      setPageHelp,
      clearPageHelp,
    }),
    [clearPageHelp, pageHelp, setPageHelp],
  )

  return <HelpGuideContext.Provider value={value}>{children}</HelpGuideContext.Provider>
}

export function useHelpGuideContext() {
  const context = useContext(HelpGuideContext)
  if (!context) throw new Error('useHelpGuideContext must be used within HelpGuideProvider')
  return context
}

export function useRegisterPageHelp({ workflowStatus = '' } = {}) {
  const { clearPageHelp, setPageHelp } = useHelpGuideContext()

  useEffect(() => {
    setPageHelp({ workflowStatus: workflowStatus || '' })

    return () => {
      clearPageHelp()
    }
  }, [clearPageHelp, setPageHelp, workflowStatus])
}
