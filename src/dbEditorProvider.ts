import * as vscode from 'vscode';
import { Db } from './duckDb';

export class DbEditorProvider implements vscode.CustomReadonlyEditorProvider {
    public static readonly viewType = 'duckdbEditor.editor';

    constructor(private readonly context: vscode.ExtensionContext) {}

    public async openCustomDocument(
        uri: vscode.Uri,
        openContext: vscode.CustomDocumentOpenContext,
        _token: vscode.CancellationToken
    ): Promise<vscode.CustomDocument> {
        return {
            uri,
            dispose: () => {}
        };
    }

    public async resolveCustomEditor(
        document: vscode.CustomDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
        };

        webviewPanel.webview.html = this.getWebviewContent(webviewPanel.webview);

        const db = new Db(document.uri.fsPath);

        const updateWebview = () => {
            webviewPanel.webview.postMessage({
                type: 'update',
                dbPath: document.uri.fsPath
            });
        };

        webviewPanel.webview.onDidReceiveMessage(
            async message => {
                switch (message.type) {
                    case 'query':
                        await vscode.window.withProgress({
                            location: vscode.ProgressLocation.Notification,
                            title: "SQLクエリを実行中...",
                            cancellable: false
                        }, async (progress) => {
                            try {
                                progress.report({ message: "クエリを処理しています..." });
                                const results = await db.executeQuery(message.sql);
                                webviewPanel.webview.postMessage({
                                    type: 'queryResult',
                                    results: results
                                });
                            } catch (error) {
                                webviewPanel.webview.postMessage({
                                    type: 'queryError',
                                    error: error instanceof Error ? error.message : String(error)
                                });
                            }
                        });
                        break;
                    case 'listTables':
                        await vscode.window.withProgress({
                            location: vscode.ProgressLocation.Notification,
                            title: "テーブル一覧を取得中...",
                            cancellable: false
                        }, async (progress) => {
                            try {
                                progress.report({ message: "データベースを読み込んでいます..." });
                                const tables = await db.listTables();
                                webviewPanel.webview.postMessage({
                                    type: 'tablesResult',
                                    tables: tables
                                });
                            } catch (error) {
                                webviewPanel.webview.postMessage({
                                    type: 'tablesError',
                                    error: error instanceof Error ? error.message : String(error)
                                });
                            }
                        });
                        break;
                }
            },
            null,
            this.context.subscriptions
        );

        // バイナリファイルなので変更監視は不要

        webviewPanel.onDidDispose(() => {
            db.dispose();
        });

        updateWebview();
    }

    private getWebviewContent(webview: vscode.Webview): string {
        const mediaPath = vscode.Uri.joinPath(this.context.extensionUri, 'media');
        const codiconCssUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'codicon.css'));
        const codiconFontUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'codicon.ttf'));
        
        return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DuckDB Editor</title>
    <link href="${codiconCssUri}" rel="stylesheet">
    <style>
        @font-face {
            font-family: "codicon";
            font-display: block;
            src: url("${codiconFontUri}") format("truetype");
        }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            font-weight: var(--vscode-font-weight);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
        }
        
        .container {
            height: 100vh;
            max-width: none;
            margin: 0;
        }
        
        .main-content {
            padding: 20px;
            overflow: auto;
            height: 100vh;
        }
        
        .query-section {
            margin-bottom: 0px;
        }
        
        .query-input {
            width: 100%;
            height: 100px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 10px;
            font-family: var(--vscode-editor-font-family);
            font-size: 14px;
            resize: vertical;
        }
        
        .tables-container {
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }
        
        .query-container {
            display: flex;
            gap: 10px;
        }
        
        .query-buttons {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .pagination-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 3px;
        }
        
        .pagination-buttons {
            display: flex;
            gap: 5px;
        }
        
        .pagination-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex: 1;
        }
        
        #recordInfo {
            text-align: center;
            flex: 1;
        }
        #pageInfo {
            text-align: right;
        }
        
        .results-container {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 3px;
        }
        
        .icon-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px;
            cursor: pointer;
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
        }
        
        .icon-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .icon-button .codicon {
            font-size: 14px;
        }
        
        .results-section {
            margin-top: 0px;
        }
        
        .table {
            border-collapse: collapse;
            width: max-content;
            min-width: 100%;
            background-color: var(--vscode-editor-background);
            table-layout: fixed;
        }
        
        .table th,
        .table td {
            border: 1px solid var(--vscode-panel-border);
            padding: 2px;
            text-align: left;
            white-space: nowrap;
            line-height: 1;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .table th {
            background-color: var(--vscode-list-hoverBackground);
            font-weight: bold;
            position: sticky;
            top: 0;
            z-index: 1;
            cursor: col-resize;
            position: relative;
            min-width: 20px;
        }
        
        .table th:hover::after {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 2px;
            height: 100%;
            background-color: var(--vscode-focusBorder);
            cursor: col-resize;
        }
        
        .resize-handle {
            position: absolute;
            top: 0;
            right: 0;
            width: 5px;
            height: 100%;
            cursor: col-resize;
            z-index: 2;
        }
        
        select {
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 4px 8px;
            border-radius: 3px;
        }
        
        .error {
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            padding: 10px;
            border-radius: 3px;
            margin: 10px 0;
        }
        
        .tables-list {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            padding: 5px;
            border-radius: 3px;
        }
        
        .table-item {
            padding: 5px;
            cursor: pointer;
            border-radius: 3px;
        }
        
        .table-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
    </style>
</head>
<body>
    <div class="container">
        <div class="main-content">
            <div class="tables-section">
                <div class="tables-container">
                    <button class="icon-button" onclick="loadTables()" title="更新">
                        <i class="codicon codicon-refresh"></i>
                    </button>
                    <div id="tablesList" class="tables-list"></div>
                </div>
            </div>
            
            <div class="query-section">
                <div class="query-container">
                    <div class="query-buttons">
                        <button class="icon-button" onclick="executeQuery()" title="実行">
                            <i class="codicon codicon-play"></i>
                        </button>
                        <button class="icon-button" onclick="clearQuery()" title="クリア">
                            <i class="codicon codicon-clear-all"></i>
                        </button>
                    </div>
                    <textarea id="queryInput" class="query-input" placeholder="SELECT * FROM table_name;"></textarea>
                </div>
            </div>
            
            <div class="results-section">
                <div class="pagination-controls">
                    <select id="pageSize" onchange="changePageSize()">
                        <option value="10">10件</option>
                        <option value="25" selected>25件</option>
                        <option value="50">50件</option>
                        <option value="100">100件</option>
                    </select>
                    <div class="pagination-info">
                        <span id="recordInfo"></span>
                        <span id="pageInfo"></span>
                    </div>
                    <div class="pagination-buttons">
                        <button class="icon-button" onclick="previousPage()" id="prevBtn" title="前のページ">
                            <i class="codicon codicon-chevron-left"></i>
                        </button>
                        <button class="icon-button" onclick="nextPage()" id="nextBtn" title="次のページ">
                            <i class="codicon codicon-chevron-right"></i>
                        </button>
                    </div>
                </div>
                <div id="results" class="results-container"></div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        let currentResults = [];
        let currentPage = 1;
        let pageSize = 25;
        let columnWidths = {};
        
        function executeQuery() {
            document.getElementById('results').innerHTML = '';
            document.getElementById('recordInfo').innerHTML = '';
            document.getElementById('pageInfo').innerHTML = '';

            const queryInput = document.getElementById('queryInput');
            const sql = queryInput.value.trim();
            if (sql) {
                currentPage = 1;
                columnWidths = {}; // 新しいクエリ時にカラム幅をリセット
                vscode.postMessage({
                    type: 'query',
                    sql: sql
                });
            } else {
                showError('SQLクエリを入力してください。');
            }
        }
        
        function clearQuery() {
            document.getElementById('queryInput').value = '';
            document.getElementById('results').innerHTML = '';
            document.getElementById('recordInfo').innerHTML = '';
            document.getElementById('pageInfo').innerHTML = '';
            currentResults = [];
            currentPage = 1;
        }
        
        function changePageSize() {
            const select = document.getElementById('pageSize');
            pageSize = parseInt(select.value);
            currentPage = 1;
            displayResults(currentResults);
        }
        
        function previousPage() {
            if (currentPage > 1) {
                currentPage--;
                displayResults(currentResults);
            }
        }
        
        function nextPage() {
            const totalPages = Math.ceil(currentResults.length / pageSize);
            if (currentPage < totalPages) {
                currentPage++;
                displayResults(currentResults);
            }
        }
        
        function loadTables() {
            vscode.postMessage({
                type: 'listTables'
            });
        }
        
        function selectFromTable(tableName) {
            document.getElementById('queryInput').value = 'SELECT * FROM ' + tableName + ';';
        }
        
        function showError(message) {
            document.getElementById('results').innerHTML = 
                '<div class="error">エラー: ' + message + '</div>';
        }
        
        function displayResults(results) {
            currentResults = results || [];
            const resultsDiv = document.getElementById('results');
            const recordInfo = document.getElementById('recordInfo');
            const pageInfo = document.getElementById('pageInfo');
            
            if (results && results.length > 0) {
                const totalRecords = results.length;
                const totalPages = Math.ceil(totalRecords / pageSize);
                const startIndex = (currentPage - 1) * pageSize;
                const endIndex = Math.min(startIndex + pageSize, totalRecords);
                const pageResults = results.slice(startIndex, endIndex);
                
                const keys = Object.keys(results[0]);
                const defaultWidth = 150; // デフォルトカラム幅
                let html = '<table class="table"><thead><tr>';
                
                keys.forEach((key, index) => {
                    const width = columnWidths[key] || defaultWidth;
                    html += '<th data-column="' + index + '" data-key="' + key + '" style="width: ' + width + 'px;">' + key + '<div class="resize-handle"></div></th>';
                });
                
                html += '</tr></thead><tbody>';
                
                pageResults.forEach(row => {
                    html += '<tr>';
                    keys.forEach(key => {
                        const value = row[key];
                        const width = columnWidths[key] || defaultWidth;
                        html += '<td style="width: ' + width + 'px;">' + (value !== null && value !== undefined ? value : 'NULL') + '</td>';
                    });
                    html += '</tr>';
                });
                
                html += '</tbody></table>';
                resultsDiv.innerHTML = html;
                
                // カラムリサイズ機能を追加
                addColumnResizeHandlers();
                
                // 初期テーブル幅を設定
                const table = resultsDiv.querySelector('.table');
                if (table) {
                    let totalWidth = 0;
                    keys.forEach(key => {
                        totalWidth += columnWidths[key] || defaultWidth;
                    });
                    table.style.width = totalWidth + 'px';
                }
                
                // 件数情報を更新
                recordInfo.innerHTML = (startIndex + 1).toLocaleString() + '-' + endIndex.toLocaleString() + '件/' + totalRecords.toLocaleString() + '件';
                
                // ページ数情報を更新
                pageInfo.innerHTML = currentPage.toLocaleString() + '/' + totalPages.toLocaleString() + 'ページ';
                updatePaginationButtons();
            } else {
                resultsDiv.innerHTML = '<p>結果がありません。</p>';
                recordInfo.innerHTML = '';
                pageInfo.innerHTML = '';
                updatePaginationButtons();
            }
        }
        
        function addColumnResizeHandlers() {
            const resizeHandles = document.querySelectorAll('.resize-handle');
            let isResizing = false;
            let currentHandle = null;
            let currentTh = null;
            let startX = 0;
            let startWidth = 0;
            
            resizeHandles.forEach(handle => {
                handle.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    isResizing = true;
                    currentHandle = handle;
                    currentTh = handle.parentElement;
                    startX = e.clientX;
                    startWidth = parseInt(window.getComputedStyle(currentTh).width);
                    document.body.style.cursor = 'col-resize';
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                });
            });
            
            function handleMouseMove(e) {
                if (!isResizing) return;
                const deltaX = e.clientX - startX;
                const newWidth = Math.max(20, startWidth + deltaX);
                
                currentTh.style.width = newWidth + 'px';
                
                // カラム幅を記録
                const columnKey = currentTh.dataset.key;
                if (columnKey) {
                    columnWidths[columnKey] = newWidth;
                }
                
                // 対応するすべての行のセル幅も更新
                const columnIndex = currentTh.dataset.column;
                const table = currentTh.closest('table');
                const cellIndex = parseInt(columnIndex) + 1;
                const cells = table.querySelectorAll('td:nth-child(' + cellIndex + ')');
                cells.forEach(cell => {
                    cell.style.width = newWidth + 'px';
                });
                
                // テーブル全体の幅を再計算
                updateTableWidth(table);
            }
            
            function handleMouseUp(e) {
                if (!isResizing) return;
                isResizing = false;
                currentHandle = null;
                currentTh = null;
                document.body.style.cursor = '';
                
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            }
            
            function updateTableWidth(table) {
                let totalWidth = 0;
                const headers = table.querySelectorAll('th');
                headers.forEach(th => {
                    totalWidth += parseInt(th.style.width) || 150;
                });
                table.style.width = totalWidth + 'px';
            }
        }
        
        function updatePaginationButtons() {
            const totalPages = Math.ceil(currentResults.length / pageSize);
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            
            prevBtn.disabled = currentPage <= 1;
            nextBtn.disabled = currentPage >= totalPages;
            
            if (prevBtn.disabled) {
                prevBtn.style.opacity = '0.5';
                prevBtn.style.cursor = 'not-allowed';
            } else {
                prevBtn.style.opacity = '1';
                prevBtn.style.cursor = 'pointer';
            }
            
            if (nextBtn.disabled) {
                nextBtn.style.opacity = '0.5';
                nextBtn.style.cursor = 'not-allowed';
            } else {
                nextBtn.style.opacity = '1';
                nextBtn.style.cursor = 'pointer';
            }
        }
        
        function displayTables(tables) {
            const tablesDiv = document.getElementById('tablesList');            
            if (tables && tables.length > 0) {
                let html = '';
                tables.forEach(table => {
                    html += '<div class="table-item" onclick="selectFromTable(\\\'' + table + '\\\')">' + table + '</div>';
                });
                tablesDiv.innerHTML = html;
            } else {
                tablesDiv.innerHTML = '<p>テーブルが見つかりません。</p>';
            }
        }
        
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'queryResult':
                    displayResults(message.results);
                    break;
                case 'queryError':
                    showError(message.error);
                    break;
                case 'tablesResult':
                    displayTables(message.tables);
                    break;
                case 'tablesError':
                    showError('テーブル取得エラー: ' + message.error);
                    break;
                case 'update':
                    loadTables();
                    break;
            }
        });
        
        // 初期読み込み
        loadTables();
    </script>
</body>
</html>`;
    }
}