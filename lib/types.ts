/**
 * 애플리케이션 전체에서 사용하는 타입 정의
 */

// API 응답 래퍼
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

// 조회 요청
export interface InquiryRequest {
  business_numbers: string;
  perform_category_mapping: boolean;
}

// 단일 조회 결과
export interface InquiryResult {
  brno: string;
  brno_formatted: string;
  company_name: string;
  query_date: string;
  is_cached: boolean;
  api: {
    bizno: BiznoAPIResult | null;
    gov: GovAPIResult | null;
  };
  crawl: CrawlResult | null;
  ftc: FTCResult | null;
  mapping?: CategoryMapping;
}

// Bizno API 결과
export interface BiznoAPIResult {
  success: boolean;
  found: boolean;
  message?: string;
  items?: BiznoItem[];
  raw?: unknown;
}

export interface BiznoItem {
  상호명: string;
  사업자등록번호: string;
  법인등록번호: string;
  사업자상태: string;
  사업자상태코드: string;
  과세유형: string;
  폐업일: string;
}

// 공공데이터 API 결과
export interface GovAPIResult {
  success: boolean;
  found: boolean;
  message?: string;
  items?: Record<string, string>[];
  raw?: unknown;
}

// 크롤링 결과
export interface CrawlResult {
  success: boolean;
  found?: boolean;
  search?: Record<string, string>;
  detail?: Record<string, unknown>;
}

// FTC 결과
export interface FTCResult {
  success: boolean;
  found: boolean;
  message?: string;
  year?: number;
  가맹본부?: Record<string, string>;
  브랜드?: FTCBrand[];
}

export interface FTCBrand {
  브랜드관리번호: string;
  브랜드명: string;
  산업대분류: string;
  산업중분류: string;
  주요상품: string;
  가맹개시일자: string;
}

// 업종 매핑
export interface CategoryMapping {
  mct_ry_cd?: CategoryCode;
  hpsn_mct_zcd?: CategoryCode;
  reasoning?: string;
}

export interface CategoryCode {
  code: string;
  name: string;
}

// 업종 카테고리
export interface Categories {
  mct_ry_cd: Record<string, string>;
  hpsn_mct_zcd: Record<string, string>;
}

// CSV 다운로드 요청
export interface CSVDownloadRequest {
  data: InquiryResult[];
  bizno_fields?: string[];
  tele_fields?: string[];
  crawl_fields?: string[];
  mapping_fields?: string[];
}

// 상태 필터 옵션
export const STATUS_FILTERS = [
  { id: 'bizno_api', label: 'Bizno API' },
  { id: 'bizno_crawl', label: 'Bizno 크롤링' },
  { id: 'telecom', label: '통신판매업' },
  { id: 'franchise', label: '가맹사업' },
];
