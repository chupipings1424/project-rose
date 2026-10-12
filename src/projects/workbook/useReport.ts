import { useSearchParams } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync'
import { workbookApi } from './api/client'

/** Loads the report for the year in the URL (?year=2026), so a report link can be shared or bookmarked. */
export function useReport() {
  const [params, setParams] = useSearchParams()
  const yearParam = params.get('year')
  const report = useAsync(() => workbookApi.report(yearParam), [yearParam])
  return { report, setYear: (year: string) => setParams({ year }) }
}
