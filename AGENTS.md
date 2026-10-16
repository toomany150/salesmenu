# 프로젝트 개발 및 운영 영구 원칙 (Permanent Rules)

## 1. 기존 데이터 절대 보존 원칙 (Data Safety - Zero Data Loss)
- 모든 작업 시 DB(SQLite, PostgreSQL 등), 로컬 스토리지(localStorage), mock 데이터, 기존 저장된 고객 및 매물 데이터를 절대 초기화하거나 삭제하지 않는다.
- 데이터베이스 스키마 변경 시 기존 테이블/데이터를 drop하거나 reset하지 않고, `ALTER TABLE ADD COLUMN IF NOT EXISTS` 또는 안전한 마이그레이션 방식을 준수한다.

## 2. 작업 범위 집중 원칙 (Strict Scope Adherence)
- 사용자가 명시적으로 요청한 작업 및 요구사항에만 집중하여 수정한다.
- 요청받지 않은 기존 기능, 레이아웃, 설정, 코드를 임의로 삭제하거나 변경하지 않는다.

## 3. 정렬 및 최신성 기본 규칙
- 고객 및 매물 목록은 항상 사용자가 최근에 등록한 순서(`createdAt` 최신 내림차순)로 맨 처음(최상단)에 배치한다.
- 중요 고객(`isPinned`)으로 지정된 항목은 항상 목록 최우선 순위로 고정된다.
