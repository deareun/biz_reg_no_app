'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import {
  Download,
  AlertCircle,
  Loader2,
  Search,
  Edit2,
  ArrowUp,
  HelpCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { InquiryResult, Categories } from '@/lib/types'

interface SortConfig {
  column: string | null
  ascending: boolean
}

interface MappingModalState {
  isOpen: boolean
  resultIndex: number | null
  mappingType: 'mct_ry_cd' | 'hpsn_mct_zcd' | null
}

const IQ_BIZNO_FIELDS = [
  { value: '상호명', label: '상호명' }, { value: '사업자등록번호', label: '사업자등록번호' },
  { value: '사업자상태', label: '사업자상태' }, { value: '사업장명', label: '사업장명' },
  { value: '대표자명', label: '대표자명' }, { value: '사업장주소', label: '사업장주소' },
]
const IQ_CRAWL_FIELDS = [
  { value: '상호명', label: '상호명' }, { value: '주소', label: '주소' },
  { value: '사업자상태', label: '사업자상태' }, { value: '업태', label: '업태' },
  { value: '종목', label: '종목' }, { value: '국세청산업분류_대분류', label: '산업분류(대)' },
  { value: '국세청산업분류_중분류', label: '산업분류(중)' }, { value: '국세청산업분류_소분류', label: '산업분류(소)' },
  { value: '국세청산업분류_세분류', label: '산업분류(세)' }, { value: '국세청산업분류_세세분류', label: '산업분류(세세)' },
]
const IQ_TELE_FIELDS = [
  { value: 'bzmnNm', label: '사업자명' }, { value: 'bzmnRgsSttusSeNm', label: '등록상태' },
  { value: 'lctnAddr', label: '지번주소' }, { value: 'lctnRnAddr', label: '도로명주소' },
  { value: 'dclrDate', label: '신고일자' }, { value: 'telno', label: '전화번호' },
  { value: 'domncn', label: '도메인' }, { value: 'ntslMthdCn', label: '판매방식' },
  { value: 'ntslPrdlstCn', label: '판매물품' }, { value: 'operSttusCdNm', label: '운영상태' },
  { value: 'corpYnNm', label: '법인여부' }, { value: 'crno', label: '법인등록번호' },
  { value: 'ctpvNm', label: '시도명' }, { value: 'rprsvEmladr', label: '대표이메일' },
  { value: 'prcsDeptNm', label: '처리부서명' }, { value: 'prmmiYr', label: '허가개시년도' },
  { value: 'lctnRnOzip', label: '우편번호' },
]
const IQ_MAPPING_FIELDS = [
  { value: 'mct_ry_cd', label: '가맹점업종코드' }, { value: 'mct_ry_nm', label: '가맹점업종명' },
  { value: 'hpsn_mct_zcd', label: '초개인화업종코드' }, { value: 'hpsn_mct_nm', label: '초개인화업종명' },
]

export default function HomePage() {
  // 입력 상태
  const [bizNumbersInput, setBizNumbersInput] = useState('')
  const [performCategoryMapping, setPerformCategoryMapping] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [streamProgress, setStreamProgress] = useState<{
    total: number; completed: number; current: string
  } | null>(null)

  // 결과 상태
  const [allResults, setAllResults] = useState<InquiryResult[]>([])
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set())
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: null,
    ascending: true,
  })

  const [emailAddress, setEmailAddress] = useState('')

  // 모달 상태
  const [isDataModalOpen, setIsDataModalOpen] = useState(false)
  const [mappingModalState, setMappingModalState] = useState<MappingModalState>({
    isOpen: false,
    resultIndex: null,
    mappingType: null,
  })
  const [categories, setCategories] = useState<Categories | null>(null)
  const [mappingSearchInput, setMappingSearchInput] = useState('')

  // 자료받기 모달 상태
  const [selectedBiznoFields, setSelectedBiznoFields] = useState<string[]>(IQ_BIZNO_FIELDS.map(f => f.value))
  const [selectedCrawlFields, setSelectedCrawlFields] = useState<string[]>(IQ_CRAWL_FIELDS.map(f => f.value))
  const [selectedTeleFields, setSelectedTeleFields] = useState<string[]>(IQ_TELE_FIELDS.map(f => f.value))
  const [selectedMappingFields, setSelectedMappingFields] = useState<string[]>(IQ_MAPPING_FIELDS.map(f => f.value))
  const [excludeErrors, setExcludeErrors] = useState(false)
  const [isModalLoading, setIsModalLoading] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    if (!isLoading) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isLoading])

  /**
   * 사업자번호 파싱: 쉼표/엔터/공백으로 구분
   */
  const parseBusinessNumbers = (input: string): string[] => {
    return input
      .split(/[\n,;]+/)
      .map((num) => num.replace(/[^\d-]/g, '').trim())
      .filter((num) => {
        const digits = num.replace(/\D/g, '')
        return digits.length === 10
      })
      .map((num) => num.replace(/\D/g, ''))
  }

  /**
   * 사업자번호 입력 유효성 검사
   */
  const validateInput = (): boolean => {
    if (!bizNumbersInput.trim()) {
      setError('사업자번호를 입력해주세요.')
      return false
    }

    const numbers = parseBusinessNumbers(bizNumbersInput)
    if (numbers.length === 0) {
      setError('유효한 사업자번호가 없습니다.')
      return false
    }

    if (numbers.length > 100) {
      setError('최대 100개까지 조회할 수 있습니다.')
      return false
    }

    setError(null)
    return true
  }

  /**
   * 조회 요청 처리 — /api/lookup 순차 호출
   */
  const handleLookup = async () => {
    if (!validateInput()) return

    setIsLoading(true)
    setStatusMessage(null)
    setError(null)
    setAllResults([])
    setExpandedResults(new Set())
    setSortConfig({ column: null, ascending: true })

    const numbers = parseBusinessNumbers(bizNumbersInput)
    setStreamProgress({ total: numbers.length, completed: 0, current: '' })

    const collected: InquiryResult[] = []

    for (const brno of numbers) {
      setStreamProgress(prev => prev ? { ...prev, current: brno } : null)
      try {
        const res = await fetch('/api/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brno, perform_category_mapping: performCategoryMapping }),
        })
        if (res.ok) {
          const result = await res.json()
          collected.push(result)
          setAllResults([...collected])
        }
      } catch {
        /* skip individual failures */
      }
      setStreamProgress(prev => prev ? { ...prev, completed: prev.completed + 1 } : null)
    }

    setStreamProgress(null)
    setIsLoading(false)
    setStatusMessage(`${collected.length}건 조회 완료`)
    toast({
      title: '조회 완료',
      description: `${collected.length}개 사업자 정보를 조회했습니다.`,
    })
  }

  /**
   * 행 전개/축소 토글
   */
  const toggleExpand = (brno: string) => {
    const newExpanded = new Set(expandedResults)
    if (newExpanded.has(brno)) {
      newExpanded.delete(brno)
    } else {
      newExpanded.add(brno)
    }
    setExpandedResults(newExpanded)
  }

  /**
   * 정렬 처리
   */
  const handleSort = (column: string) => {
    setSortConfig((prev) => ({
      column,
      ascending: prev.column === column ? !prev.ascending : true,
    }))
  }

  /**
   * 정렬된 결과 계산
   */
  const sortedResults = useMemo(() => {
    if (!sortConfig.column) return allResults

    const sorted = [...allResults].sort((a, b) => {
      let aVal: any
      let bVal: any

      switch (sortConfig.column) {
        case 'brno':
          aVal = a.brno_formatted
          bVal = b.brno_formatted
          break
        case 'company_name':
          aVal = a.company_name || ''
          bVal = b.company_name || ''
          break
        case 'query_date':
          aVal = new Date(a.query_date || 0).getTime()
          bVal = new Date(b.query_date || 0).getTime()
          break
        case 'bizno_status':
          aVal = getStatusValue(a.api?.bizno?.success, a.api?.bizno?.found)
          bVal = getStatusValue(b.api?.bizno?.success, b.api?.bizno?.found)
          break
        case 'crawl_status':
          aVal = getStatusValue(a.crawl?.success, a.crawl?.found)
          bVal = getStatusValue(b.crawl?.success, b.crawl?.found)
          break
        case 'gov_status':
          aVal = getStatusValue(a.api?.gov?.success, a.api?.gov?.found)
          bVal = getStatusValue(b.api?.gov?.success, b.api?.gov?.found)
          break
        default:
          return 0
      }

      if (typeof aVal === 'string') {
        return sortConfig.ascending
          ? aVal.localeCompare(bVal, 'ko')
          : bVal.localeCompare(aVal, 'ko')
      }

      return sortConfig.ascending ? aVal - bVal : bVal - aVal
    })

    return sorted
  }, [allResults, sortConfig])

  const getStatusValue = (success?: boolean, found?: boolean): number => {
    if (success === false) return 0
    if (success && found) return 2
    if (success && !found) return 1
    return -1
  }

  const sortIcon = (col: string) =>
    sortConfig.column !== col
      ? <span style={{ opacity: 0.4, fontSize: '0.7rem' }}>↕</span>
      : <span style={{ color: 'oklch(0.457 0.24 277.023)', fontSize: '0.7rem' }}>{sortConfig.ascending ? '▲' : '▼'}</span>

  const statusDot = (success?: boolean, found?: boolean) => {
    if (success === false) return <span style={{ color: '#dc2626', fontSize: '0.8125rem' }}>● 오류</span>
    if (success && found) return <span style={{ color: '#10b981', fontSize: '0.8125rem' }}>● 조회됨</span>
    if (success && !found) return <span style={{ color: '#999', fontSize: '0.8125rem' }}>○ 없음</span>
    return <span style={{ color: '#ccc', fontSize: '0.8125rem' }}>-</span>
  }

  const iqThStyle: React.CSSProperties = { padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#8b8b94', fontSize: '0.8125rem', whiteSpace: 'nowrap' }
  const iqTdStyle: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid #ebe9f1', fontSize: '0.8125rem', height: 38 }

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    } catch {
      return dateString || '-'
    }
  }

  /**
   * 업종매핑 모달 열기
   */
  const openMappingModal = async (resultIndex: number, type: 'mct_ry_cd' | 'hpsn_mct_zcd') => {
    if (!categories) {
      try {
        const res = await fetch('/api/categories')
        if (res.ok) {
          const data = await res.json()
          // Build flat code->name maps from raw JSON data
          const mctFlat: Record<string, string> = {}
          const hpsnFlat: Record<string, string> = {}
          for (const [code, info] of Object.entries(data.mct_ry_cd || {})) {
            const name = (info as any)?.mct_ry_nm || ''
            if (name && !name.startsWith('기타')) mctFlat[code] = name
          }
          for (const [code, info] of Object.entries(data.hpsn_mct_zcd || {})) {
            const name = (info as any)?.hpsn_mct_zcd_nm || ''
            if (name && !name.startsWith('기타')) hpsnFlat[code] = name
          }
          setCategories({ mct_ry_cd: mctFlat, hpsn_mct_zcd: hpsnFlat })
        }
      } catch (err) {
        setError('카테고리 로딩 실패')
        return
      }
    }

    setMappingModalState({ isOpen: true, resultIndex, mappingType: type })
    setMappingSearchInput('')
  }

  /**
   * 매핑 결과 저장 (로컬 상태만 업데이트)
   */
  const saveMappingSelection = (code: string, name: string) => {
    const { resultIndex, mappingType } = mappingModalState
    if (resultIndex === null || !mappingType) return

    const newResults = [...allResults]
    const result = newResults[resultIndex]

    if (!result.mapping) {
      result.mapping = {}
    }
    result.mapping[mappingType] = { code, name }
    setAllResults(newResults)

    setMappingModalState({ isOpen: false, resultIndex: null, mappingType: null })
    setMappingSearchInput('')

    toast({ title: '저장 완료', description: '업종매핑이 수정되었습니다.' })
  }

  const saveDataPrefs = () => {
    try {
      localStorage.setItem('dataPreferences', JSON.stringify({
        bizno_fields: selectedBiznoFields,
        crawl_fields: selectedCrawlFields,
        tele_fields: selectedTeleFields,
        mapping_fields: selectedMappingFields,
        exclude_errors: excludeErrors,
      }))
    } catch { /* ignore */ }
  }

  const openDataModal = () => {
    if (allResults.length === 0) {
      setError('조회 결과가 없습니다.')
      return
    }
    try {
      const prefs = JSON.parse(localStorage.getItem('dataPreferences') || 'null')
      if (prefs) {
        if (prefs.bizno_fields) setSelectedBiznoFields(prefs.bizno_fields)
        if (prefs.crawl_fields) setSelectedCrawlFields(prefs.crawl_fields)
        if (prefs.tele_fields) setSelectedTeleFields(prefs.tele_fields)
        if (prefs.mapping_fields) setSelectedMappingFields(prefs.mapping_fields)
        if (prefs.exclude_errors !== undefined) setExcludeErrors(prefs.exclude_errors)
      }
    } catch { /* ignore */ }
    setIsDataModalOpen(true)
  }

  /**
   * 클라이언트 사이드 CSV 다운로드
   */
  const handleDownloadCSV = () => {
    if (
      selectedBiznoFields.length === 0 &&
      selectedTeleFields.length === 0 &&
      selectedCrawlFields.length === 0 &&
      selectedMappingFields.length === 0
    ) {
      setError('선택된 필드가 없습니다.')
      return
    }

    setIsModalLoading(true)
    try {
      const dataToDownload = excludeErrors
        ? allResults.filter(
          (r) =>
            r.api?.bizno?.success !== false ||
            r.api?.gov?.success !== false ||
            r.crawl?.success !== false
        )
        : allResults

      if (dataToDownload.length === 0) {
        alert('다운로드할 데이터가 없습니다.')
        return
      }

      // Build header row
      const columns: string[] = ['사업자번호']
      if (selectedBiznoFields.length > 0) {
        columns.push(...selectedBiznoFields.map(f => `bizno_${f}`))
      }
      if (selectedCrawlFields.length > 0) {
        columns.push(...selectedCrawlFields.map(f => `crawl_${f}`))
      }
      if (selectedTeleFields.length > 0) {
        columns.push(...selectedTeleFields.map(f => `tele_${f}`))
      }
      if (selectedMappingFields.length > 0) {
        columns.push(...selectedMappingFields.map(f => `mapping_${f}`))
      }

      const rows: string[][] = [columns]

      for (const item of dataToDownload) {
        const row: string[] = [item.brno_formatted || item.brno || '']

        // Bizno API fields
        for (const field of selectedBiznoFields) {
          const biznoItems = item.api?.bizno?.items
          const val = (biznoItems?.[0] as unknown as Record<string, unknown>)?.[field] ?? ''
          row.push(String(val))
        }

        // Crawl fields
        for (const field of selectedCrawlFields) {
          const searchData = item.crawl?.search || {}
          const detailData = item.crawl?.detail || {}
          let val = ''
          if (field in searchData) {
            val = String(searchData[field] ?? '')
          } else if (field.startsWith('국세청산업분류_') && detailData['국세청산업분류']) {
            const industryDict = detailData['국세청산업분류'] as Record<string, string>
            const key = field.replace('국세청산업분류_', '')
            val = String(industryDict[key] ?? '')
          } else {
            val = String((detailData as Record<string, unknown>)[field] ?? '')
          }
          row.push(val)
        }

        // Tele/gov fields
        for (const field of selectedTeleFields) {
          const govItems = item.api?.gov?.items
          const val = govItems?.[0]?.[field] ?? ''
          row.push(String(val))
        }

        // Mapping fields
        for (const field of selectedMappingFields) {
          const mapping = item.mapping
          let val = ''
          if (field === 'mct_ry_cd') val = mapping?.mct_ry_cd?.code ?? ''
          else if (field === 'mct_ry_nm') val = mapping?.mct_ry_cd?.name ?? ''
          else if (field === 'hpsn_mct_zcd') val = mapping?.hpsn_mct_zcd?.code ?? ''
          else if (field === 'hpsn_mct_nm') val = mapping?.hpsn_mct_zcd?.name ?? ''
          row.push(val)
        }

        rows.push(row)
      }

      // Serialize to CSV
      const csvContent = rows
        .map(row =>
          row.map(cell => {
            const s = String(cell ?? '').replace(/"/g, '""')
            return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s
          }).join(',')
        )
        .join('\n')

      // BOM for Excel Korean support
      const bom = '﻿'
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)
      link.href = url
      link.download = `business_lookup_${dataToDownload.length}_${timestamp}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      saveDataPrefs()
      alert('CSV 다운로드 완료')
      setIsDataModalOpen(false)
    } catch (err) {
      alert('CSV 생성 오류: ' + String(err))
    } finally {
      setIsModalLoading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!emailAddress.trim()) { alert('메일 주소를 입력해주세요.'); return }
    const emails = emailAddress.split(';').map(e => e.trim()).filter(e => e.includes('@'))
    if (!emails.length) { alert('유효한 메일 주소가 없습니다.'); return }
    if (!selectedBiznoFields.length && !selectedCrawlFields.length && !selectedTeleFields.length && !selectedMappingFields.length) {
      alert('선택된 필드가 없습니다.'); return
    }
    setIsModalLoading(true)
    let successCount = 0, failCount = 0
    const dataToSend = excludeErrors
      ? allResults.filter(r => r.api?.bizno?.success !== false || r.api?.gov?.success !== false || r.crawl?.success !== false)
      : allResults
    for (const email of emails) {
      try {
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email, data: dataToSend,
            bizno_fields: selectedBiznoFields, tele_fields: selectedTeleFields,
            crawl_fields: selectedCrawlFields, mapping_fields: selectedMappingFields,
          }),
        })
        const json = await res.json()
        json.success ? successCount++ : failCount++
      } catch { failCount++ }
    }
    setIsModalLoading(false)
    saveDataPrefs()
    alert(failCount === 0
      ? `메일 발송 완료 (${successCount}명, ${dataToSend.length}건)`
      : `발송 결과: 성공 ${successCount}명, 실패 ${failCount}명`)
    if (!failCount) { setIsDataModalOpen(false); setEmailAddress('') }
  }

  const iqToggle = (val: string, arr: string[], set: (a: string[]) => void) =>
    set(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])

  const IqFieldGroup = ({ title, fields, sel, setSel }: {
    title: string
    fields: { value: string; label: string }[]
    sel: string[]
    setSel: (a: string[]) => void
  }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 500, fontSize: '0.8rem' }}>{title}</span>
        <label style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={sel.length === fields.length}
            onChange={e => setSel(e.target.checked ? fields.map(f => f.value) : [])}
            style={{ marginRight: 4 }}
          />
          전체 선택
        </label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {fields.map(f => (
          <label key={f.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8rem' }}>
            <input type="checkbox" checked={sel.includes(f.value)} onChange={() => iqToggle(f.value, sel, setSel)} />
            {f.label}
          </label>
        ))}
      </div>
    </div>
  )

  const iqBtnStyle = (disabled: boolean): React.CSSProperties => ({
    background: 'oklch(0.457 0.24 277.023)', color: '#f5f3ff', border: 'none',
    borderRadius: 6, padding: '8px 16px', fontSize: '0.875rem',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
  })

  // 매핑 모달의 필터된 카테고리 목록
  const filteredCategories = useMemo(() => {
    if (!categories || !mappingModalState.mappingType || !mappingSearchInput) {
      return null
    }

    const categoryMap = categories[mappingModalState.mappingType] || {}
    const searchLower = mappingSearchInput.toLowerCase()

    return Object.entries(categoryMap)
      .filter(
        ([code, name]) =>
          code.toLowerCase().includes(searchLower) ||
          (name && name.toLowerCase().includes(searchLower))
      )
      .slice(0, 50)
  }, [categories, mappingModalState.mappingType, mappingSearchInput])

  const parsedCount = parseBusinessNumbers(bizNumbersInput).length

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>조회하기</h1>
          <p style={{ fontSize: '0.875rem', color: '#8b8b94', marginTop: '4px' }}>
            Biz No · 통신판매사업자 · 가맹사업자 조회 결과를 제공합니다.
          </p>
        </div>
        {allResults.length > 0 && (
          <Button onClick={openDataModal} className="gap-2" size="lg">
            <Download className="h-4 w-4" />
            자료받기
          </Button>
        )}
      </div>

      {/* 조회 폼 패널 */}
      <Card>
        <CardContent className="pt-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                사업자등록번호
                <span className="text-xs text-muted-foreground ml-2">
                  (최대 100개) · 줄바꿈 / 쉼표 / 공백으로 구분
                </span>
              </Label>
              <div className="flex gap-3 items-stretch">
                <Textarea
                  placeholder={`3988701116\n1448118454\n1111111111, 2222222222`}
                  value={bizNumbersInput}
                  onChange={(e) => setBizNumbersInput(e.target.value)}
                  rows={6}
                  disabled={isLoading}
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  onClick={handleLookup}
                  disabled={isLoading || !bizNumbersInput.trim()}
                  className="flex-col gap-1 px-6 h-auto"
                  size="lg"
                  style={{ minHeight: 'unset', minWidth: 76, alignSelf: 'stretch' }}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                  <span>조회</span>
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  입력된 사업자번호: {parsedCount}개
                </p>
                {statusMessage && (
                  <p className="text-xs text-green-600 font-medium">{statusMessage}</p>
                )}
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  id="performCategoryMapping"
                  checked={performCategoryMapping}
                  onCheckedChange={(checked) => setPerformCategoryMapping(checked)}
                  disabled={isLoading}
                />
                <Label htmlFor="performCategoryMapping" className="cursor-pointer font-semibold">
                  업종매핑 동시 진행
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-14">
                AI를 활용하여 사업명으로부터 가맹점업종을 자동 분류합니다.
                LLM 토큰이 차감되어 비용이 발생하며, 작업 수행 시간이 소요됩니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 진행 상황 */}
      {streamProgress && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-semibold">
                  조회 진행 중 ({streamProgress.completed}/{streamProgress.total}건)
                </span>
              </div>
              {streamProgress.current && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-muted-foreground">처리중:</span>
                  <Badge
                    variant="outline"
                    className="text-xs font-mono animate-pulse bg-blue-50 border-blue-200 text-blue-700"
                  >
                    {streamProgress.current.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3')}
                  </Badge>
                </div>
              )}
              {/* 진행 바 */}
              <div className="w-full mt-1">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${streamProgress.total > 0 ? (streamProgress.completed / streamProgress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 결과 테이블 */}
      {allResults.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #ebe9f1', borderRadius: 10, padding: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#8b8b94' }}>
              조회 결과 ({allResults.length}건)
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', background: '#fff', border: '1px solid #ebe9f1', borderRadius: 10, overflow: 'hidden' }}>
              <thead style={{ background: '#f5f5f4', borderBottom: '1px solid #ebe9f1' }}>
                <tr>
                  <th style={{ ...iqThStyle, width: 40, textAlign: 'center' }}>No</th>
                  <th style={{ ...iqThStyle, cursor: 'pointer' }} onClick={() => handleSort('brno')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>사업자번호 {sortIcon('brno')}</span>
                  </th>
                  <th style={{ ...iqThStyle, cursor: 'pointer' }} onClick={() => handleSort('company_name')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>상호명 {sortIcon('company_name')}</span>
                  </th>
                  <th style={{ ...iqThStyle, cursor: 'pointer' }} onClick={() => handleSort('query_date')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>조회일자 {sortIcon('query_date')}</span>
                  </th>
                  <th style={iqThStyle}>Bizno API</th>
                  <th style={iqThStyle}>Bizno 크롤링</th>
                  <th style={iqThStyle}>통신판매업</th>
                  <th style={iqThStyle}>가맹사업</th>
                  {performCategoryMapping && (
                    <>
                      <th style={iqThStyle}>가맹점업종</th>
                      <th style={iqThStyle}>초개인화업종</th>
                    </>
                  )}
                  <th style={{ ...iqThStyle, width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((result, idx) => {
                  const isExp = expandedResults.has(result.brno)
                  const mctMapping = result.mapping?.mct_ry_cd
                  const hpsnMapping = result.mapping?.hpsn_mct_zcd
                  return (
                    <React.Fragment key={result.brno}>
                      <tr>
                        <td style={{ ...iqTdStyle, textAlign: 'center', color: '#8b8b94' }}>{idx + 1}</td>
                        <td style={{ ...iqTdStyle, fontWeight: 500 }}>{result.brno_formatted}</td>
                        <td style={iqTdStyle}>{result.company_name || '-'}</td>
                        <td style={{ ...iqTdStyle, whiteSpace: 'nowrap', color: '#8b8b94' }}>
                          {formatDate(result.query_date)}
                        </td>
                        <td style={iqTdStyle}>{statusDot(result.api?.bizno?.success, result.api?.bizno?.found)}</td>
                        <td style={iqTdStyle}>{statusDot(result.crawl?.success, result.crawl?.found)}</td>
                        <td style={iqTdStyle}>{statusDot(result.api?.gov?.success, result.api?.gov?.found)}</td>
                        <td style={iqTdStyle}>{statusDot(result.ftc?.success, result.ftc?.found)}</td>
                        {performCategoryMapping && (
                          <>
                            <td
                              style={{ ...iqTdStyle, cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => openMappingModal(allResults.indexOf(result), 'mct_ry_cd')}
                              title="클릭하여 편집"
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                                <Edit2 style={{ width: 10, height: 10, color: '#8b8b94', flexShrink: 0, marginTop: 3 }} />
                                {mctMapping?.code
                                  ? <div>{mctMapping.code}<br /><span style={{ color: '#8b8b94' }}>{mctMapping.name}</span></div>
                                  : <span style={{ color: '#8b8b94' }}>없음</span>
                                }
                              </div>
                            </td>
                            <td
                              style={{ ...iqTdStyle, cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => openMappingModal(allResults.indexOf(result), 'hpsn_mct_zcd')}
                              title="클릭하여 편집"
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                                <Edit2 style={{ width: 10, height: 10, color: '#8b8b94', flexShrink: 0, marginTop: 3 }} />
                                {hpsnMapping?.code
                                  ? <div style={{ fontSize: '0.8rem' }}>{hpsnMapping.code}<br /><span style={{ color: '#8b8b94' }}>{hpsnMapping.name}</span></div>
                                  : <span style={{ color: '#8b8b94', fontSize: '0.8rem' }}>없음</span>
                                }
                              </div>
                            </td>
                          </>
                        )}
                        <td style={{ ...iqTdStyle, textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            {(mctMapping?.code || hpsnMapping?.code) && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    onClick={e => e.stopPropagation()}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                    title="매핑사유"
                                  >
                                    <HelpCircle style={{ width: 16, height: 16, color: '#c4c4c4' }} />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 text-sm whitespace-pre-wrap" side="top">
                                  <p style={{ fontWeight: 600, fontSize: '0.75rem', color: '#8b8b94', marginBottom: 4 }}>매핑사유</p>
                                  <p>{result.mapping?.reasoning || '사유 없음'}</p>
                                </PopoverContent>
                              </Popover>
                            )}
                            <button
                              onClick={() => toggleExpand(result.brno)}
                              style={{ background: 'transparent', color: '#8b8b94', border: '1px solid #ebe9f1', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              {isExp ? '▲' : '▼'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExp && (
                        <tr key={`detail-${result.brno}`} style={{ background: '#f9f9f9' }}>
                          <td colSpan={performCategoryMapping ? 11 : 9} style={{ padding: 12, borderBottom: '1px solid #ebe9f1' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                              {result.api?.bizno?.found && result.api.bizno.items?.[0] && (
                                <div style={{ background: '#fff', border: '1px solid #ebe9f1', borderRadius: 8, padding: 10 }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 6, color: 'oklch(0.457 0.24 277.023)' }}>Bizno API</div>
                                  {Object.entries(result.api.bizno.items[0]).map(([k, v]) => (
                                    <div key={k} style={{ fontSize: '0.8rem', display: 'flex', gap: 4, borderBottom: '1px solid #f0f0f0', padding: '2px 0' }}>
                                      <span style={{ color: '#8b8b94', minWidth: 80 }}>{k}</span>
                                      <span>{String(v ?? '')}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {result.crawl?.found && result.crawl.search && (
                                <div style={{ background: '#fff', border: '1px solid #ebe9f1', borderRadius: 8, padding: 10 }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 6, color: 'oklch(0.457 0.24 277.023)' }}>Bizno 크롤링</div>
                                  {Object.entries(result.crawl.search).map(([k, v]) => (
                                    <div key={k} style={{ fontSize: '0.8rem', display: 'flex', gap: 4, borderBottom: '1px solid #f0f0f0', padding: '2px 0' }}>
                                      <span style={{ color: '#8b8b94', minWidth: 80 }}>{k}</span>
                                      <span>{String(v ?? '')}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {result.api?.gov?.found && result.api.gov.items?.[0] && (
                                <div style={{ background: '#fff', border: '1px solid #ebe9f1', borderRadius: 8, padding: 10 }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 6, color: 'oklch(0.457 0.24 277.023)' }}>통신판매업</div>
                                  {Object.entries(result.api.gov.items[0]).slice(0, 8).map(([k, v]) => (
                                    <div key={k} style={{ fontSize: '0.8rem', display: 'flex', gap: 4, borderBottom: '1px solid #f0f0f0', padding: '2px 0' }}>
                                      <span style={{ color: '#8b8b94', minWidth: 80 }}>{k}</span>
                                      <span>{String(v ?? '')}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {result.mapping && (
                                <div style={{ background: '#f0f0ff', border: '1px solid #c7d2fe', borderRadius: 8, padding: 10 }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 6, color: '#4338ca' }}>업종매핑</div>
                                  {result.mapping.mct_ry_cd && (
                                    <div style={{ fontSize: '0.8rem', marginBottom: 4 }}>
                                      <span style={{ color: '#8b8b94' }}>가맹점원장: </span>
                                      <span style={{ fontWeight: 500 }}>{result.mapping.mct_ry_cd.code} - {result.mapping.mct_ry_cd.name}</span>
                                    </div>
                                  )}
                                  {result.mapping.hpsn_mct_zcd && (
                                    <div style={{ fontSize: '0.8rem' }}>
                                      <span style={{ color: '#8b8b94' }}>초개인화: </span>
                                      <span style={{ fontWeight: 500 }}>{result.mapping.hpsn_mct_zcd.code} - {result.mapping.hpsn_mct_zcd.name}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 자료받기 모달 */}
      {isDataModalOpen && (
        <div
          onClick={() => setIsDataModalOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 10, padding: 24, maxWidth: 620, width: '90%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 25px rgba(0,0,0,0.15)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>조회 결과 받기</span>
              <button
                onClick={() => setIsDataModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#8b8b94' }}
              >
                ✕
              </button>
            </div>
            <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #ebe9f1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                <input type="checkbox" checked={excludeErrors} onChange={e => setExcludeErrors(e.target.checked)} />
                오류건 제외
              </label>
            </div>
            <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #ebe9f1' }}>
              <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: 12 }}>조회 데이터 선택</label>
              <IqFieldGroup title="Bizno API" fields={IQ_BIZNO_FIELDS} sel={selectedBiznoFields} setSel={setSelectedBiznoFields} />
              <IqFieldGroup title="Bizno 크롤링" fields={IQ_CRAWL_FIELDS} sel={selectedCrawlFields} setSel={setSelectedCrawlFields} />
              <IqFieldGroup title="통신판매업 API" fields={IQ_TELE_FIELDS} sel={selectedTeleFields} setSel={setSelectedTeleFields} />
            </div>
            {performCategoryMapping && (
              <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #ebe9f1' }}>
                <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: 12 }}>업종매핑 결과</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {IQ_MAPPING_FIELDS.map(f => (
                    <label key={f.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedMappingFields.includes(f.value)}
                        onChange={() => iqToggle(f.value, selectedMappingFields, setSelectedMappingFields)}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: 8 }}>메일로 받기</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={emailAddress}
                  onChange={e => setEmailAddress(e.target.value)}
                  placeholder="email@example.com; email2@example.com (세미콜론으로 구분)"
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #ebe9f1', borderRadius: 6, fontSize: '0.875rem', outline: 'none' }}
                />
                <button onClick={handleSendEmail} disabled={isModalLoading} style={iqBtnStyle(isModalLoading)}>
                  📧 메일 발송
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={handleDownloadCSV} disabled={isModalLoading} style={iqBtnStyle(isModalLoading)}>
                CSV 다운로드
              </button>
              <button
                onClick={() => setIsDataModalOpen(false)}
                style={{ background: '#f5f5f4', color: '#1a1a24', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: '0.875rem', cursor: 'pointer' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 업종매핑 모달 */}
      <Dialog open={mappingModalState.isOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>업종 선택</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="검색..."
              value={mappingSearchInput}
              onChange={(e) => setMappingSearchInput(e.target.value)}
              autoFocus
            />

            <div className="border rounded-lg overflow-y-auto max-h-64">
              {!categories || !mappingModalState.mappingType ? (
                <div className="p-4 text-center text-muted-foreground">로딩 중...</div>
              ) : mappingSearchInput && filteredCategories?.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">검색 결과가 없습니다.</div>
              ) : (
                Object.entries(categories[mappingModalState.mappingType] || {})
                  .filter(
                    ([code, name]) =>
                      !mappingSearchInput ||
                      code.toLowerCase().includes(mappingSearchInput.toLowerCase()) ||
                      (name && name.toLowerCase().includes(mappingSearchInput.toLowerCase()))
                  )
                  .slice(0, 100)
                  .map(([code, name]) => (
                    <Button
                      key={code}
                      variant="ghost"
                      className="w-full justify-start rounded-none border-b h-auto py-3 hover:bg-muted"
                      onClick={() => saveMappingSelection(code, name)}
                    >
                      <div className="text-left">
                        <div className="font-mono text-sm font-medium">{code}</div>
                        <div className="text-xs text-muted-foreground">{name}</div>
                      </div>
                    </Button>
                  ))
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={() =>
                setMappingModalState({ isOpen: false, resultIndex: null, mappingType: null })
              }
            >
              취소
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 맨 위로 버튼 */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        title="맨 위로"
        style={{ position: 'fixed', bottom: 28, right: 28, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', zIndex: 100 }}
      >
        <ArrowUp style={{ width: 18, height: 18, color: '#6b7280' }} />
      </button>
    </div>
  )
}
