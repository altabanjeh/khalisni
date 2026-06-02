/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getDisplayError } from '../api/client'
import { api } from '../api/services'
import { useAuth } from './AuthContext'
import { matchHelpScreen } from '../help/screenRegistry'

const HelpGuideContext = createContext(null)

const defaultPageHelp = {
  workflowStatus: '',
  serviceId: '',
}

const defaultCurrentHelp = {
  screen_guides: [],
  actions: [],
  fields: [],
  service: null,
  workflows: [],
  results: [],
}

export function HelpGuideProvider({ children }) {
  const location = useLocation()
  const { user } = useAuth()
  const [pageHelp, setPageHelpState] = useState(defaultPageHelp)
  const [currentHelp, setCurrentHelp] = useState(defaultCurrentHelp)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const activeScreen = useMemo(() => matchHelpScreen(location.pathname), [location.pathname])

  const setPageHelp = useCallback((nextValue) => {
    setPageHelpState((current) => ({ ...current, ...nextValue }))
  }, [])

  const clearPageHelp = useCallback(() => {
    setPageHelpState(defaultPageHelp)
  }, [])

  const reloadCurrentHelp = useCallback(async () => {
    if (!user || !activeScreen?.screen_key) {
      setCurrentHelp(defaultCurrentHelp)
      return
    }

    setLoading(true)
    setError('')
    try {
      const payload = await api.getCurrentHelpGuides({
        screen_key: activeScreen.screen_key,
        workflow_status: pageHelp.workflowStatus || '',
        service_id: pageHelp.serviceId || '',
      })
      setCurrentHelp({
        ...defaultCurrentHelp,
        ...payload,
      })
    } catch (requestError) {
      setError(getDisplayError(requestError))
      setCurrentHelp(defaultCurrentHelp)
    } finally {
      setLoading(false)
    }
  }, [activeScreen?.screen_key, pageHelp.serviceId, pageHelp.workflowStatus, user])

  useEffect(() => {
    reloadCurrentHelp()
  }, [reloadCurrentHelp])

  const findFieldHelp = useCallback(
    (fieldKey) => (currentHelp.fields || []).find((item) => item.field_key === fieldKey) || null,
    [currentHelp.fields],
  )

  const findActionHelp = useCallback(
    (buttonKey) => (currentHelp.actions || []).find((item) => item.button_key === buttonKey) || null,
    [currentHelp.actions],
  )

  const value = useMemo(
    () => ({
      pageHelp,
      setPageHelp,
      clearPageHelp,
      currentHelp,
      currentHelpLoading: loading,
      currentHelpError: error,
      reloadCurrentHelp,
      findFieldHelp,
      findActionHelp,
    }),
    [clearPageHelp, currentHelp, error, findActionHelp, findFieldHelp, loading, pageHelp, reloadCurrentHelp, setPageHelp],
  )

  return <HelpGuideContext.Provider value={value}>{children}</HelpGuideContext.Provider>
}

export function useHelpGuideContext() {
  const context = useContext(HelpGuideContext)
  if (!context) throw new Error('useHelpGuideContext must be used within HelpGuideProvider')
  return context
}

export function useRegisterPageHelp({ workflowStatus = '', serviceId = '' } = {}) {
  const { clearPageHelp, setPageHelp } = useHelpGuideContext()

  useEffect(() => {
    setPageHelp({ workflowStatus: workflowStatus || '', serviceId: serviceId || '' })

    return () => {
      clearPageHelp()
    }
  }, [clearPageHelp, serviceId, setPageHelp, workflowStatus])
}
