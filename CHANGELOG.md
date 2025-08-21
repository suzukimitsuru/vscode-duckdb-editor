# Change Log

All notable changes to the "DuckDB Editor for VSCode" extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

## [0.0.2] - 2025-08-21

### Added

- ✨ Pagination functionality with configurable page sizes (10, 25, 50, 100 records)
- 🔄 Refresh button for table list updates
- ▶️ Execute and clear buttons with VSCode codicons
- 📊 Scrollable results table with sticky headers
- 🎨 Improved UI layout with icon-only buttons
- 📱 Responsive design with flex layout

### Changed

- 🎯 Moved refresh button to left of tables list
- 🔧 Repositioned execute/clear buttons to left of query input (vertical layout)
- 🗂️ Removed section titles for cleaner interface
- 🖼️ Updated to use local codicon resources instead of CDN
- 📋 Enhanced table display with fixed headers during scroll

### Fixed

- 🐛 Resolved vsce package errors by fixing .vscodeignore configuration
- 🔧 Fixed TypeScript compilation warnings for unused variables
- 🎨 Corrected CustomTextEditorProvider to CustomReadonlyEditorProvider for binary files

### Technical

- 🏗️ Implemented proper webview URI handling for local resources
- 📦 Added codicon.css and codicon.ttf to local media assets
- ⚡ Optimized pagination with client-side data handling
- 🔒 Enhanced extension security with proper resource loading

## [0.0.1] - 2025-08-21

### Added

- 🎉 Initial release of DuckDB Editor for VSCode
- 📂 Custom editor for .db and .duckdb files
- 📋 Table listing functionality
- 💻 SQL query execution with results display
- 🎨 VSCode theme integration (light/dark mode support)
- 🗃️ DuckDB database connection and query handling
- 🏗️ Basic extension infrastructure with TypeScript

### Features

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