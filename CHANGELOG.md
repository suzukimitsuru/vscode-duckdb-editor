# Change Log

All notable changes to the "DuckDB Editor for VSCode" extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

## [0.0.6] - 2026-10-16

### [0.0.6] Changed

- 🦆 DuckDB を 1.5 に上げ、クライアントを `@duckdb/node-api`（1.5.6-r.1）に替えた: `duckdb` パッケージは 1.4.4 で更新が止まり、DuckDB 1.4 LTS は 2026-11-17 にサポートが終わるため
- 📦 VSIX をプラットフォーム別にした: `win32-x64` / `win32-arm64` / `linux-x64` / `linux-arm64` / `alpine-x64` / `alpine-arm64` / `darwin-x64` / `darwin-arm64` の 8 種類。各 VSIX は対象プラットフォームの DuckDB のバイナリだけを含む（24〜36MB）
  - Windows arm64・macOS Intel・Linux arm64・Alpine Linux（musl）でも使えるようになった
- 🔢 クエリ結果の BIGINT・HUGEINT・DECIMAL・日時は DuckDB の表記の文字列で表示する
- 📝 複数の文を `;` で区切って実行すると、前から順に実行して最後の文の結果を表示する
- 🔁 クエリは呼んだ順に1つずつ実行する。同じファイルを複数のエディタで開いても衝突しないよう、インスタンスキャッシュから開く

### [0.0.6] Added

- 🛠️ `scripts/package-vsix.mjs`（`npm run package`）: ターゲットごとに DuckDB のバイナリを npm から取得して入れ替え、`vsce package --target` で VSIX を作る

### [0.0.6] Removed

- 🗑️ 自前ビルドの DuckDB バインディング `bindings/`（約 140MB）。DuckDB が npm で配布する署名済みのバイナリを使う

## [0.0.5] - 2026-10-16

### [0.0.5] Changed

- 🎨 最初/最後のページボタンのアイコンを `triangle-left` / `triangle-right` に変更

## [0.0.4] - 2025-09-02

### [0.0.4] Added

- 🎯 Advanced pagination with direct page navigation using input field
- 🏠 First/Last page buttons for quick navigation to beginning/end
- ⌨️ Enter key support in page input field for instant page jumps
- 🎨 Professional extension icon with DuckDB theme (duck + database)
- ✨ Enhanced pagination controls with 5 navigation options
- 🔢 Page number validation with automatic correction for invalid inputs

### [0.0.4] Changed

- 🎯 Improved pagination UI with centered page input field
- 🔧 Enhanced pagination button management with visual state indicators
- 🎨 Updated pagination controls layout for better user experience
- 📊 Optimized pagination button spacing and alignment

### [0.0.4] Fixed

- 🐛 Resolved BigInt serialization errors in DuckDB query results
- 🔧 Fixed TypeScript compilation warnings for unused parameters
- 🎯 Corrected debugger breakpoint issues by fixing launch.json outFiles path
- 🖼️ Fixed PNG icon transparency and sizing issues

### [0.0.4] Technical

- 🏗️ Implemented JSON serialization with BigInt-to-string conversion
- 🔒 Enhanced debugging configuration with proper source mapping
- ⚡ Added comprehensive page navigation state management
- 🎨 Created SVG-based icon with professional design and PNG conversion
- 📦 Updated package.json with extension icon configuration

## [0.0.3] - 2025-08-25

### [0.0.3] Added

- ✨ Interactive column resizing with mouse drag functionality
- 📊 Column width preservation across page navigation
- 🎯 Text overflow handling with ellipsis (...) for narrow columns
- 📈 Comma-separated number formatting for record counts and page numbers
- ⏳ VSCode native progress indicators using withProgress API
- 🎨 Improved pagination layout with centered record info and right-aligned page info

### [0.0.3] Changed

- 🔧 Enhanced table layout to support dynamic width adjustments
- 📏 Improved column width management with individual column control
- 🎨 Reduced table row spacing for denser data display
- 📱 Updated pagination controls with better visual separation
- ⚡ Replaced HTML progress bars with native VSCode notifications

### [0.0.3] Fixed

- 🐛 Fixed column resizing to only affect target column without changing adjacent columns
- 🔧 Resolved table width issues when columns are resized beyond content width
- 🎯 Corrected pagination display to show exact specified number of records
- 📊 Enhanced table scrolling behavior by removing height restrictions

### [0.0.3] Technical

- 🏗️ Implemented fixed table layout with dynamic width calculation
- 💾 Added column width state management with automatic persistence
- ⚡ Optimized table rendering with improved CSS properties
- 🔒 Enhanced progress reporting with VSCode extension API integration

## [0.0.2] - 2025-08-21

### [0.0.2] Added

- ✨ Pagination functionality with configurable page sizes (10, 25, 50, 100 records)
- 🔄 Refresh button for table list updates
- ▶️ Execute and clear buttons with VSCode codicons
- 📊 Scrollable results table with sticky headers
- 🎨 Improved UI layout with icon-only buttons
- 📱 Responsive design with flex layout

### [0.0.2] Changed

- 🎯 Moved refresh button to left of tables list
- 🔧 Repositioned execute/clear buttons to left of query input (vertical layout)
- 🗂️ Removed section titles for cleaner interface
- 🖼️ Updated to use local codicon resources instead of CDN
- 📋 Enhanced table display with fixed headers during scroll

### [0.0.2] Fixed

- 🐛 Resolved vsce package errors by fixing .vscodeignore configuration
- 🔧 Fixed TypeScript compilation warnings for unused variables
- 🎨 Corrected CustomTextEditorProvider to CustomReadonlyEditorProvider for binary files

### [0.0.2] Technical

- 🏗️ Implemented proper webview URI handling for local resources
- 📦 Added codicon.css and codicon.ttf to local media assets
- ⚡ Optimized pagination with client-side data handling
- 🔒 Enhanced extension security with proper resource loading

## [0.0.1] - 2025-08-21

### [0.0.1] Added

- 🎉 Initial release of DuckDB Editor for VSCode
- 📂 Custom editor for .db and .duckdb files
- 📋 Table listing functionality
- 💻 SQL query execution with results display
- 🎨 VSCode theme integration (light/dark mode support)
- 🗃️ DuckDB database connection and query handling
- 🏗️ Basic extension infrastructure with TypeScript

### [0.0.1] Features

- 🔍 Browse database tables
- ⚡ Execute SQL queries in real-time
- 📊 Display query results in formatted tables
- 🎯 Click-to-select table functionality
- 🔧 Error handling and user feedback
- 🎨 VSCode-consistent UI design

---

**Note**: This extension is in active development. Please report any issues on the [GitHub repository](https://github.com/suzukimitsuru/vscode-duckdb-editor/issues).

## Legend

- ✨ New features
- 🔧 Changes
- 🐛 Bug fixes
- 🎨 UI/UX improvements
- ⚡ Performance improvements
- 📦 Dependencies
- 🔒 Security
- 📝 Documentation
- 🏗️ Infrastructure
